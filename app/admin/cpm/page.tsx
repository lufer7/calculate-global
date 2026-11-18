import { desc } from "drizzle-orm";
import { cpmAdjustments, cpmBenchmarks, CPM_FORMATLAR } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatNumber } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import { addAdjustment, addBenchmark, deleteRow } from "../actions";
import { ActionForm, Field } from "../ui";

function Select({ name, options, def }: { name: string; options: readonly string[]; def?: string }) {
  return (
    <select id={name} name={name} className="input" defaultValue={def}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function DeleteButton({ tablo, id }: { tablo: string; id: number }) {
  return (
    <form action={deleteRow}>
      <input type="hidden" name="tablo" value={tablo} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn min-h-9 px-2 text-[11px] text-down" aria-label={`${id} numaralı satırı sil`}>
        sil
      </button>
    </form>
  );
}

export default async function AdminCpm() {
  const db = getDb()!;
  const [rows, adjs] = await Promise.all([
    db.select().from(cpmBenchmarks).orderBy(desc(cpmBenchmarks.donem), desc(cpmBenchmarks.createdAt)).limit(100),
    db.select().from(cpmAdjustments).orderBy(desc(cpmAdjustments.gecerlilikBaslangic)).limit(50),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">CPM benchmark (Katman A)</h1>
        <p className="max-w-3xl text-sm text-muted">
          Değeri <strong className="text-text">kaynak para biriminde</strong> gir (çoğunlukla USD). TL hiçbir zaman saklanmaz, gösterimde kur × Türkiye
          katsayısı ile hesaplanır. Kaynak yalnızca public benchmark, topluluk veya editöryel tahmin olabilir — DB bunu CHECK ile zorlar.
        </p>
        <ActionForm action={addBenchmark} submit="benchmark ekle">
          <Field name="format" label="format">
            <Select name="format" options={CPM_FORMATLAR} />
          </Field>
          <Field name="donem" label="dönem">
            <input id="donem" name="donem" type="month" required className="input" />
          </Field>
          <Field name="paraBirimi" label="kaynak para birimi">
            <Select name="paraBirimi" options={["USD", "EUR", "TRY"]} />
          </Field>
          <Field name="kaynak" label="kaynak tipi">
            <Select name="kaynak" options={["public_benchmark", "editoryel_tahmin", "topluluk"]} />
          </Field>
          <Field name="degerMin" label="min (P25 ya da alt sınır)" hint="kaynak para biriminde, örn. 2,45" />
          <Field name="degerMax" label="max (P75 ya da üst sınır)" />
          <Field name="p25" label="P25 (opsiyonel)" />
          <Field name="p75" label="P75 (opsiyonel)" />
          <Field name="kurDegeri" label="kur: 1 birim = ? TL" hint="TCMB efektif satış; TRY için 1" />
          <Field name="kurTarihi" label="kur tarihi">
            <input id="kurTarihi" name="kurTarihi" type="date" required defaultValue={today} className="input" />
          </Field>
          <Field name="kurKaynagi" label="kur kaynağı">
            <input id="kurKaynagi" name="kurKaynagi" defaultValue="TCMB efektif satış" className="input" />
          </Field>
          <Field name="kaynakAdi" label="kaynak adı" hint="örn. Burt Intelligence Open Auction Benchmarks" />
          <Field name="kaynakUrl" label="kaynak URL (opsiyonel)" />
          <Field name="kanal" label="kanal (opsiyonel)" hint="desktop / mobil / ctv" />
          <Field name="satinAlma" label="satın alma (opsiyonel)" hint="open / pmp / pg" />
        </ActionForm>

        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[56rem] text-xs">
            <thead className="bg-bg-alt text-left text-muted">
              <tr>
                {["dönem", "format", "bant", "kur", "kaynak", "kaynak adı", ""].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-normal uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    henüz satır yok — ticker &ldquo;veri bekleniyor&rdquo; diyor.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border-dim">
                  <td className="px-3 py-2">{r.donem}</td>
                  <td className="px-3 py-2">{r.format}</td>
                  <td className="px-3 py-2">
                    {formatNumber(Number(r.degerMin), 4)}–{formatNumber(Number(r.degerMax), 4)} {r.paraBirimi}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(Number(r.kurDegeri), 4)} · {formatDate(r.kurTarihi)}
                  </td>
                  <td className="px-3 py-2">{r.kaynak}</td>
                  <td className="px-3 py-2">{r.kaynakAdi}</td>
                  <td className="px-3 py-1 text-right">
                    <DeleteButton tablo="benchmark" id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="katsayi" className="space-y-4">
        <h2 className="text-xl font-semibold">Türkiye düzeltme katsayısı</h2>
        <p className="max-w-3xl text-sm text-muted">
          Editöryel tahmin. Kendi ya da ajans DSP verisinden <strong className="text-text">hesaplanmaz</strong>. Metot notu zorunlu ve sitede her CPM
          değerinin detayında görünür: IAB Türkiye yatırım raporları, yayıncıların açıkladığı rate card&apos;lar, yerel SSP açıklamaları, sektör
          tecrübesi.
        </p>
        <ActionForm action={addAdjustment} submit="katsayı ekle">
          <Field name="format" label="format">
            <Select name="format" options={CPM_FORMATLAR} />
          </Field>
          <Field name="katsayi" label="katsayı" hint="örn. 0,45" />
          <Field name="gecerlilikBaslangic" label="geçerlilik başlangıcı">
            <input id="gecerlilikBaslangic" name="gecerlilikBaslangic" type="date" required defaultValue={today} className="input" />
          </Field>
          <Field name="metotNotu" label="metot notu (2-3 cümle)" full>
            <textarea id="metotNotu" name="metotNotu" required minLength={20} rows={3} className="input py-2" />
          </Field>
        </ActionForm>
        <ul className="space-y-2">
          {adjs.map((a) => (
            <li key={a.id} className="card flex items-start justify-between gap-4 p-3 text-sm">
              <span>
                <span className="font-mono text-text">
                  {a.format} ×{formatNumber(Number(a.katsayi), 4)}
                </span>{" "}
                <span className="font-mono text-xs text-muted">· {formatDate(a.gecerlilikBaslangic)}</span>
                <span className="mt-1 block text-xs text-muted">{a.metotNotu}</span>
              </span>
              <DeleteButton tablo="adjustment" id={a.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
