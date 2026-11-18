import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Rapor Yorumla",
  description: "DSP raporunu yükle, kolonları eşleştir; metrikler deterministik hesaplansın, yorum PDF olarak gelsin.",
  alternates: { canonical: "/rapor" },
  robots: { index: false, follow: true }, // modül hazır olana kadar indekslenmez
};

export default function Page() {
  return (
    <ComingSoon
      etiket={"06 / RAPOR YORUMLA"}
      baslik={"Rapor Yorumla"}
      faz={"P4"}
      aciklama={"DSP raporunu yükle, kolonları eşleştir; metrikler deterministik hesaplansın, yorum PDF olarak gelsin."}
      sistem={"rapor yorumcusu henüz kahvesini içiyor."}
      maddeler={["Adform, Amazon DSP, DV360, CM360 şablon tanıma", "Sayılar formülle hesaplanır, yapay zekâ yalnızca yorum yazar", "Nerede para kaçıyor, patron neyi soracak", "Türkçe karakterli PDF", "Yüklenen dosya diske yazılmaz, istek bitince silinir"]}
    />
  );
}
