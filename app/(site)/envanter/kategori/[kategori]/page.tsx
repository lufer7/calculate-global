import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { cruxLabel, sortByBuckets } from "@/lib/envanter/domain";
import { ENVANTER_KATEGORILERI, ENVANTER_KATEGORI_SLUGLARI, isEnvanterKategori } from "@/lib/envanter/kategoriler";
import { getCategoryRows } from "@/lib/envanter/report";
import { formatNumber } from "@/lib/calc/number";

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return ENVANTER_KATEGORI_SLUGLARI.map((kategori) => ({ kategori }));
}

export async function generateMetadata({ params }: { params: Promise<{ kategori: string }> }): Promise<Metadata> {
  const k = (await params).kategori;
  if (!isEnvanterKategori(k)) return {};
  return {
    title: `${ENVANTER_KATEGORILERI[k].ad} siteleri — programatik envanter`,
    description: `${ENVANTER_KATEGORILERI[k].ad} kategorisindeki Türk siteler: büyüklük kovası, ads.txt SSP'leri, DIRECT/RESELLER dağılımı. CSV indirilebilir.`,
    alternates: { canonical: `/envanter/kategori/${k}` },
  };
}

export default async function Page({ params }: { params: Promise<{ kategori: string }> }) {
  const k = (await params).kategori;
  if (!isEnvanterKategori(k)) notFound();
  const rows = await getCategoryRows(k);
  const sorted = rows ? sortByBuckets(rows) : null;
  const kat = ENVANTER_KATEGORILERI[k];
  return (
    <>
      <PageHeader etiket={`04 / ENVANTER ARA / ${kat.ad.toLocaleUpperCase("tr-TR")}`} baslik={`${kat.ad} siteleri`} sistem={sorted ? `${sorted.length} site. aynı kovadakiler alfabetik — yapay kesinlik yok.` : "veritabanı bağlı değil."}>
        <p>
          Büyüklük kovası (CrUX) ve Cloudflare sıralama kovasına göre; aynı kovadaki siteler alfabetik sıralanır. {kat.iab && <>IAB karşılığı: <span className="text-text">{kat.iab}</span>.</>}
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {sorted && sorted.length > 0 && (
          <a href={`/envanter/kategori/${k}/csv`} className="btn btn-primary" download>
            CSV indir
          </a>
        )}
        {!sorted || sorted.length === 0 ? (
          <p className="syslog">bu kategoride henüz sınıflandırılmış site yok.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-bg-alt text-left text-xs text-muted">
                <tr>
                  {["#", "domain", "büyüklük", "SSP", "DIRECT", "RESELLER"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.domain} className="border-t border-border-dim">
                    <td className="num px-3 py-2 text-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/envanter/${r.domain}`} className="font-mono text-text hover:text-accent">
                        {r.domain}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{cruxLabel(r.cruxRank).etiket}</td>
                    <td className="num px-3 py-2">{formatNumber(r.sspSayisi, 0)}</td>
                    <td className="num px-3 py-2">{formatNumber(r.direct, 0)}</td>
                    <td className="num px-3 py-2">{formatNumber(r.reseller, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
