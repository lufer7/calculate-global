import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Envanter Ara",
  description: "Bir domain yaz: Türkiye'de ne kadar büyük, hangi SSP'lerde satılıyor, DIRECT mi RESELLER mı, hangi kategoride.",
  alternates: { canonical: "/envanter" },
  robots: { index: false, follow: true }, // modül hazır olana kadar indekslenmez
};

export default function Page() {
  return (
    <ComingSoon
      etiket={"04 / ENVANTER ARA"}
      baslik={"Envanter Ara"}
      faz={"P2"}
      aciklama={"Bir domain yaz: Türkiye'de ne kadar büyük, hangi SSP'lerde satılıyor, DIRECT mi RESELLER mı, hangi kategoride."}
      sistem={"crawler henüz uykuda. ads.txt'ler yerinde duruyor."}
      maddeler={["ads.txt ve sellers.json analizi: hangi SSP, kaç seat, DIRECT/RESELLER", "CrUX Türkiye büyüklük kovası (ilk 1.000 / 10.000 / 100.000 / 1.000.000)", "Cloudflare Radar ikinci sıralama sinyali", "Kategori ve IAB Content Taxonomy eşlemesi", "Kategori sayfaları ve CSV export"]}
    />
  );
}
