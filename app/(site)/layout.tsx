import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Ticker DB'den okunur; sayfalar saatlik yeniden üretilir, admin kaydı anında tazeler.
export const revalidate = 3600;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="icerik">{children}</main>
      <Footer />
    </>
  );
}
