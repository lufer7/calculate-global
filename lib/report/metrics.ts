/**
 * Rapor hesaplama katmanı (§M7.3) — deterministik, LLM'siz. Tüm oranlar lib/calc ile.
 * Bu modül tarayıcıda çalışır: ham satırlar sunucuya hiç gitmez; sunucuya yalnızca
 * buradan çıkan toplu özet gider.
 */
import * as calc from "@/lib/calc/metrics";
import { pacing, type PacingResult } from "@/lib/calc/pacing";
import { METRIK_ALANLARI, type Mapping, type MetrikAlan } from "./columns";
import { ADFORM_BOLEN, needsAdformFix, parseReportDate, parseReportNumber } from "./parse";

export type StdRow = { tarih: string | null; boyut: string | null } & Record<MetrikAlan, number | null>;

const TOPLAM_RE = /^(total|toplam|grand total|genel toplam|summary|özet)\b/i;

export function normalizeRows(rows: string[][], map: Mapping): { rows: StdRow[]; duzeltilen: MetrikAlan[]; atlanan: number } {
  const out: StdRow[] = [];
  let atlanan = 0;
  for (const r of rows) {
    const tarihRaw = map.tarih !== undefined ? r[map.tarih] ?? "" : "";
    const boyut = map.boyut !== undefined ? (r[map.boyut] ?? "").trim() || null : null;
    if (TOPLAM_RE.test(tarihRaw.trim()) || (boyut && TOPLAM_RE.test(boyut))) {
      atlanan++;
      continue;
    }
    const row = { tarih: map.tarih !== undefined ? parseReportDate(tarihRaw) : null, boyut } as StdRow;
    let any = false;
    for (const a of METRIK_ALANLARI) {
      const v = map[a] !== undefined ? parseReportNumber(r[map[a]!]) : null;
      row[a] = v;
      if (v !== null) any = true;
    }
    if (!any) {
      atlanan++;
      continue;
    }
    out.push(row);
  }
  const duzeltilen: MetrikAlan[] = [];
  for (const a of ["harcama", "donusumDegeri"] as const) {
    if (needsAdformFix(out.map((x) => x[a]))) {
      for (const x of out) if (x[a] !== null) x[a] = x[a]! / ADFORM_BOLEN;
      duzeltilen.push(a);
    }
  }
  return { rows: out, duzeltilen, atlanan };
}

export type Totals = Record<MetrikAlan, number | null>;

export function totals(rows: StdRow[]): Totals {
  const t = {} as Totals;
  for (const a of METRIK_ALANLARI) {
    if (a === "frekans" || a === "reach") continue;
    const vals = rows.map((r) => r[a]).filter((x): x is number => x !== null);
    t[a] = vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  }
  // reach satırlar arasında toplanamaz (tekil); en büyük satır değeri alt sınırdır
  const reaches = rows.map((r) => r.reach).filter((x): x is number => x !== null);
  t.reach = reaches.length ? Math.max(...reaches) : null;
  // frekans: impression ağırlıklı ortalama
  const fr = rows.filter((r) => r.frekans !== null && r.impression !== null && r.impression > 0);
  const w = fr.reduce((s, r) => s + r.impression!, 0);
  t.frekans = w > 0 ? fr.reduce((s, r) => s + r.frekans! * r.impression!, 0) / w : null;
  return t;
}

export type Kpi = {
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  viewability: number | null;
  viewabilityPayda: "olculen" | "impression" | null;
  vcpm: number | null;
  vcr: number | null;
  cpcv: number | null;
  cpa: number | null;
  cvr: number | null;
  roas: number | null;
};

export function kpis(t: Totals): Kpi {
  const imp = t.impression;
  const cost = t.harcama;
  const has = (...xs: (number | null)[]) => xs.every((x) => x !== null);
  let viewability: number | null = null;
  let viewabilityPayda: Kpi["viewabilityPayda"] = null;
  if (has(t.gorulebilir, t.olculen)) {
    viewability = calc.viewability(t.gorulebilir!, t.olculen!);
    viewabilityPayda = "olculen";
  } else if (has(t.gorulebilir, imp)) {
    viewability = calc.viewability(t.gorulebilir!, imp!);
    viewabilityPayda = "impression";
  }
  const roas = has(t.donusumDegeri, cost) && cost! > 0 ? t.donusumDegeri! / cost! : null;
  return {
    cpm: has(cost, imp) ? calc.cpm(cost!, imp!) : null,
    ctr: has(t.klik, imp) ? calc.ctr(t.klik!, imp!) : null,
    cpc: has(cost, t.klik) ? calc.cpc(cost!, t.klik!) : null,
    viewability,
    viewabilityPayda,
    vcpm: has(cost, t.gorulebilir) ? calc.vcpm(cost!, t.gorulebilir!) : null,
    vcr: has(t.videoTamamlama, t.videoBaslama ?? imp) ? calc.vcr(t.videoTamamlama!, (t.videoBaslama ?? imp)!) : null,
    cpcv: has(cost, t.videoTamamlama) ? calc.cpcv(cost!, t.videoTamamlama!) : null,
    cpa: has(cost, t.donusum) ? calc.cpa(cost!, t.donusum!) : null,
    cvr: has(t.donusum, t.klik) ? calc.ratio(t.donusum!, t.klik!, 100) : null,
    roas,
  };
}

export type TrendNokta = { donem: string; impression: number; klik: number; harcama: number; cpm: number | null; ctr: number | null };

/** ISO haftasının pazartesisi */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function trend(rows: StdRow[], by: "gun" | "hafta"): TrendNokta[] {
  const m = new Map<string, { impression: number; klik: number; harcama: number }>();
  for (const r of rows) {
    if (!r.tarih) continue;
    const k = by === "gun" ? r.tarih : weekStart(r.tarih);
    const e = m.get(k) ?? { impression: 0, klik: 0, harcama: 0 };
    e.impression += r.impression ?? 0;
    e.klik += r.klik ?? 0;
    e.harcama += r.harcama ?? 0;
    m.set(k, e);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([donem, e]) => ({ donem, ...e, cpm: calc.cpm(e.harcama, e.impression), ctr: calc.ctr(e.klik, e.impression) }));
}

export type KirilimSatir = { ad: string; impression: number; harcama: number; klik: number | null; donusum: number | null; pay: number; ctr: number | null; cpa: number | null; cpm: number | null };

/**
 * En iyi / en kötü satırlar. Gürültüyü önlemek için impression payı %1'in altındaki satırlar elenir.
 * Dönüşüm varsa CPA (düşük iyi), yoksa CTR (yüksek iyi) ile sıralanır.
 */
export function breakdown(rows: StdRow[], topN = 3): { olcut: "cpa" | "ctr"; enIyi: KirilimSatir[]; enKotu: KirilimSatir[]; satirSayisi: number } | null {
  const m = new Map<string, { impression: number; harcama: number; klik: number | null; donusum: number | null }>();
  for (const r of rows) {
    if (!r.boyut) continue;
    const e = m.get(r.boyut) ?? { impression: 0, harcama: 0, klik: null, donusum: null };
    e.impression += r.impression ?? 0;
    e.harcama += r.harcama ?? 0;
    if (r.klik !== null) e.klik = (e.klik ?? 0) + r.klik;
    if (r.donusum !== null) e.donusum = (e.donusum ?? 0) + r.donusum;
    m.set(r.boyut, e);
  }
  if (m.size < 2) return null;
  const totalImp = [...m.values()].reduce((s, e) => s + e.impression, 0);
  const list: KirilimSatir[] = [...m.entries()].map(([ad, e]) => ({
    ad,
    ...e,
    pay: totalImp > 0 ? (e.impression / totalImp) * 100 : 0,
    ctr: e.klik === null ? null : calc.ctr(e.klik, e.impression),
    cpa: e.donusum ? calc.cpa(e.harcama, e.donusum) : null,
    cpm: calc.cpm(e.harcama, e.impression),
  }));
  const anlamli = list.filter((x) => x.pay >= 1);
  const convVar = anlamli.some((x) => x.cpa !== null);
  const olcut: "cpa" | "ctr" = convVar ? "cpa" : "ctr";
  const sirali = anlamli
    .filter((x) => (olcut === "cpa" ? x.cpa !== null : x.ctr !== null))
    .sort((a, b) => (olcut === "cpa" ? a.cpa! - b.cpa! : b.ctr! - a.ctr!) || a.ad.localeCompare(b.ad));
  const k = Math.min(topN, Math.floor(sirali.length / 2));
  return { olcut, enIyi: sirali.slice(0, k), enKotu: k ? sirali.slice(-k).reverse() : [], satirSayisi: m.size };
}

/** Frekans kovaları — impression ağırlıklı dağılım (%). [<2, 2–5, 5–10, 10+] */
export const FREKANS_KOVALARI = ["1–2", "2–5", "5–10", "10+"] as const;
export function frequencyBuckets(rows: StdRow[]): { kova: string; pay: number }[] | null {
  const fr = rows.filter((r) => r.frekans !== null && (r.impression ?? 0) > 0);
  if (!fr.length) return null;
  const sums = [0, 0, 0, 0];
  for (const r of fr) {
    const f = r.frekans!;
    sums[f < 2 ? 0 : f < 5 ? 1 : f < 10 ? 2 : 3]! += r.impression!;
  }
  const total = sums.reduce((x, y) => x + y, 0);
  return FREKANS_KOVALARI.map((kova, i) => ({ kova, pay: (sums[i]! / total) * 100 }));
}

export type PlanInput = { butce: number | null; baslangic: string | null; bitis: string | null };

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Pacing ve bütçe tükenme projeksiyonu — plan bütçesi ve flight tarihleri verildiyse. */
export function reportPacing(rows: StdRow[], t: Totals, plan: PlanInput): (PacingResult & { sonVeri: string }) | null {
  if (!plan.butce || !plan.baslangic || !plan.bitis || t.harcama === null) return null;
  const dates = rows.map((r) => r.tarih).filter((x): x is string => !!x).sort();
  const son = dates.at(-1);
  if (!son) return null;
  const toplamGun = daysBetween(plan.baslangic, plan.bitis) + 1;
  const gecenGun = Math.min(toplamGun, Math.max(0, daysBetween(plan.baslangic, son) + 1));
  const r = pacing({ toplamButce: plan.butce, toplamGun, gecenGun, harcanan: t.harcama });
  return r ? { ...r, sonVeri: son } : null;
}

export type ReportSummary = {
  satir: number;
  donem: { bas: string | null; son: string | null };
  totals: Totals;
  kpi: Kpi;
  gunluk: TrendNokta[];
  haftalik: TrendNokta[];
  kirilim: ReturnType<typeof breakdown>;
  frekans: ReturnType<typeof frequencyBuckets>;
  pacing: ReturnType<typeof reportPacing>;
  duzeltilen: MetrikAlan[];
};

export function summarize(rows: StdRow[], duzeltilen: MetrikAlan[], plan: PlanInput): ReportSummary {
  const t = totals(rows);
  const dates = rows.map((r) => r.tarih).filter((x): x is string => !!x).sort();
  return {
    satir: rows.length,
    donem: { bas: dates[0] ?? null, son: dates.at(-1) ?? null },
    totals: t,
    kpi: kpis(t),
    gunluk: trend(rows, "gun"),
    haftalik: trend(rows, "hafta"),
    kirilim: breakdown(rows),
    frekans: frequencyBuckets(rows),
    pacing: reportPacing(rows, t, plan),
    duzeltilen,
  };
}
