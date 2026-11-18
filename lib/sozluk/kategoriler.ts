export const KATEGORILER = {
  ekosistem: "Ekosistem",
  "satin-alma": "Satın Alma",
  "acik-artirma": "Açık Artırma",
  metrik: "Metrik",
  olcumleme: "Ölçümleme & Attribution",
  video: "Video & CTV",
  kreatif: "Kreatif & Format",
  veri: "Veri & Kimlik",
  gizlilik: "Gizlilik & Regülasyon",
  guvenlik: "Marka Güvenliği & Fraud",
  seffaflik: "Tedarik Şeffaflığı",
  kanal: "Kanal & Mecra",
  hedefleme: "Hedefleme",
  operasyon: "Operasyon",
} as const;

export type Kategori = keyof typeof KATEGORILER;
export const KATEGORI_SLUGLARI = Object.keys(KATEGORILER) as [Kategori, ...Kategori[]];

export const SEVIYELER = { temel: "Temel", orta: "Orta", ileri: "İleri" } as const;
export type Seviye = keyof typeof SEVIYELER;
