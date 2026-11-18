import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { MecraBrowser } from "@/components/mecra/MecraBrowser";
import { getAllMecra } from "@/lib/mecra/load";
import { dogrulamaDurumu } from "@/lib/mecra/schema";

export const metadata: Metadata = {
  title: "Mecra & Spec Bul",
  description: "Hangi mecraya hangi DSP'den, hangi satın alma tipiyle girilir? Mecra bazında satın alma yolları, formatlar ve dikkat edilecekler.",
  alternates: { canonical: "/mecra" },
};

export default function Page() {
  const now = new Date();
  const items = getAllMecra().map(({ slug, mecra, kanal, tur, ozet, dspler, formatlar, son_dogrulama }) => ({
    slug,
    mecra,
    kanal,
    tur,
    ozet,
    dspler,
    formatlar,
    dogrulama: dogrulamaDurumu(son_dogrulama, now),
  }));
  const dogrulanmamis = items.filter((i) => i.dogrulama.durum !== "guncel").length;
  return (
    <>
      <PageHeader
        etiket="07 / MECRA & SPEC BUL"
        baslik="Mecra & Spec Rehberi"
        sistem={dogrulanmamis ? `${dogrulanmamis} kayıt doğrulama bekliyor. bilinmeyen alanlar bilerek boş.` : "tüm kayıtlar son 6 ayda doğrulandı."}
      >
        <p>
          &ldquo;Twitch&apos;e nereden girilir, hangi spec&apos;le?&rdquo; Her kayıt kaynak ve son doğrulama tarihi taşır; 6 aydan eski ya da hiç
          doğrulanmamış kayıtlar <span className="text-accent">doğrulanmalı</span> etiketi alır. Bilmediğimiz alanı boş bırakıyoruz — tahmini spec
          yazmıyoruz. Kreatifi göndermeden önce resmî spec belgesine bak.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <MecraBrowser items={items} />
      </div>
    </>
  );
}
