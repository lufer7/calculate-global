import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Hedef Kitle Çalış",
  description: "Brief'i yapıştır, DSP'yi seç, kendi segment listeni yükle; renk kodlu, iki sheet'li Excel'i indir.",
  alternates: { canonical: "/hedef-kitle" },
  robots: { index: false, follow: true }, // modül hazır olana kadar indekslenmez
};

export default function Page() {
  return (
    <ComingSoon
      etiket={"05 / HEDEF KİTLE ÇALIŞ"}
      baslik={"Hedef Kitle Çalışması"}
      faz={"P3"}
      aciklama={"Brief'i yapıştır, DSP'yi seç, kendi segment listeni yükle; renk kodlu, iki sheet'li Excel'i indir."}
      sistem={"segment adı uydurmayan bir sistem hazırlanıyor."}
      maddeler={["Adform / Amazon DSP / DV360 için segment eşleştirme", "Kendi DSP segment export'unu yükle — sistem segment adı uydurmaz", "Tek kolon keyword Excel'i", "Adform + Amazon iki sheet'li, renk kodlu 3P kitle çalışması", "Retargeting / prospecting ayrımı"]}
    />
  );
}
