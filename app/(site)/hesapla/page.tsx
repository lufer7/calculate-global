import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PromptBar } from "@/components/PromptBar";
import { IconArrowRight } from "@/components/icons";
import { TOOLS } from "@/lib/calc/tools";

export const metadata: Metadata = {
  title: "Metrik Hesapla",
  description: "CPM, eCPM, CTR, CPC, CPV, CPCV, VTR, viewability, vCPM, CPA ve pacing hesaplayıcıları. Ters hesaplama, açık formül, paylaşılabilir link.",
  alternates: { canonical: "/hesapla" },
};

export default function HesaplaPage() {
  return (
    <>
      <PageHeader etiket="02 / METRİK HESAPLA" baslik="Metrik Hesapla" sistem={`${TOOLS.length} hesaplayıcı hazır. excel'de formül aramaya son.`}>
        <p>
          Her araçta üç alan var; bildiğin ikisini gir, üçüncüsü çıksın. Formül açıkta, varsayımlar altında. Linki kopyala,
          hesap URL&apos;de saklı — ekip arkadaşın aynı sayıları görsün.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="max-w-xl">
          <PromptBar placeholder="/cpm  ·  /ctr  ·  /pacing" />
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={`/hesapla/${t.slug}`} className="card group flex h-full flex-col p-5 hover:border-muted">
                <span className="font-mono text-sm font-semibold tracking-wide text-accent">{t.ad}</span>
                <span className="mt-2 text-base font-semibold text-text">{t.soru}</span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{t.ozet}</span>
                <code className="mt-4 block truncate text-[11.5px] text-muted">{t.formul}</code>
                <span className="mt-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-accent">
                  hesapla <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
