import Link from "next/link";
import { getAllTerms } from "@/lib/sozluk/load";
import { KATEGORILER, SEVIYELER, type Kategori } from "@/lib/sozluk/kategoriler";

export default function AdminSozluk() {
  const terms = getAllTerms();
  const bySeviye = Object.keys(SEVIYELER).map((s) => [s, terms.filter((t) => t.seviye === s).length] as const);
  const byKat = (Object.keys(KATEGORILER) as Kategori[]).map((k) => [k, terms.filter((t) => t.kategori.includes(k)).length] as const);
  const kopuk = terms.flatMap((t) => (t.ilgili.length !== t.ilgiliSluglar.length ? [t.slug] : []));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sözlük</h1>
      <p className="max-w-3xl text-sm text-muted">
        Birincil kaynak <code>content/sozluk/*.mdx</code> — git&apos;te versiyonlu. Düzenleme PR ile yapılır; bu ekran durum ve kalite kontrolü içindir.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <p className="label">// seviye</p>
          <ul className="num mt-2 space-y-1 font-mono text-sm">
            {bySeviye.map(([s, n]) => (
              <li key={s}>
                {SEVIYELER[s as keyof typeof SEVIYELER]}: {n}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <p className="label">// kategori</p>
          <ul className="num mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
            {byKat.map(([k, n]) => (
              <li key={k}>
                {KATEGORILER[k]}: {n}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="syslog">
        toplam {terms.length} terim · çözülemeyen &ldquo;ilgili&rdquo; referansı olan: {kopuk.length === 0 ? "yok" : kopuk.join(", ")}
      </p>
      <ul className="columns-2 gap-6 text-sm md:columns-4">
        {terms.map((t) => (
          <li key={t.slug}>
            <Link href={`/sozluk/${t.slug}`} className="text-muted hover:text-text">
              {t.terim}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
