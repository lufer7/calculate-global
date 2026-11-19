import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ReportTool } from "@/components/report/ReportTool";
import { aiConfigured } from "@/lib/ai/client";

export const metadata: Metadata = {
  title: "Rapor Yorumla",
  description: "DSP raporunu yükle: metrikler tarayıcında formülle hesaplanır, yapay zekâ yalnızca yorum yazar. Türkçe PDF indir. Ham veri sunucuya gitmez.",
  alternates: { canonical: "/rapor" },
};
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <PageHeader etiket="06 / RAPOR YORUMLA" baslik="Rapor Yorumla" sistem="sayıyı formül hesaplar, yorumu model yazar. tersi olmaz.">
        <p>
          Adform, Amazon DSP, DV360 veya CM360 export&apos;unu yükle. Metrikler tarayıcında, lib/calc formülleriyle hesaplanır; yapay zekâ yalnızca bu
          sayılara bakıp yorum yazar ve yeni sayı üretemez. Sonuç: kapak, metrik tablosu, grafikler ve yorumla tek PDF.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ReportTool aiHazir={aiConfigured()} />
      </div>
    </>
  );
}
