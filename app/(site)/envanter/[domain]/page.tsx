import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdsTxtTable } from "@/components/envanter/AdsTxtTable";
import { DomainSearch } from "@/components/envanter/DomainSearch";
import { cruxLabel } from "@/lib/envanter/domain";
import { normalizeHost } from "@/lib/envanter/domain";
import { ENVANTER_KATEGORILERI } from "@/lib/envanter/kategoriler";
import { getDomainReport } from "@/lib/envanter/report";
import { formatDate, formatDonem } from "@/lib/format-date";
import { formatNumber } from "@/lib/calc/number";
import { LISANS as CRUX } from "@/lib/providers/crux";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const n = normalizeHost(decodeURIComponent((await params).domain));
  if (!n) return {};
  return {
    title: `${n.domain} — programatik envanter`,
    description: `${n.domain}: ads.txt'teki SSP'ler, DIRECT/RESELLER dağılımı, sellers.json doğrulaması ve Türkiye büyüklük kovası.`,
    alternates: { canonical: `/envanter/${n.domain}` },
  };
}

function Row({ k, children, kaynak }: { k: string; children: React.ReactNode; kaynak?: string }) {
  return (
    <div className="grid gap-1 border-b border-border-dim px-4 py-3 last:border-0 sm:grid-cols-[8rem_1fr]">
      <dt className="label">{k}</dt>
      <dd className="text-sm text-text">
        {children}
        {kaynak && <span className="mt-0.5 block font-mono text-[11px] text-muted">{kaynak}</span>}
      </dd>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const raw = decodeURIComponent((await params).domain);
  const n = normalizeHost(raw);
  if (!n) notFound();
  if (n.domain !== raw) redirect(`/envanter/${n.domain}`);
  const r = await getDomainReport(n.domain);
  const ck = cruxLabel(r.crux?.rankBucket ?? null);
  const kat = r.kategori ? ENVANTER_KATEGORILERI[r.kategori] : null;
  const o = r.adstxt?.ozet;

  return (
    <>
      <div className="border-b border-border-dim bg-bg-alt">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <nav aria-label="Konum" className="label">
            <Link href="/envanter" className="hover:text-accent">
              04 / ENVANTER ARA
            </Link>
          </nav>
          <h1 className="mt-3 break-all font-mono text-3xl font-bold tracking-tight">{r.domain}</h1>
          <p className="syslog mt-3">
            {o
              ? `${o.sspSayisi} reklam sisteminde ${o.direct + o.reseller} yetkili satıcı satırı. ${o.direct ? "programatik kapı açık." : "yalnızca RESELLER; dolaylı yol."}`
              : r.adstxtDurum === "robots_engelledi"
                ? "robots.txt izin vermiyor; zorlamıyoruz."
                : r.adstxtDurum === "hata"
                  ? "siteye ulaşılamadı. yarın tekrar deneriz."
                  : r.adstxtDurum === "bekle"
                    ? "bu domain son 24 saatte denendi; günde bir istek kuralı."
                : "ads.txt bulunamadı. programatik satış görünmüyor ya da dosya yanlış yerde."}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <dl className="card">
          <Row
            k="büyüklük"
            kaynak={
              !r.cruxAcik
                ? "CrUX sağlayıcısı kapalı (lisans şartları teyit bekliyor)"
                : r.crux
                  ? `${CRUX.atif}, ${r.crux.yyyymm ? formatDonem(`${r.crux.yyyymm.slice(0, 4)}-${r.crux.yyyymm.slice(4)}`) : formatDate(r.crux.tarih)}`
                  : "CrUX — veri yok"
            }
          >
            {r.cruxAcik ? (
              <>
                {ck.etiket} <span className="text-muted">· {ck.kademe}</span>
              </>
            ) : (
              <span className="text-muted">veri yok</span>
            )}
          </Row>
          <Row
            k="sıralama"
            kaynak={!r.cloudflareAcik ? "Cloudflare Radar sağlayıcısı kapalı (lisans şartları teyit bekliyor)" : r.cloudflare ? `Cloudflare Radar, ${formatDate(r.cloudflare.tarih)}` : undefined}
          >
            {r.cloudflare?.rankBucket ? `Cloudflare: top ${formatNumber(r.cloudflare.rankBucket, 0)} kovası` : <span className="text-muted">veri yok</span>}
          </Row>
          <Row k="envanter" kaynak={r.adstxt ? `ads.txt, ${formatDate(r.adstxt.tarih)}${r.adstxt.canli ? " · canlı tarama, saklanmadı" : ""}` : r.adstxtMesaj ?? undefined}>
            {o ? (
              <>
                {o.sspSayisi} reklam sistemi · <span className="up">{o.direct} DIRECT</span>, {o.reseller} RESELLER · {o.seatSayisi} seat
              </>
            ) : (
              <span className="text-muted">ads.txt yok</span>
            )}
          </Row>
          <Row k="kategori" kaynak={r.kategoriKaynagi ? `kaynak: ${r.kategoriKaynagi === "admin" ? "editör" : r.kategoriKaynagi}` : undefined}>
            {kat ? (
              <>
                <Link href={`/envanter/kategori/${r.kategori}`} className="text-accent underline underline-offset-2">
                  {kat.ad}
                </Link>{" "}
                {kat.iab && <span className="text-muted">(IAB: {kat.iab})</span>}
              </>
            ) : (
              <span className="text-muted">henüz sınıflandırılmadı</span>
            )}
          </Row>
        </dl>

        {r.cruxAcik && (
          <p className="text-xs text-muted">
            CrUX yalnızca yeterli Chrome trafiği olan origin&apos;leri içerir ve navigasyon bazlıdır; Safari/iOS ağırlıklı kitlesi olan siteler görece düşük
            görünebilir. &ldquo;CrUX&apos;ta yok&rdquo;, &ldquo;trafiği yok&rdquo; demek değildir.
          </p>
        )}

        {r.altAlanlar.length > 0 && (
          <section aria-labelledby="alt">
            <h2 id="alt" className="label">
              // alt alan adları
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {r.altAlanlar.map((a) => (
                <li key={a.host} className="card flex justify-between gap-2 p-3 font-mono text-xs">
                  <span className="text-text">{a.host}</span>
                  <span className="text-muted">{cruxLabel(a.rank).etiket}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {o && r.adstxt && (
          <section aria-labelledby="ssp" className="space-y-4">
            <h2 id="ssp" className="label">
              // reklam sistemleri
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {o.ssp.slice(0, 12).map((s) => (
                <li key={s.ssp} className="card p-3">
                  <p className="font-mono text-sm text-text">{s.ssp}</p>
                  <p className="num mt-1 font-mono text-xs text-muted">
                    {s.direct} DIRECT · {s.reseller} RESELLER · {s.seat} seat
                  </p>
                </li>
              ))}
            </ul>
            <AdsTxtTable satirlar={r.adstxt.satirlar} />
            <p className="text-xs text-muted">
              sellers.json doğrulaması: DIRECT satırı satıcı listesinde PUBLISHER/BOTH, RESELLER satırı INTERMEDIARY/BOTH olarak görünmeli. Sayfa açılışında en fazla
              8 reklam sistemi doğrulanır; kalanlar gece taramasında.
            </p>
          </section>
        )}

        <div className="max-w-xl">
          <DomainSearch />
        </div>
      </div>
    </>
  );
}
