"use client";

import { useId, useMemo, useState } from "react";
import { readTable, downloadBlob } from "@/components/audience/readTable";
import { ALAN_AD, autoMap, detectTemplate, SABLON_AD, type Alan, type Mapping, type Sablon } from "@/lib/report/columns";
import { normalizeRows, summarize, type ReportSummary } from "@/lib/report/metrics";
import type { Comment } from "@/lib/report/comment";
import { formatChange, formatMoney, formatNumber, formatPercent, parseTrNumber } from "@/lib/calc/number";
import { quip, situationForMetric } from "@/lib/quips";

const ALANLAR: Alan[] = ["tarih", "boyut", "impression", "klik", "harcama", "gorulebilir", "olculen", "videoBaslama", "videoTamamlama", "donusum", "donusumDegeri", "frekans", "reach"];

export function ReportTool({ aiHazir }: { aiHazir: boolean }) {
  const uid = useId();
  const [onay, setOnay] = useState(false);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [sablon, setSablon] = useState<Sablon>("bilinmiyor");
  const [plan, setPlan] = useState({ butce: "", baslangic: "", bitis: "" });
  const [meta, setMeta] = useState({ kampanya: "", hazirlayan: "" });
  const [yorum, setYorum] = useState<Comment | null>(null);
  const [durum, setDurum] = useState("dosya bekleniyor. XLSX ya da CSV.");
  const [busy, setBusy] = useState(false);

  async function onFile(f?: File) {
    if (!f) return;
    setYorum(null);
    try {
      const r = await readTable(f);
      if (r.length < 2) return setDurum("dosyada veri satırı yok.");
      // başlık satırı: ilk 10 satırda en çok dolu hücreye sahip olan
      let hi = 0;
      r.slice(0, 10).forEach((row, i) => {
        if (row.filter((c) => c.trim()).length > r[hi]!.filter((c) => c.trim()).length) hi = i;
      });
      const header = r[hi]!;
      setRows(r.slice(hi));
      setMap(autoMap(header));
      setSablon(detectTemplate(header));
      setDurum(`${r.length - hi - 1} satır okundu. dosya tarayıcında; sunucuya ham satır gitmez.`);
    } catch {
      setDurum("dosya okunamadı.");
    }
  }

  const sonuc = useMemo(() => {
    if (!rows) return null;
    const n = normalizeRows(rows.slice(1), map);
    const s: ReportSummary = summarize(n.rows, n.duzeltilen, {
      butce: parseTrNumber(plan.butce),
      baslangic: plan.baslangic || null,
      bitis: plan.bitis || null,
    });
    return { s, atlanan: n.atlanan };
  }, [rows, map, plan]);

  async function yorumUret() {
    if (!sonuc) return;
    setBusy(true);
    setDurum("yorum yazılıyor. sayılar sende, yorum modelde.");
    try {
      const res = await fetch("/api/report/yorum", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ozet: sonuc.s }) });
      const j = (await res.json()) as { yorum?: Comment; atilan?: number; hata?: string };
      if (!res.ok || !j.yorum) throw new Error(j.hata ?? "yorum alınamadı");
      setYorum(j.yorum);
      setDurum(j.atilan ? `yorum hazır. olgularda olmayan sayı içeren ${j.atilan} madde atıldı.` : "yorum hazır.");
    } catch (e) {
      setDurum((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    if (!sonuc) return;
    setBusy(true);
    try {
      const res = await fetch("/api/report/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ozet: sonuc.s, yorum, meta: { ...meta, sablon: SABLON_AD[sablon] } }),
      });
      if (!res.ok) throw new Error("PDF üretilemedi");
      downloadBlob(await res.blob(), `${(meta.kampanya || "rapor").replace(/[^\p{L}\p{N}-]+/gu, "-")}-yorum.pdf`, "application/pdf");
    } catch (e) {
      setDurum((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const s = sonuc?.s;
  const k = s?.kpi;
  const kpiRows: [string, string][] = s && k
    ? ([
        ["impression", formatNumber(s.totals.impression ?? 0, 0)],
        ["harcama", s.totals.harcama === null ? "—" : formatMoney(s.totals.harcama)],
        ["CPM", k.cpm === null ? "—" : formatMoney(k.cpm)],
        ["CTR", k.ctr === null ? "—" : formatPercent(k.ctr, 3)],
        ["viewability", k.viewability === null ? "—" : formatPercent(k.viewability, 1)],
        ["vCPM", k.vcpm === null ? "—" : formatMoney(k.vcpm)],
        ["VCR", k.vcr === null ? "—" : formatPercent(k.vcr, 1)],
        ["CPCV", k.cpcv === null ? "—" : formatMoney(k.cpcv)],
        ["CPA", k.cpa === null ? "—" : formatMoney(k.cpa)],
        ["ROAS", k.roas === null ? "—" : formatNumber(k.roas, 2)],
      ] as [string, string][]).filter(([, v]) => v !== "—")
    : [];
  const sit = k ? situationForMetric("viewability", k.viewability) ?? situationForMetric("ctr", k.ctr) : null;

  return (
    <div className="space-y-6">
      <div className="card border-accent/50 p-4 text-sm leading-relaxed">
        <p className="label text-accent">// gizlilik — önce oku</p>
        <ul className="mt-2 space-y-1.5 text-text">
          <li>&gt; Dosyan <strong>tarayıcında</strong> okunur ve hesaplanır. Ham satırlar sunucumuza hiç gönderilmez, diske yazılmaz.</li>
          <li>&gt; &ldquo;Yorum üret&rdquo; dersen yalnızca toplu metrikler (toplamlar, oranlar, en iyi/en kötü satır adları) yapay zekâ modeline (Anthropic API) gider.</li>
          <li>&gt; PDF bellekte üretilir ve sana döner; saklanmaz. Loglara içerik değil, yalnızca sayaç yazılır.</li>
          <li>&gt; Yüklediğin rapor müşteri verisidir: paylaşma yetkin olduğundan emin ol. Ayrıntı: gizlilik sayfası.</li>
        </ul>
        <label className="mt-3 flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Okudum, devam.
        </label>
      </div>

      <div className="card space-y-4 p-4 md:p-6">
        <div>
          <label htmlFor={`${uid}-f`} className="label">
            rapor dosyası (XLSX / CSV)
          </label>
          <input id={`${uid}-f`} type="file" accept=".xlsx,.csv,.txt" disabled={!onay} onChange={(e) => onFile(e.target.files?.[0])} className="input mt-2 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-panel file:px-3 file:py-1 file:text-text disabled:opacity-50" />
        </div>
        <p className="syslog" aria-live="polite">
          {durum}
        </p>
        {rows && (
          <>
            <p className="text-sm text-muted">
              şablon: <span className="text-text">{SABLON_AD[sablon]}</span> · kolon eşlemesini kontrol et; tanınmayan kolonları elle seç.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ALANLAR.map((a) => (
                <div key={a}>
                  <label htmlFor={`${uid}-${a}`} className="label label-en text-[10.5px]">
                    {ALAN_AD[a]}
                  </label>
                  <select
                    id={`${uid}-${a}`}
                    className="input mt-1 min-h-9 py-0 text-xs"
                    value={map[a] ?? -1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMap((m) => {
                        const n = { ...m };
                        if (v < 0) delete n[a];
                        else n[a] = v;
                        return n;
                      });
                      setYorum(null);
                    }}
                  >
                    <option value={-1}>—</option>
                    {rows[0]!.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `kolon ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`${uid}-pb`} className="label">
                  plan bütçe (opsiyonel)
                </label>
                <input id={`${uid}-pb`} className="input mt-1" inputMode="decimal" value={plan.butce} onChange={(e) => setPlan((p) => ({ ...p, butce: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${uid}-ps`} className="label">
                  flight başlangıcı
                </label>
                <input id={`${uid}-ps`} type="date" className="input mt-1" value={plan.baslangic} onChange={(e) => setPlan((p) => ({ ...p, baslangic: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${uid}-pe`} className="label">
                  flight bitişi
                </label>
                <input id={`${uid}-pe`} type="date" className="input mt-1" value={plan.bitis} onChange={(e) => setPlan((p) => ({ ...p, bitis: e.target.value }))} />
              </div>
            </div>
          </>
        )}
      </div>

      {s && s.satir > 0 && (
        <section aria-labelledby="metrikler" className="space-y-4">
          <h2 id="metrikler" className="label">
            // metrikler (formülle hesaplandı, yapay zekâ yok)
          </h2>
          {s.duzeltilen.length > 0 && (
            <p className="card border-accent/50 p-3 text-sm text-accent">▲ Adform 10^15 düzeltmesi uygulandı: {s.duzeltilen.join(", ")} kolonundaki değerler 10^15&apos;e bölündü.</p>
          )}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-5">
            {kpiRows.map(([kk, v]) => (
              <div key={kk} className="bg-panel p-3">
                <dt className="label label-en">{kk}</dt>
                <dd className="num mt-1 font-mono text-base text-text">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="syslog">{sit ? quip(sit, sit.startsWith("viewability") ? formatPercent(k!.viewability!, 1) : formatPercent(k!.ctr!, 3)) : `${s.satir} satır işlendi${sonuc!.atlanan ? `, ${sonuc!.atlanan} toplam/boş satır atlandı` : ""}.`}</p>
          {s.pacing && (
            <p className="card p-3 text-sm text-text">
              pacing: sapma{" "}
              {s.pacing.sapmaYuzde === null ? "—" : <span className={s.pacing.sapmaYuzde < 0 ? "down" : "up"}>{formatChange(s.pacing.sapmaYuzde).text}</span>} · bu hızla dönem sonu{" "}
              {s.pacing.tamamlanmaProjeksiyonu === null ? "—" : formatMoney(s.pacing.tamamlanmaProjeksiyonu)}
            </p>
          )}
          {s.kirilim && s.kirilim.enIyi.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {(["enIyi", "enKotu"] as const).map((key) => (
                <div key={key} className="card p-4">
                  <p className="label">
                    // en {key === "enIyi" ? "iyi" : "kötü"} ({s.kirilim!.olcut.toUpperCase()})
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {s.kirilim![key].map((x) => (
                      <li key={x.ad} className="flex justify-between gap-3">
                        <span className="truncate text-text">{x.ad}</span>
                        <span className="num shrink-0 font-mono text-muted">{s.kirilim!.olcut === "cpa" ? formatMoney(x.cpa!) : formatPercent(x.ctr!, 3)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="card space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-k`} className="label">
                  kampanya adı (PDF kapağı)
                </label>
                <input id={`${uid}-k`} className="input mt-1" value={meta.kampanya} onChange={(e) => setMeta((m) => ({ ...m, kampanya: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${uid}-h`} className="label">
                  hazırlayan
                </label>
                <input id={`${uid}-h`} className="input mt-1" value={meta.hazirlayan} onChange={(e) => setMeta((m) => ({ ...m, hazirlayan: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={yorumUret} disabled={!aiHazir || busy}>
                {yorum ? "yorumu yeniden üret" : "yorum üret"}
              </button>
              <button type="button" className="btn" onClick={pdf} disabled={busy}>
                PDF indir{yorum ? "" : " (yorumsuz)"}
              </button>
            </div>
            {!aiHazir && <p className="syslog">yapay zekâ servisi bu ortamda yapılandırılmadı; PDF yorumsuz üretilir.</p>}
          </div>

          {yorum && (
            <div className="card space-y-4 p-5 text-[15px] leading-relaxed">
              {(
                [
                  ["özet", yorum.ozet],
                  ["neyi iyi yapıyoruz", yorum.iyi],
                  ["nerede para kaçıyor", yorum.paraKacan],
                  ["benchmark", yorum.benchmark],
                  ["önümüzdeki hafta", yorum.aksiyonlar],
                ] as [string, string[]][]
              ).map(([h, items]) =>
                items.length ? (
                  <div key={h}>
                    <p className="label">// {h}</p>
                    <ul className="mt-1 space-y-1">
                      {items.map((x) => (
                        <li key={x} className="flex gap-2">
                          <span aria-hidden="true" className="font-mono text-accent">
                            &gt;
                          </span>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              {yorum.patron.length > 0 && (
                <div>
                  <p className="label">// patron bunu soracak</p>
                  {yorum.patron.map((q) => (
                    <p key={q.soru} className="mt-2">
                      <strong>{q.soru}</strong> {q.cevap}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
