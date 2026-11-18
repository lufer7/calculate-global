import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AudienceTool } from "@/components/audience/AudienceTool";
import { aiConfigured } from "@/lib/ai/client";

export const metadata: Metadata = {
  title: "Hedef Kitle Çalış",
  description: "Brief'i yapıştır, DSP'yi seç, kendi segment listeni yükle; renk kodlu Adform/Amazon Excel'i ve keyword listesini indir. Segment adı uydurmuyoruz.",
  alternates: { canonical: "/hedef-kitle" },
};
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <PageHeader etiket="05 / HEDEF KİTLE ÇALIŞ" baslik="Hedef Kitle Çalışması" sistem="segment adı uydurmayan bir yapay zekâ. evet, mümkün.">
        <p>
          Brief gir, DSP seç, kendi segment export&apos;unu yükle. Yapay zekâ yalnızca senin listendeki segmentlerden seçer ve tek cümle gerekçe yazar;
          CPM, reach ve audience id&apos;ler dosyandan kopyalanır.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AudienceTool aiHazir={aiConfigured()} />
      </div>
    </>
  );
}
