import Link from "next/link";
import { getTickerData, FORMAT_ETIKET } from "@/lib/cpm/queries";
import { formatChange, formatMoney } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import type { CPM_FORMATLAR } from "@/db/schema";

/**
 * CPM şeridi. Katman A (public benchmark × editöryel Türkiye katsayısı).
 * "Canlı" / "gerçek zamanlı" ifadesi YOK (§4.1 Kural 2): "tahmini CPM bandı".
 */
export async function CpmTicker() {
  const data = await getTickerData();
  const hucreler = data.durum === "ok" ? data.hucreler : [];
  const hasAny = hucreler.some((h) => h.durum === "ok");

  return (
    <div className="border-t border-border-dim bg-bg-alt">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-1.5 [scrollbar-width:none]">
        <Link href="/hesapla/cpm#tahmini-bant" className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-accent">
          // tahmini CPM bandı
        </Link>
        {!hasAny ? (
          <span className="shrink-0 font-mono text-xs text-muted">
            veri bekleniyor<span className="caret text-accent">_</span>
          </span>
        ) : (
          <ul className="flex shrink-0 items-center gap-5">
            {hucreler.map((h) => {
              const etiket = FORMAT_ETIKET[h.format as (typeof CPM_FORMATLAR)[number]] ?? h.format.toUpperCase();
              if (h.durum !== "ok") {
                return (
                  <li key={h.format} className="font-mono text-xs text-muted">
                    <span className="text-text">{etiket}</span> veri yok
                  </li>
                );
              }
              const ch = h.degisimTl != null ? formatChange(h.degisimTl) : null;
              const chSrc = h.degisimKaynak != null ? formatChange(h.degisimKaynak) : null;
              const para = h.bantlar[0]?.paraBirimi ?? "USD";
              return (
                <li
                  key={h.format}
                  className="num whitespace-nowrap font-mono text-xs"
                  title={chSrc ? `${para} bazında ${chSrc.text}` : undefined}
                >
                  <span className="text-text">{etiket}</span>{" "}
                  <span className="text-text">
                    {formatMoney(h.tlMin!, "TRY")}–{formatMoney(h.tlMax!, "TRY")}
                  </span>{" "}
                  {ch && <span className={ch.direction === "up" ? "up" : ch.direction === "down" ? "down" : "text-muted"}>{ch.text}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {data.durum === "ok" && data.sonGuncelleme && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">son güncelleme: {formatDate(data.sonGuncelleme)}</span>
        )}
      </div>
    </div>
  );
}
