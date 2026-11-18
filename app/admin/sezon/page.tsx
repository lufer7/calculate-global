import { asc } from "drizzle-orm";
import { cpmSeasonality, CPM_FORMATLAR } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatNumber } from "@/lib/calc/number";
import { addSeasonality, deleteRow } from "../actions";
import { ActionForm, Field } from "../ui";

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default async function AdminSezon() {
  const rows = await getDb()!.select().from(cpmSeasonality).orderBy(asc(cpmSeasonality.ay));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sezon katsayıları</h1>
      <p className="max-w-3xl text-sm text-muted">
        1,00 = yıl ortalaması. Kaynak zorunlu. Tutarlılık kontrolü: eğri kasımda yükselmeli, temmuz-ağustosta düşmeli; göstermiyorsa tablo hatalıdır
        (§4.1b-3).
      </p>
      <ActionForm action={addSeasonality} submit="katsayı ekle">
        <Field name="ay" label="ay">
          <select id="ay" name="ay" className="input">
            {AYLAR.map((a, i) => (
              <option key={a} value={i + 1}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field name="format" label="format (boş = hepsi)">
          <select id="format" name="format" className="input" defaultValue="">
            <option value="">tümü</option>
            {CPM_FORMATLAR.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field name="katsayi" label="katsayı" hint="örn. 1,25" />
        <Field name="ozelDonem" label="özel dönem (opsiyonel)" hint="Black Friday, Ramazan, Yılbaşı" />
        <Field name="kaynak" label="kaynak" hint="hangi public rapora dayanıyor" />
        <Field name="not" label="not (opsiyonel)" />
      </ActionForm>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[40rem] text-xs">
          <thead className="bg-bg-alt text-left text-muted">
            <tr>
              {["ay", "format", "katsayı", "özel dönem", "kaynak", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-normal uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  tablo boş.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border-dim">
                <td className="px-3 py-2">{AYLAR[r.ay - 1]}</td>
                <td className="px-3 py-2">{r.format ?? "tümü"}</td>
                <td className="px-3 py-2">×{formatNumber(Number(r.katsayi), 2, 2)}</td>
                <td className="px-3 py-2">{r.ozelDonem ?? "—"}</td>
                <td className="px-3 py-2">{r.kaynak}</td>
                <td className="px-3 py-1 text-right">
                  <form action={deleteRow}>
                    <input type="hidden" name="tablo" value="sezon" />
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="btn min-h-9 px-2 text-[11px] text-down">
                      sil
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
