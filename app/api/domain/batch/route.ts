import { NextResponse } from "next/server";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { domainAdstxt, domains, domainSnapshots } from "@/db/schema";
import { getDb } from "@/lib/db";
import { cruxLabel, normalizeHost } from "@/lib/envanter/domain";
import { ENVANTER_KATEGORILERI, isEnvanterKategori } from "@/lib/envanter/kategoriler";
import { summarizeAdsTxt } from "@/lib/adstxt/parse";
import { LISANS as CRUX } from "@/lib/providers/crux";
import { providerEnabled } from "@/lib/providers/types";

/**
 * §4.2b: "Kendi verini getir" ekranı için. İstek YALNIZCA domain listesi taşır —
 * kullanıcının lisanslı metrikleri tarayıcıdan çıkmaz. Yanıt sadece bizim public verimiz.
 * Ağ isteği yapmaz (crawl tetiklemez), yalnızca DB okur. İstek gövdesi loglanmaz.
 */
const body = z.object({ domains: z.array(z.string().max(300)).min(1).max(500) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: "1–500 domain gönder" }, { status: 400 });
  const names = [...new Set(parsed.data.domains.map((d) => normalizeHost(d)?.domain).filter((d): d is string => !!d))];
  const db = getDb();
  if (!db || names.length === 0) return NextResponse.json({ sonuc: {} });
  const [ds, snaps, ads] = await Promise.all([
    db.select().from(domains).where(inArray(domains.domain, names)),
    providerEnabled(CRUX) ? db.select().from(domainSnapshots).where(inArray(domainSnapshots.domain, names)) : Promise.resolve([]),
    db.select().from(domainAdstxt).where(inArray(domainAdstxt.domain, names)),
  ]);
  const sonuc: Record<string, unknown> = {};
  for (const d of names) {
    const k = ds.find((x) => x.domain === d)?.kategori;
    const c = snaps.filter((s) => s.domain === d && s.kaynak === "crux").sort((a, b) => (b.yyyymm ?? "").localeCompare(a.yyyymm ?? ""))[0];
    const o = summarizeAdsTxt(ads.filter((a) => a.domain === d).map((r) => ({ ssp: r.ssp, sellerId: r.sellerId, iliski: r.iliski as "DIRECT" | "RESELLER", certId: null, satir: 0 })));
    sonuc[d] = {
      kategori: isEnvanterKategori(k) ? ENVANTER_KATEGORILERI[k].ad : null,
      iab: isEnvanterKategori(k) ? ENVANTER_KATEGORILERI[k].iab : null,
      buyukluk: providerEnabled(CRUX) ? cruxLabel(c?.rankBucket ?? null).etiket : null,
      ssp: o.sspSayisi,
      direct: o.direct,
      reseller: o.reseller,
    };
  }
  return NextResponse.json({ sonuc });
}
