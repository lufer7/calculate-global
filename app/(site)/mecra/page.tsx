import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Mecra & Spec Bul",
  description: "Twitch'e nereden girilir, hangi spec'le? Mecra bazında DSP, satın alma tipi ve kreatif spec'leri; kaynaklı, tarihli.",
  alternates: { canonical: "/mecra" },
  robots: { index: false, follow: true }, // modül hazır olana kadar indekslenmez
};

export default function Page() {
  return (
    <ComingSoon
      etiket={"07 / MECRA & SPEC BUL"}
      baslik={"Mecra & Spec Rehberi"}
      faz={"P1 — sırada"}
      aciklama={"Twitch'e nereden girilir, hangi spec'le? Mecra bazında DSP, satın alma tipi ve kreatif spec'leri; kaynaklı, tarihli."}
      sistem={"spec PDF'leri toplanıyor. dağınıklık geçici."}
      maddeler={["20 mecra ile başlangıç: CTV, video, retail media, audio, DOOH", "DSP ve satın alma tipi (PG / PMP / open)", "Kreatif spec kartları, son doğrulama tarihi ve resmî kaynak linki", "Filtre ve 2-3 mecra karşılaştırma modu"]}
    />
  );
}
