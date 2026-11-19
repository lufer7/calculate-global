import { NextResponse } from "next/server";
import { cruxLabel, sortByBuckets } from "@/lib/envanter/domain";
import { toCsv } from "@/lib/envanter/csv";
import { ENVANTER_KATEGORILERI, isEnvanterKategori } from "@/lib/envanter/kategoriler";
import { getCategoryRows } from "@/lib/envanter/report";
import { LISANS as CRUX } from "@/lib/providers/crux";
import { LISANS as CF } from "@/lib/providers/cloudflare-radar";
import { providerEnabled } from "@/lib/providers/types";

/**
 * §4.2c: bulk export'ta sağlayıcının ham sayısı YOK. Kolonlar: bizim crawl verimiz,
 * kategorizasyonumuz, türetilmiş sayımlar ve lisansı izin veren kaynakların kova ETİKETİ.
 */
export async function GET(_: Request, { params }: { params: Promise<{ kategori: string }> }) {
  const k = (await params).kategori;
  if (!isEnvanterKategori(k)) return NextResponse.json({ hata: "kategori yok" }, { status: 404 });
  const rows = await getCategoryRows(k);
  if (!rows) return NextResponse.json({ hata: "veritabanı bağlı değil" }, { status: 503 });
  const kat = ENVANTER_KATEGORILERI[k];
  // Yalnızca açık (lisansı teyitli) ve bulk export'a izin veren kaynakların kova kolonları eklenir
  const cruxCol = providerEnabled(CRUX) && CRUX.bulkCsvExportaDahil;
  const cfCol = providerEnabled(CF) && CF.bulkCsvExportaDahil;
  const header = ["domain", "kategori", "iab_kategori"];
  if (cruxCol) header.push("buyukluk_kovasi", "planlama_kademesi");
  if (cfCol) header.push("cloudflare_kovasi");
  header.push("ssp_sayisi", "direct", "reseller", "ssp_listesi");
  const body = sortByBuckets(rows).map((r) => {
    const out: (string | number | null)[] = [r.domain, kat.ad, kat.iab];
    if (cruxCol) {
      const l = cruxLabel(r.cruxRank);
      out.push(l.etiket, l.kademe);
    }
    if (cfCol) out.push(r.cfRank);
    out.push(r.sspSayisi, r.direct, r.reseller, r.ssp.join(", "));
    return out;
  });
  return new NextResponse(toCsv(header, body), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prgturk-${k}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
