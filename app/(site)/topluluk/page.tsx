import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { CpmSubmitForm } from "@/components/topluluk/CpmSubmitForm";
import { formatMoney } from "@/lib/calc/number";
import { FORMAT_ETIKET } from "@/lib/cpm/queries";
import { cellId, getCommunitySettings, getDetailedBreakdown, getFormatCells, userHasApprovedSubmission } from "@/lib/cpm/community-queries";
import { CPM_FORMATLAR } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

export const metadata: Metadata = {
  title: "Topluluk CPM'i",
  description: "Sektörün gördüğü CPM'ler, anonim ve moderasyonlu. Medyan ve P25–P75 bandı; en az 5 kayıt olmadan gösterilmez.",
  alternates: { canonical: "/topluluk" },
};
export const dynamic = "force-dynamic";

export default async function Page() {
  const [cells, settings, user] = await Promise.all([getFormatCells(), getCommunitySettings(), getCurrentUser()]);
  const katkici = user ? await userHasApprovedSubmission(user.id) : false;
  const detay = katkici ? await getDetailedBreakdown() : [];
  return (
    <>
      <PageHeader etiket="// TOPLULUK CPM" baslik="Topluluk CPM'i" sistem="türkiye'de kimsenin yapmadığı şey: sektörün kendi verisi, anonim.">
        <p>
          Gördüğün CPM&apos;i anonim gir; site medyan ve P25–P75 bandını yayınlasın. Bir hücrede en az {settings.minGosterim} onaylı kayıt yoksa sayı
          gösterilmez. Son {settings.pencereGun} günde en az {settings.minGirdi} girdi ve {settings.minKatkici} farklı katkıcı biriken hücrede topluluk
          medyanı, benchmark tahmininin önüne geçer.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section aria-labelledby="hucreler">
          <h2 id="hucreler" className="label">
            // format bazında (son {settings.pencereGun} gün, onaylı)
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {CPM_FORMATLAR.map((f) => {
              const c = cells.get(cellId({ format: f }));
              return (
                <li key={f} className="card p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{FORMAT_ETIKET[f]}</span>
                    {c ? <span className="num font-mono text-lg text-accent">{formatMoney(c.medyan)}</span> : <span className="font-mono text-sm text-muted">yeterli veri yok</span>}
                  </div>
                  {c && (
                    <p className="num mt-1 font-mono text-xs text-muted">
                      P25–P75: {formatMoney(c.p25)}–{formatMoney(c.p75)} · {c.girdi} girdi · {c.katkici} katkıcı {c.birincil ? "· birincil kaynak" : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="katki" className="space-y-3">
          <h2 id="katki" className="label">
            // katkı ver
          </h2>
          <CpmSubmitForm />
        </section>
        <section aria-labelledby="detay">
          <h2 id="detay" className="label">
            // detaylı kırılım (yalnızca katkıcılara)
          </h2>
          {!katkici ? (
            <p className="syslog mt-3">onaylanmış en az bir katkın olduğunda DSP × satın alma × hedefleme kırılımı burada açılır.</p>
          ) : detay.length === 0 ? (
            <p className="syslog mt-3">henüz gösterim eşiğini geçen detay hücresi yok.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-bg-alt text-left text-xs text-muted">
                  <tr>
                    {["format · kanal · DSP · satın alma · hedefleme", "medyan", "P25–P75", "girdi"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detay.map((d) => (
                    <tr key={d.anahtar} className="border-t border-border-dim">
                      <td className="px-3 py-2 text-text">{d.anahtar}</td>
                      <td className="num px-3 py-2 text-accent">{formatMoney(d.cell.medyan)}</td>
                      <td className="num px-3 py-2">
                        {formatMoney(d.cell.p25)}–{formatMoney(d.cell.p75)}
                      </td>
                      <td className="num px-3 py-2">{d.cell.girdi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
