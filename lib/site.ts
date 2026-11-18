export const SITE_NAME = "PRGTURK";
export const SITE_TAGLINE = "Programatik Masası";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://prgturk.com").replace(/\/$/, "");
export const SITE_DESCRIPTION =
  "Türkiye'deki programatik reklam ve dijital medya çalışanları için sözlük, metrik hesaplayıcılar, reach tahmini, envanter arama ve rapor yorumu. Tek yerde, sade, kaynaklı.";

/** Sayfa <title> formatı (§1b): "Metrik Hesapla — PRGTURK" */
export const pageTitle = (t: string) => `${t} — ${SITE_NAME}`;

export type NavItem = { href: string; ad: string; kisa?: string; hazir: boolean };

/** §1b — sekme adları ve route'lar AYNEN. */
export const NAV: NavItem[] = [
  { href: "/sozluk", ad: "Sözlük", hazir: true },
  { href: "/hesapla", ad: "Metrik Hesapla", hazir: true },
  { href: "/reach-tahmin", ad: "Reach Tahminle", hazir: true },
  { href: "/envanter", ad: "Envanter Ara", hazir: false },
  { href: "/hedef-kitle", ad: "Hedef Kitle Çalış", hazir: false },
  { href: "/rapor", ad: "Rapor Yorumla", hazir: false },
  { href: "/mecra", ad: "Mecra & Spec Bul", kisa: "Spec Bul", hazir: true },
];
