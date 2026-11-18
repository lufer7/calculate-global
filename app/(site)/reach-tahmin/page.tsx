import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Reach Tahminle",
  description: "Bütçe, CPM ve hedef kitle büyüklüğünden tahmini tekil erişim ve frekans dağılımı. Ya da tersi: şu kadar kişiye şu frekansla ulaşmak kaça patlar.",
  alternates: { canonical: "/reach-tahmin" },
  robots: { index: false, follow: true }, // modül hazır olana kadar indekslenmez
};

export default function Page() {
  return (
    <ComingSoon
      etiket={"03 / REACH TAHMİNLE"}
      baslik={"Reach & Frekans Tahmini"}
      faz={"P1 — sırada"}
      aciklama={"Bütçe, CPM ve hedef kitle büyüklüğünden tahmini tekil erişim ve frekans dağılımı. Ya da tersi: şu kadar kişiye şu frekansla ulaşmak kaça patlar."}
      sistem={"model kuruluyor. basit bölme yapıp 'reach' demeyeceğiz."}
      maddeler={["Bütçeden reach'e ve reach'ten bütçeye iki yönlü hesap", "Poisson frekans dağılımı: 1+, 2+, 3+, 5+, 10+ reach tablosu", "Bütçe → reach eğrisi ve doyma noktası", "Display + video + CTV çoklu kanal senaryosu", "Kaynaklı Türkiye universe referansları (TÜİK, IAB Türkiye)"]}
    />
  );
}
