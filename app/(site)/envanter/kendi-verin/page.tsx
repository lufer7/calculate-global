import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { OwnDataMerge } from "@/components/envanter/OwnDataMerge";

export const metadata: Metadata = {
  title: "Kendi verini getir",
  description: "Kendi lisanslı site listeni tarayıcında PRGTURK'ün ads.txt ve kategori verisiyle birleştir. Dosyan sunucuya gönderilmez.",
  alternates: { canonical: "/envanter/kendi-verin" },
};

export default function Page() {
  return (
    <>
      <PageHeader etiket="04 / ENVANTER ARA / KENDİ VERİN" baslik="Kendi verini getir" sistem="platform burada yayıncı değil, işleyici. üstelik senin tarayıcında.">
        <p>
          Ölçümleme aboneliğin varsa veriye erişimin var; derdin onu hızlı kullanılabilir hâle getirmek. Export&apos;unu yükle, bizim ads.txt, kategori ve
          büyüklük kovası bilgimizle birleştir, medya planı tablosu olarak indir.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <OwnDataMerge />
      </div>
    </>
  );
}
