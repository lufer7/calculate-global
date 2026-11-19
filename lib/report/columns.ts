/**
 * Rapor kolonlarının standart şemaya eşlenmesi (§M7). DSP şablon tanıma başlık
 * eşanlamlılarıyla yapılır; tanınmayan kolonlar için kullanıcı elle eşler.
 * Not: şablon ipuçları bilinen yaygın başlık adlarına dayanır ve her export ayarında
 * birebir tutmayabilir — bu yüzden eşleme ekranı her zaman gösterilir.
 */
import { trNormalize } from "@/lib/sozluk/normalize";

export const METRIK_ALANLARI = [
  "impression",
  "klik",
  "harcama",
  "gorulebilir",
  "olculen",
  "videoBaslama",
  "videoTamamlama",
  "donusum",
  "donusumDegeri",
  "frekans",
  "reach",
] as const;
export type MetrikAlan = (typeof METRIK_ALANLARI)[number];
export type Alan = "tarih" | "boyut" | MetrikAlan;

export const ALAN_AD: Record<Alan, string> = {
  tarih: "tarih",
  boyut: "kırılım (placement/mecra/kreatif/kitle)",
  impression: "impression",
  klik: "klik",
  harcama: "harcama",
  gorulebilir: "görülebilir impression",
  olculen: "ölçülen impression",
  videoBaslama: "video başlama",
  videoTamamlama: "video tamamlama",
  donusum: "dönüşüm",
  donusumDegeri: "dönüşüm değeri",
  frekans: "frekans",
  reach: "tekil reach",
};

const SYN: Record<Alan, string[]> = {
  tarih: ["date", "day", "tarih", "gun", "report date"],
  boyut: ["placement", "site", "domain", "line item", "creative", "kreatif", "audience", "kitle", "mecra", "inventory source", "app/url", "publisher", "order", "insertion order", "campaign", "kampanya"],
  impression: ["impressions", "impression", "imps", "gosterim", "tracked ads", "served impressions"],
  klik: ["clicks", "click", "klik", "tiklama"],
  harcama: ["media cost", "total cost", "spend", "cost", "revenue (adv currency)", "harcama", "maliyet", "sales", "total media cost", "advertiser cost"],
  gorulebilir: ["viewable impressions", "active view: viewable impressions", "viewable", "gorulebilir"],
  olculen: ["measurable impressions", "active view: measurable impressions", "measurable", "olculen"],
  videoBaslama: ["video starts", "starts (video)", "video start", "video baslama"],
  videoTamamlama: ["complete views (video)", "video completions", "video complete", "completed views", "100% complete", "video tamamlama", "tamamlanan"],
  donusum: ["conversions", "total conversions", "purchases", "donusum", "total conversions (all)"],
  donusumDegeri: ["revenue", "conversion value", "sales value", "total sales", "purchase value", "donusum degeri", "ciro"],
  frekans: ["frequency", "average frequency", "avg. frequency", "frekans"],
  reach: ["unique reach", "reach", "unique users", "tekil", "unique reach: impression reach"],
};

export type Mapping = Partial<Record<Alan, number>>;

/** Başlıktan alan eşlemesi: önce tam eşleşme, sonra içerme; bir kolon tek alana eşlenir. */
export function autoMap(header: string[]): Mapping {
  const h = header.map((x) => trNormalize(x));
  const used = new Set<number>();
  const out: Mapping = {};
  const order: Alan[] = ["tarih", "gorulebilir", "olculen", "videoBaslama", "videoTamamlama", "donusumDegeri", "impression", "klik", "harcama", "donusum", "frekans", "reach", "boyut"];
  for (const pass of ["exact", "contains"] as const) {
    for (const alan of order) {
      if (out[alan] !== undefined) continue;
      for (const syn of SYN[alan]) {
        const i = h.findIndex((x, idx) => !used.has(idx) && (pass === "exact" ? x === syn : x.includes(syn)));
        if (i !== -1) {
          out[alan] = i;
          used.add(i);
          break;
        }
      }
    }
  }
  return out;
}

export type Sablon = "adform" | "amazon" | "dv360" | "cm360" | "bilinmiyor";
export const SABLON_AD: Record<Sablon, string> = { adform: "Adform", amazon: "Amazon DSP", dv360: "DV360", cm360: "CM360", bilinmiyor: "tanınmadı" };

const IPUCU: [Sablon, string[]][] = [
  ["dv360", ["insertion order", "revenue (adv currency)", "active view:", "line item id"]],
  ["cm360", ["floodlight", "placement id", "dcm", "campaign manager"]],
  ["amazon", ["total cost", "dpv", "detail page view", "amazon", "order id"]],
  ["adform", ["tracked ads", "adform", "sales (adv. currency)", "lineitem"]],
];

export function detectTemplate(header: string[]): Sablon {
  const h = header.map((x) => trNormalize(x)).join(" | ");
  let best: Sablon = "bilinmiyor";
  let score = 0;
  for (const [s, hints] of IPUCU) {
    const n = hints.filter((x) => h.includes(x)).length;
    if (n > score) {
      score = n;
      best = s;
    }
  }
  return best;
}
