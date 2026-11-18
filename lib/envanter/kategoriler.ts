/**
 * Türkçe envanter kategorileri (§M5) ve IAB Content Taxonomy (3.x, tier-1) eşlemesi.
 * Eşleme editöryeldir; IAB adları DSP'de hedefleme yaparken aranacak ifadelerdir.
 */
export const ENVANTER_KATEGORILERI = {
  yemek: { ad: "Yemek", iab: "Food & Drink" },
  spor: { ad: "Spor", iab: "Sports" },
  haber: { ad: "Haber", iab: "News and Politics" },
  finans: { ad: "Finans / döviz", iab: "Personal Finance" },
  teknoloji: { ad: "Teknoloji", iab: "Technology & Computing" },
  otomotiv: { ad: "Otomotiv", iab: "Automotive" },
  saglik: { ad: "Sağlık", iab: "Medical Health" },
  "anne-bebek": { ad: "Anne-bebek", iab: "Family and Relationships" },
  moda: { ad: "Moda", iab: "Style & Fashion" },
  oyun: { ad: "Oyun", iab: "Video Gaming" },
  emlak: { ad: "Emlak", iab: "Real Estate" },
  "e-ticaret": { ad: "E-ticaret", iab: "Shopping" },
  egitim: { ad: "Eğitim", iab: "Education" },
  seyahat: { ad: "Seyahat", iab: "Travel" },
  magazin: { ad: "Magazin", iab: "Pop Culture" },
  hukuk: { ad: "Hukuk", iab: null },
} as const satisfies Record<string, { ad: string; iab: string | null }>;

export type EnvanterKategori = keyof typeof ENVANTER_KATEGORILERI;
export const ENVANTER_KATEGORI_SLUGLARI = Object.keys(ENVANTER_KATEGORILERI) as [EnvanterKategori, ...EnvanterKategori[]];

export function isEnvanterKategori(s: string | null | undefined): s is EnvanterKategori {
  return !!s && s in ENVANTER_KATEGORILERI;
}
