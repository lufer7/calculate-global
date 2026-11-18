import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DogrulamaBadge } from "@/components/mecra/DogrulamaBadge";
import { getMecra } from "@/lib/mecra/load";
import { dogrulamaDurumu, KANALLAR, type Mecra } from "@/lib/mecra/schema";

export const metadata: Metadata = { title: "Mecra karşılaştır", robots: { index: false, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const slugs = ((await searchParams).m ?? "").split(",").filter(Boolean).slice(0, 3);
  const list = slugs.map(getMecra).filter((m): m is Mecra => !!m);
  const now = new Date();
  const rows: [string, (m: Mecra) => React.ReactNode][] = [
    ["doğrulama", (m) => <DogrulamaBadge d={dogrulamaDurumu(m.son_dogrulama, now)} />],
    ["kanal", (m) => m.kanal.map((k) => KANALLAR[k]).join(", ")],
    ["tür", (m) => m.tur],
    ["satın alma yolu", (m) => (m.dspler.length ? m.dspler.map((d) => `${d.dsp}${d.satin_alma.length ? ` (${d.satin_alma.join("/")})` : ""}`).join("; ") : "—")],
    ["formatlar", (m) => m.formatlar.map((f) => f.ad).join(", ") || "—"],
    ["tahmini CPM bandı", (m) => (m.tahmini_cpm_bandi ? `${m.tahmini_cpm_bandi.min}–${m.tahmini_cpm_bandi.max} ${m.tahmini_cpm_bandi.para}` : "veri yok")],
    ["ölçümleme", (m) => m.olcumleme.join(", ") || "—"],
  ];
  return (
    <>
      <PageHeader etiket="07 / MECRA & SPEC BUL / KARŞILAŞTIR" baslik="Mecra karşılaştır" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {list.length < 2 ? (
          <p className="syslog">
            karşılaştırmak için en az iki mecra seç. <Link href="/mecra" className="text-accent underline">listeye dön</Link>
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-bg-alt">
                <tr>
                  <th scope="col" className="w-40 px-3 py-3 text-left font-normal text-muted">
                    <span className="sr-only">özellik</span>
                  </th>
                  {list.map((m) => (
                    <th key={m.slug} scope="col" className="px-3 py-3 text-left">
                      <Link href={`/mecra/${m.slug}`} className="font-mono text-text hover:text-accent">
                        {m.mecra}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, fn]) => (
                  <tr key={k} className="border-t border-border-dim align-top">
                    <th scope="row" className="px-3 py-3 text-left font-mono text-xs font-normal uppercase tracking-wider text-muted">
                      {k}
                    </th>
                    {list.map((m) => (
                      <td key={m.slug} className="px-3 py-3 text-text">
                        {fn(m)}
                      </td>
                    ))}
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
