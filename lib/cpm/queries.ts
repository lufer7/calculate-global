import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { cpmAdjustments, cpmBenchmarks, cpmSettings, CPM_FORMATLAR } from "@/db/schema";
import { getDb } from "@/lib/db";
import { computeBand, mergeBands, type BenchmarkPoint, type Currency, type MergedBand } from "./model";

export const FORMAT_ETIKET: Record<(typeof CPM_FORMATLAR)[number], string> = {
  banner: "BANNER",
  instream: "IN-STREAM",
  ctv: "CTV",
  native: "NATIVE",
};

export type TickerData =
  | { durum: "db_yok" }
  | { durum: "ok"; hucreler: MergedBand[]; sonGuncelleme: string | null };

type Row = typeof cpmBenchmarks.$inferSelect;

function toPoint(r: Row): BenchmarkPoint {
  return {
    format: r.format,
    donem: r.donem,
    paraBirimi: r.paraBirimi as Currency,
    min: Number(r.degerMin),
    max: Number(r.degerMax),
    kurDegeri: Number(r.kurDegeri),
    kurTarihi: r.kurTarihi,
    kurKaynagi: r.kurKaynagi,
    kaynakAdi: r.kaynakAdi,
  };
}

function prevMonth(donem: string): string {
  const [y, m] = donem.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Ticker ve CPM API'si için: P0 formatlarının tahmini TL bantları (Katman A). */
export async function getTickerData(): Promise<TickerData> {
  const db = getDb();
  if (!db) return { durum: "db_yok" };
  try {
    const [rows, adjs, settings] = await Promise.all([
      db
        .select()
        .from(cpmBenchmarks)
        .where(
          and(
            eq(cpmBenchmarks.platform, "programmatic"),
            eq(cpmBenchmarks.katman, "A"),
            inArray(cpmBenchmarks.format, [...CPM_FORMATLAR]),
          ),
        )
        .orderBy(desc(cpmBenchmarks.donem), desc(cpmBenchmarks.createdAt)),
      db
        .select()
        .from(cpmAdjustments)
        .where(eq(cpmAdjustments.platform, "programmatic"))
        .orderBy(desc(cpmAdjustments.gecerlilikBaslangic), desc(cpmAdjustments.createdAt)),
      db.select().from(cpmSettings).limit(1),
    ]);
    const threshold = settings[0] ? Number(settings[0].tutarlilikEsigi) : 0.4;

    let sonGuncelleme: string | null = null;
    const hucreler = CPM_FORMATLAR.map((format) => {
      const fr = rows.filter((r) => r.format === format);
      const adj = adjs.find((a) => a.format === format);
      if (fr.length === 0 || !adj) return mergeBands(format, []);
      const latest = fr[0]!.donem;
      const prev = prevMonth(latest);
      const current = fr.filter((r) => r.donem === latest);
      const bands = current
        .map((r) => {
          const p = fr.find((x) => x.donem === prev && x.kaynakAdi === r.kaynakAdi);
          return computeBand(toPoint(r), p ? toPoint(p) : null, {
            katsayi: Number(adj.katsayi),
            metotNotu: adj.metotNotu,
          });
        })
        .filter((b) => b !== null);
      for (const r of current) {
        const t = r.createdAt.toISOString();
        if (!sonGuncelleme || t > sonGuncelleme) sonGuncelleme = t;
      }
      return mergeBands(format, bands, threshold);
    });
    return { durum: "ok", hucreler, sonGuncelleme };
  } catch (e) {
    console.error("[ticker] DB okunamadı:", (e as Error).message);
    return { durum: "db_yok" };
  }
}
