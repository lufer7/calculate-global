import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { DogrulamaBadge } from "@/components/mecra/DogrulamaBadge";
import { SpecTable } from "@/components/mecra/SpecTable";
import { FavoriteButton } from "@/components/account/FavoriteButton";
import { MdxLink } from "@/components/sozluk/TermLink";
import { formatMoney } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import { getAllMecra, getMecra } from "@/lib/mecra/load";
import { dogrulamaDurumu, KANALLAR } from "@/lib/mecra/schema";
import { getAllTerms } from "@/lib/sozluk/load";
import { remarkAutolink } from "@/lib/sozluk/remark-autolink";

export const dynamicParams = false;
export function generateStaticParams() {
  return getAllMecra().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = getMecra((await params).slug);
  if (!m) return {};
  return { title: `${m.mecra}: nasıl satın alınır, hangi spec`, description: m.ozet, alternates: { canonical: `/mecra/${m.slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const m = getMecra((await params).slug);
  if (!m) notFound();
  const d = dogrulamaDurumu(m.son_dogrulama, new Date());
  const matchers = getAllTerms().map((t) => ({ slug: t.slug, names: [t.terim, ...(t.acik ? [t.acik] : []), ...t.esanlam], tanim: t.tanim }));
  return (
    <article>
      <div className="border-b border-border-dim bg-bg-alt">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <nav aria-label="Konum" className="label">
            <Link href="/mecra" className="hover:text-accent">
              07 / MECRA & SPEC BUL
            </Link>{" "}
            / {m.kanal.map((k) => KANALLAR[k]).join(" · ")}
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-bold tracking-tight">{m.mecra}</h1>
            <DogrulamaBadge d={d} />
          </div>
          <p className="mt-3 max-w-2xl text-muted">{m.ozet}</p>
          <div className="mt-4">
            <FavoriteButton tip="mecra" refId={m.slug} ad={m.mecra} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <section className="card p-4 text-sm" aria-labelledby="kaynak">
          <h2 id="kaynak" className="label">
            // kaynak & doğrulama
          </h2>
          <p className="mt-2 text-text">
            {m.kaynak_url ? (
              <a href={m.kaynak_url} target="_blank" rel="noopener noreferrer" className="text-info underline underline-offset-2">
                {m.kaynak_ad ?? m.kaynak_url}
              </a>
            ) : (
              "resmî kaynak henüz eklenmedi"
            )}{" "}
            · son doğrulama: {m.son_dogrulama ? formatDate(m.son_dogrulama) : "yok"}
          </p>
          {m.dogrulama_notu && <p className="mt-2 text-xs text-muted">{m.dogrulama_notu}</p>}
        </section>

        <section aria-labelledby="dsp">
          <h2 id="dsp" className="label">
            // satın alma yolları
          </h2>
          {m.dspler.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[...m.dspler]
                .sort((a, b) => (a.oncelik ?? 99) - (b.oncelik ?? 99))
                .map((x) => (
                  <li key={x.dsp} className="card p-3">
                    <p className="font-mono text-sm font-semibold text-text">{x.dsp}</p>
                    {x.satin_alma.length > 0 && <p className="mt-1 font-mono text-xs text-accent">{x.satin_alma.join(" · ")}</p>}
                    {x.notlar && <p className="mt-1 text-xs text-muted">{x.notlar}</p>}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="syslog mt-3">satın alma yolu henüz doğrulanmadı.</p>
          )}
        </section>

        <section aria-labelledby="spec">
          <h2 id="spec" className="label">
            // formatlar & spec
          </h2>
          <div className="mt-3">
            <SpecTable formatlar={m.formatlar} />
          </div>
        </section>

        <section aria-labelledby="cpm" className="grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <h2 id="cpm" className="label">
              // tahmini CPM bandı
            </h2>
            {m.tahmini_cpm_bandi ? (
              <p className="num mt-2 font-mono text-lg text-accent">
                {formatMoney(m.tahmini_cpm_bandi.min, m.tahmini_cpm_bandi.para)}–{formatMoney(m.tahmini_cpm_bandi.max, m.tahmini_cpm_bandi.para)}
                <span className="block text-xs text-muted">
                  {m.tahmini_cpm_bandi.kaynak} · {m.tahmini_cpm_bandi.tarih}
                </span>
              </p>
            ) : (
              <p className="mt-2 font-mono text-sm text-muted">veri yok</p>
            )}
          </div>
          <div className="card p-4">
            <h2 className="label">// minimum bütçe</h2>
            {m.min_butce ? (
              <p className="num mt-2 font-mono text-lg text-text">
                {formatMoney(m.min_butce.min, m.min_butce.para, 0)} <span className="block text-xs text-muted">{m.min_butce.kaynak}</span>
              </p>
            ) : (
              <p className="mt-2 font-mono text-sm text-muted">veri yok</p>
            )}
          </div>
        </section>

        <div className="prose-term">
          <MDXRemote
            source={m.govde}
            components={{ a: MdxLink }}
            options={{ mdxOptions: { format: "md", remarkPlugins: [remarkGfm, [remarkAutolink, { matchers, self: "" }]] } }}
          />
        </div>
      </div>
    </article>
  );
}
