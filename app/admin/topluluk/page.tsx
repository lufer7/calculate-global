import { desc } from "drizzle-orm";
import { cpmSettings, cpmSubmissions } from "@/db/schema";
import { getDb } from "@/lib/db";
import { iqrOutliers } from "@/lib/cpm/community";
import { formatMoney } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import { moderateSubmission, updateCpmSettings } from "../actions";
import { ActionForm, Field } from "../ui";

export default async function AdminTopluluk() {
  const db = getDb()!;
  const [rows, [settings]] = await Promise.all([
    db.select().from(cpmSubmissions).orderBy(desc(cpmSubmissions.createdAt)).limit(500),
    db.select().from(cpmSettings).limit(1),
  ]);
  // Uç değer işareti: aynı formattaki tüm girdilere göre IQR dışı
  const outlier = new Map<number, boolean>();
  for (const f of new Set(rows.map((r) => r.format))) {
    const g = rows.filter((r) => r.format === f);
    const flags = iqrOutliers(g.map((r) => Number(r.cpmTl)));
    g.forEach((r, i) => outlier.set(r.id, g.length >= 4 && flags[i]!));
  }
  const pending = rows.filter((r) => !r.onaylandi);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Topluluk CPM moderasyonu</h1>
        <p className="max-w-3xl text-sm text-muted">
          Onaylanmayan girdi hiçbir hesaba katılmaz. IQR dışı değerler <span className="text-down">▲ uç</span> olarak işaretlenir; aggregasyon da onları
          otomatik dışlar. Aynı IP özetinden gelen seri girdilere dikkat.
        </p>
        {pending.length === 0 ? (
          <p className="syslog">bekleyen girdi yok.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[56rem] text-xs">
              <thead className="bg-bg-alt text-left text-muted">
                <tr>
                  {["tarih", "format", "kanal", "DSP", "satın alma", "hedefleme", "ay", "CPM", "ip özeti", ""].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} className="border-t border-border-dim">
                    <td className="px-3 py-2">{formatDate(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.format}</td>
                    <td className="px-3 py-2">{r.kanal ?? "—"}</td>
                    <td className="px-3 py-2">{r.dsp ?? "—"}</td>
                    <td className="px-3 py-2">{r.satinAlma ?? "—"}</td>
                    <td className="px-3 py-2">{r.hedefleme ?? "—"}</td>
                    <td className="px-3 py-2">{r.ay}</td>
                    <td className={`num px-3 py-2 ${outlier.get(r.id) ? "text-down" : "text-text"}`}>
                      {formatMoney(Number(r.cpmTl))} {outlier.get(r.id) ? "▲ uç" : ""}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted">{r.ipHash?.slice(0, 8) ?? "—"}</td>
                    <td className="px-3 py-1">
                      <div className="flex gap-1">
                        {(["onayla", "sil"] as const).map((k) => (
                          <form key={k} action={moderateSubmission}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="karar" value={k} />
                            <button type="submit" className={`btn min-h-9 px-2 text-[11px] ${k === "sil" ? "text-down" : "text-up"}`}>
                              {k}
                            </button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="syslog">toplam {rows.length} girdi · {rows.length - pending.length} onaylı</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Katman B geçiş eşikleri</h2>
        <ActionForm action={updateCpmSettings} submit="eşikleri kaydet">
          <Field name="minGirdi" label="birincil için min. girdi">
            <input id="minGirdi" name="minGirdi" className="input" defaultValue={settings?.minGirdi ?? 8} />
          </Field>
          <Field name="minKatkici" label="birincil için min. katkıcı">
            <input id="minKatkici" name="minKatkici" className="input" defaultValue={settings?.minKatkici ?? 5} />
          </Field>
          <Field name="minGosterim" label="gösterim için min. kayıt">
            <input id="minGosterim" name="minGosterim" className="input" defaultValue={settings?.minGosterim ?? 5} />
          </Field>
          <Field name="pencereGun" label="pencere (gün)">
            <input id="pencereGun" name="pencereGun" className="input" defaultValue={settings?.pencereGun ?? 90} />
          </Field>
          <Field name="tutarlilikEsigi" label="kaynaklar arası sapma eşiği" hint="0,40 = %40">
            <input id="tutarlilikEsigi" name="tutarlilikEsigi" className="input" defaultValue={settings ? String(settings.tutarlilikEsigi).replace(".", ",") : "0,40"} />
          </Field>
        </ActionForm>
      </section>
    </div>
  );
}
