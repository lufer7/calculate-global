import { desc, sql } from "drizzle-orm";
import { domains } from "@/db/schema";
import { getDb } from "@/lib/db";
import { ENVANTER_KATEGORILERI } from "@/lib/envanter/kategoriler";
import { formatDate } from "@/lib/format-date";
import { addDomains, classifyPending, crawlNow, setCategory } from "../actions";
import { ActionForm, Field } from "../ui";

export default async function AdminEnvanter() {
  const db = getDb()!;
  const rows = await db
    .select({
      domain: domains.domain,
      kategori: domains.kategori,
      kaynak: domains.kategoriKaynagi,
      satir: sql<number>`(select count(*)::int from domain_adstxt a where a.domain = ${domains.domain})`,
      son: sql<string | null>`(select max(c.tarih)::text from crawl_log c where c.host = ${domains.domain} and c.tip = 'adstxt')`,
    })
    .from(domains)
    .orderBy(desc(domains.ilkGorulme))
    .limit(300);
  const katOpts = Object.entries(ENVANTER_KATEGORILERI);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Envanter</h1>
      <p className="max-w-3xl text-sm text-muted">
        Taranacak domainleri ekle. Kategori editör tarafından atanır (ileride LLM ilk sınıflandırmayı yapar); <strong className="text-text">admin
        düzeltmesi her zaman LLM çıktısını ezer</strong>. Gece taraması host başına günde bir istek kuralına uyar.
      </p>
      <ActionForm action={addDomains} submit="domainleri ekle">
        <Field name="liste" label="domain listesi" full hint="boşluk, virgül ya da satır ile ayır">
          <textarea id="liste" name="liste" rows={4} className="input py-2" />
        </Field>
        <Field name="kategori" label="kategori (opsiyonel)">
          <select id="kategori" name="kategori" className="input" defaultValue="">
            <option value="">—</option>
            {katOpts.map(([k, v]) => (
              <option key={k} value={k}>
                {v.ad}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
      <ActionForm action={classifyPending} submit="kategorisizleri LLM ile sınıflandır (10)">
        <p className="text-xs text-muted sm:col-span-2">
          Ana sayfanın yalnızca başlık ve meta açıklaması okunur (robots.txt'e uyularak). Eminliği düşük sonuçlar boş bırakılır; editör ataması asla ezilmez.
        </p>
      </ActionForm>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[48rem] text-xs">
          <thead className="bg-bg-alt text-left text-muted">
            <tr>
              {["domain", "kategori", "ads.txt satırı", "son tarama", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.domain} className="border-t border-border-dim">
                <td className="px-3 py-2 font-mono text-text">{r.domain}</td>
                <td className="px-3 py-1">
                  <form action={setCategory} className="flex items-center gap-2">
                    <input type="hidden" name="domain" value={r.domain} />
                    <select name="kategori" defaultValue={r.kategori ?? ""} className="input min-h-9 w-40 py-0 text-xs" aria-label={`${r.domain} kategorisi`}>
                      <option value="">—</option>
                      {katOpts.map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.ad}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn min-h-9 px-2 text-[11px]">
                      kaydet
                    </button>
                    {r.kaynak && <span className="text-muted">{r.kaynak}</span>}
                  </form>
                </td>
                <td className="num px-3 py-2">{r.satir}</td>
                <td className="px-3 py-2 text-muted">{r.son ? formatDate(r.son) : "—"}</td>
                <td className="px-3 py-1 text-right">
                  <form action={crawlNow}>
                    <input type="hidden" name="domain" value={r.domain} />
                    <button type="submit" className="btn min-h-9 px-2 text-[11px]">
                      şimdi tara
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
