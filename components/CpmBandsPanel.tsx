import { getTickerData, FORMAT_ETIKET } from "@/lib/cpm/queries";
import { formatChange, formatMoney, formatNumber, formatPercent } from "@/lib/calc/number";
import { formatDate, formatDonem } from "@/lib/format-date";
import { CPM_FORMATLAR } from "@/db/schema";
import Link from "next/link";
import { cellId, getFormatCells } from "@/lib/cpm/community-queries";

function Change({ v, label }: { v: number | null | undefined; label: string }) {
  if (v == null) return <span className="text-muted">{label}: önceki dönem yok</span>;
  const c = formatChange(v);
  return (
    <span>
      {label} <span className={c.direction === "up" ? "up" : c.direction === "down" ? "down" : "text-muted"}>{c.text}</span>
    </span>
  );
}

/**
 * Tahmini CPM bandı detayı. Kural 2: her değerin yanında kaynak, Türkiye katsayısı
 * (editöryel tahmin) ve metot notu görünür. Kural 1: TL ve kaynak para birimi değişimi ayrı.
 */
export async function CpmBandsPanel() {
  const [data, cells] = await Promise.all([getTickerData(), getFormatCells().catch(() => new Map())]);
  const hucreler = data.durum === "ok" ? data.hucreler : CPM_FORMATLAR.map((f) => ({ format: f, durum: "veri_yok" as const, bantlar: [] }));

  return (
    <section id="tahmini-bant" aria-labelledby="tahmini-bant-baslik" className="scroll-mt-32">
      <h2 id="tahmini-bant-baslik" className="label">
        // tahmini CPM bandı · Türkiye · açık artırma
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Public benchmark × Türkiye düzeltme katsayısı. Katsayı editöryel bir tahmindir ve öyle etiketlidir. Tek sayı
        değil bant gösteriyoruz; güvenmediğimiz hücre boş kalır. Kendi DSP forecast&apos;in her zaman daha doğrudur.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {hucreler.map((h) => {
          const etiket = FORMAT_ETIKET[h.format as (typeof CPM_FORMATLAR)[number]];
          const c = cells.get(cellId({ format: h.format }));
          return (
            <li key={h.format} className="card p-4">
              {c && (
                <p className={`mb-2 flex items-baseline justify-between gap-3 ${c.birincil ? "" : "text-muted"}`}>
                  <span className="font-mono text-[11px] uppercase tracking-widest">{c.birincil ? "topluluk medyanı" : "topluluk (ikincil)"}</span>
                  <span className={`num font-mono ${c.birincil ? "text-lg text-up" : "text-sm"}`}>{formatMoney(c.medyan)}</span>
                </p>
              )}
              {c && (
                <p className="mb-2 font-mono text-[11px] text-muted">
                  P25–P75 {formatMoney(c.p25)}–{formatMoney(c.p75)} · {c.girdi} girdi · {c.katkici} katkıcı
                  {c.birincil ? " · aşağıdaki benchmark karşılaştırma içindir" : ""}
                </p>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm font-semibold tracking-wide text-text">{etiket}</span>
                {h.durum === "ok" ? (
                  <span className="num font-mono text-lg text-accent">
                    {formatMoney(h.tlMin!)}–{formatMoney(h.tlMax!)}
                  </span>
                ) : (
                  <span className="font-mono text-sm text-muted">veri yok</span>
                )}
              </div>
              {h.durum === "ok" && (
                <>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
                    <Change v={h.degisimTl} label="TL bazında" />
                    <span aria-hidden="true" className="text-muted">·</span>
                    <Change v={h.degisimKaynak} label={`${h.bantlar[0]!.paraBirimi} bazında`} />
                  </p>
                  <ul className="mt-3 space-y-2 border-t border-border-dim pt-3">
                    {h.bantlar.map((b) => (
                      <li key={b.kaynakAdi} className="text-xs leading-relaxed text-muted">
                        Kaynak: <span className="text-text">{b.kaynakAdi}</span>, {formatDonem(b.donem)} · Türkiye
                        düzeltmesi: ×{formatNumber(b.katsayi, 2, 2)} (editöryel tahmin) · Metot: {b.metotNotu}
                        <br />
                        <span className="num">
                          kur: 1 {b.paraBirimi} = {formatNumber(b.kurDegeri, 4, 2)} TL · {b.kurKaynagi} · {formatDate(b.kurTarihi)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {h.durum === "tutarsiz" && (
                <p className="mt-2 text-xs text-muted">
                  Kaynaklar arası sapma {h.sapma != null ? formatPercent(h.sapma * 100, 0) : "yüksek"}; eşik aşıldığı için
                  sayı yayınlanmıyor.
                </p>
              )}
              {h.durum === "veri_yok" && (
                <p className="mt-2 text-xs text-muted">Bu hücre için yayınlanabilir benchmark ya da Türkiye katsayısı henüz girilmedi.</p>
              )}
            </li>
          );
        })}
      </ul>
      {data.durum === "ok" && data.sonGuncelleme && <p className="syslog mt-3">son güncelleme: {formatDate(data.sonGuncelleme)}</p>}
      <p className="mt-3 text-sm text-muted">
        Gördüğün CPM&apos;i anonim paylaş, topluluk medyanı büyüsün:{" "}
        <Link href="/topluluk" className="text-accent underline underline-offset-2">
          topluluk CPM&apos;i
        </Link>
      </p>
    </section>
  );
}
