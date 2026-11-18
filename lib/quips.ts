/**
 * "sistem:" satırları (§1). Statik süs değil: sayfadaki duruma göre seçilir.
 * Seçim deterministiktir (aynı durum → aynı cümle) ki server/client render tutarlı kalsın.
 */

export type QuipSituation =
  | "frekans_yuksek"
  | "viewability_dusuk"
  | "viewability_iyi"
  | "pacing_geride"
  | "pacing_onde"
  | "pacing_yolunda"
  | "ctr_dusuk"
  | "ctr_supheli"
  | "vtr_dusuk"
  | "veri_bekleniyor"
  | "bos_form"
  | "bos_form_pacing"
  | "sifira_bolme";

export const QUIPS: Record<QuipSituation, string[]> = {
  frekans_yuksek: [
    "frekans {v}. kullanıcı artık seni rüyasında görüyor.",
    "frekans {v}. bu noktada reklam değil, ev arkadaşısın.",
  ],
  viewability_dusuk: [
    "viewability {v} görünüyor. reklamların çoğu sayfanın bodrum katında.",
    "viewability {v}. gösterdin ama kimse görmedi; ağaç ormanda devrildi.",
  ],
  viewability_iyi: ["viewability {v}. ekranın görünen kısmındasın, tebrikler."],
  pacing_geride: [
    "pacing {v} geride. son hafta panik alımı ufukta görünüyor.",
    "pacing {v} geride. bütçe harcanmayı bekliyor, envanter beklemiyor.",
  ],
  pacing_onde: [
    "pacing {v} önde. bu hızla flight bitmeden bütçe bitiyor.",
    "pacing {v} önde. DSP biraz fazla heyecanlanmış.",
  ],
  pacing_yolunda: ["pacing yolunda. bu cümleyi patrona ekran görüntüsüyle at."],
  ctr_dusuk: ["ctr {v}. kreatif mi yorgun, kitle mi ilgisiz — ikisine de bak."],
  ctr_supheli: [
    "ctr {v}. bu kadar ilgi gerçekse tebrikler; değilse IVT raporuna bak.",
    "ctr {v}. ya efsane bir kreatif ya da yanlış tıklayan bir format. muhtemelen ikincisi.",
  ],
  vtr_dusuk: ["oran {v}. video ilk saniyelerde kaybediyor; açılış karesine bak."],
  veri_bekleniyor: ["sistem verinin gelmesini bekliyor. boş hücre, yanlış sayıdan iyidir."],
  bos_form: ["iki alanı doldur, üçüncüsünü sistem bulsun."],
  bos_form_pacing: ["dört alanı doldur, bütçenin kaderini sistem söylesin."],
  sifira_bolme: ["sıfıra bölme tespit edildi. matematik bu konuda katı."],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Durum için bir cümle seç; {v} yer tutucusu verilen değerle doldurulur. */
export function quip(situation: QuipSituation, value = "", seed = ""): string {
  const list = QUIPS[situation];
  const text = list[hash(situation + seed) % list.length]!;
  return text.replace("{v}", value);
}

/**
 * Bir metrik aracının sonucundan durum çıkarır.
 * Eşikler sektörde yaygın kullanılan kaba referanslardır, benchmark iddiası taşımaz.
 */
export function situationForMetric(slug: string, value: number | null): QuipSituation | null {
  if (value === null) return null;
  switch (slug) {
    case "viewability":
      if (value < 50) return "viewability_dusuk";
      if (value >= 70) return "viewability_iyi";
      return null;
    case "ctr":
      if (value > 5) return "ctr_supheli";
      if (value < 0.05) return "ctr_dusuk";
      return null;
    case "vtr":
      return value < 30 ? "vtr_dusuk" : null;
    case "frekans":
      return value >= 10 ? "frekans_yuksek" : null;
    default:
      return null;
  }
}
