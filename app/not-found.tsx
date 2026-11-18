import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="icerik" className="mx-auto max-w-3xl px-4 py-24">
        <p className="label">// hata 404</p>
        <h1 className="mt-3 font-mono text-4xl font-bold">No bid.</h1>
        <p className="mt-4 text-muted">Bu sayfa için açık artırmaya giren olmadı. Floor price fazla yüksek olabilir ya da sayfa hiç yoktu.</p>
        <p className="syslog mt-4">fill rate: %0.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Ana sayfa
          </Link>
          <Link href="/sozluk/floor-price" className="btn">
            Floor price nedir?
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
