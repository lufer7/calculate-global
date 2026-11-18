"use client";

import { useId, useState } from "react";
import { buildAudienceWorkbook, buildKeywordWorkbook } from "@/lib/audience/excel";
import { KAMPANYA_TIPI_AD, type KampanyaTipi } from "@/lib/audience/prompt";
import type { AudienceResult } from "@/lib/audience/schema";
import { DSP_AD, type Dsp, type Segment } from "@/lib/audience/segments";
import { formatMoney } from "@/lib/calc/number";
import { downloadBlob } from "./readTable";
import { SegmentUpload } from "./SegmentUpload";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function AudienceTool({ aiHazir }: { aiHazir: boolean }) {
  const uid = useId();
  const [brief, setBrief] = useState("");
  const [dspler, setDspler] = useState<Dsp[]>(["adform", "amazon"]);
  const [tip, setTip] = useState<KampanyaTipi>("performans");
  const [butce, setButce] = useState("");
  const [donem, setDonem] = useState("");
  const [segments, setSegments] = useState<Partial<Record<Dsp, Segment[]>>>({});
  const [durum, setDurum] = useState<"bos" | "calisiyor" | "hata" | "tamam">("bos");
  const [mesaj, setMesaj] = useState("");
  const [sonuc, setSonuc] = useState<AudienceResult | null>(null);

  const listeVar = dspler.some((d) => (segments[d]?.length ?? 0) > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDurum("calisiyor");
    setSonuc(null);
    setMesaj("brief okunuyor, segmentler taranıyor. bu bir dakika sürebilir.");
    try {
      const res = await fetch("/api/audience", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief,
          dspler,
          kampanyaTipi: tip,
          pazar: "Türkiye",
          butce: butce || null,
          donem: donem || null,
          segments: Object.fromEntries(dspler.map((d) => [d, segments[d] ?? []])),
        }),
      });
      const j = (await res.json()) as { sonuc?: AudienceResult; hata?: string };
      if (!res.ok || !j.sonuc) throw new Error(j.hata ?? "bilinmeyen hata");
      setSonuc(j.sonuc);
      setDurum("tamam");
      setMesaj(listeVar ? "hazır. Excel'ler aşağıda." : "segment listesi yüklenmediği için yalnızca keyword listesi ve strateji üretildi. segment adı uydurmuyoruz.");
    } catch (err) {
      setDurum("hata");
      setMesaj((err as Error).message);
    }
  }

  async function dlKeywords() {
    if (!sonuc) return;
    const ExcelJS = (await import("exceljs")).default;
    downloadBlob(await buildKeywordWorkbook(ExcelJS, sonuc.keywords), "keyword-listesi.xlsx", XLSX);
  }
  async function dl3p() {
    if (!sonuc) return;
    const ExcelJS = (await import("exceljs")).default;
    downloadBlob(await buildAudienceWorkbook(ExcelJS, sonuc, dspler), "hedef-kitle-calismasi.xlsx", XLSX);
  }

  return (
    <div className="space-y-6">
      <div className="card border-accent/50 p-4 text-sm leading-relaxed">
        <p className="label text-accent">// verin nereye gidiyor</p>
        <p className="mt-2 text-text">
          Segment dosyaların <strong>tarayıcında</strong> okunur; sunucuya yalnızca kitle adı, sağlayıcı, CPM, reach ve id kolonları gider. Brief ve
          bu liste, kitle seçimi için yapay zekâ modeline (Anthropic API) gönderilir; istek bitince sunucuda tutulmaz, veritabanına ve loglara
          yazılmaz. Müşteri adı veya gizli bilgi içeren brief yapıştırmamaya özen göster.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-4 md:p-6">
        <div>
          <label htmlFor={`${uid}-brief`} className="label">
            brief
          </label>
          <textarea
            id={`${uid}-brief`}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={7}
            required
            minLength={20}
            placeholder="Ürün, hedef kitle, kampanya amacı, kısıtlar..."
            className="input mt-2 py-2 font-body text-[15px] leading-relaxed"
          />
          <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="file"
              accept=".txt,.md"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setBrief((await f.text()).slice(0, 20_000));
              }}
            />
            <span className="btn min-h-9 px-3 text-xs">.txt dosyasından yükle</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset>
            <legend className="label">DSP</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(DSP_AD) as Dsp[]).map((d) => (
                <label key={d} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 font-mono text-xs ${dspler.includes(d) ? "border-accent text-accent" : "border-border text-muted"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={dspler.includes(d)}
                    onChange={(e) => setDspler((s) => (e.target.checked ? [...s, d] : s.filter((x) => x !== d)))}
                  />
                  {DSP_AD[d]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">kampanya tipi</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(KAMPANYA_TIPI_AD) as KampanyaTipi[]).map((t) => (
                <label key={t} className={`inline-flex min-h-11 cursor-pointer items-center rounded border px-3 font-mono text-xs ${tip === t ? "border-accent text-accent" : "border-border text-muted"}`}>
                  <input type="radio" name={`${uid}-tip`} className="sr-only" checked={tip === t} onChange={() => setTip(t)} />
                  {KAMPANYA_TIPI_AD[t]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-pazar`} className="label">
              pazar
            </label>
            <select id={`${uid}-pazar`} className="input mt-2" defaultValue="Türkiye" disabled>
              <option>Türkiye</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-butce`} className="label">
              bütçe (opsiyonel)
            </label>
            <input id={`${uid}-butce`} className="input mt-2" value={butce} onChange={(e) => setButce(e.target.value)} placeholder="500.000 TL" />
          </div>
          <div>
            <label htmlFor={`${uid}-donem`} className="label">
              dönem (opsiyonel)
            </label>
            <input id={`${uid}-donem`} className="input mt-2" value={donem} onChange={(e) => setDonem(e.target.value)} placeholder="Ocak-Şubat" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted">
            DSP&apos;nden aldığın segment export&apos;unu (CSV/XLSX) yükle. Liste yoksa sistem segment adı uydurmaz; yalnızca keyword listesi ve hedefleme
            stratejisi üretir.
          </p>
          {dspler.map((d) => (
            <SegmentUpload key={d} dsp={d} onChange={(s) => setSegments((x) => ({ ...x, [d]: s }))} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="syslog" aria-live="polite">
            {!aiHazir ? "yapay zekâ servisi bu ortamda yapılandırılmadı." : mesaj || (listeVar ? "hazır olunca çalıştır." : "segment listesi yükle — yoksa yalnızca keyword + strateji.")}
          </p>
          <button type="submit" className="btn btn-primary" disabled={!aiHazir || durum === "calisiyor" || dspler.length === 0 || brief.trim().length < 20}>
            {durum === "calisiyor" ? "çalışıyor..." : "kitle çalışmasını üret"}
          </button>
        </div>
      </form>

      {sonuc && (
        <section aria-labelledby="sonuc" className="space-y-4">
          <h2 id="sonuc" className="label">
            // sonuç
          </h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={dlKeywords}>
              Keyword Excel ({sonuc.keywords.length})
            </button>
            {listeVar && (
              <button type="button" className="btn btn-primary" onClick={dl3p}>
                3P hedef kitle Excel
              </button>
            )}
          </div>
          <details className="card p-4">
            <summary className="cursor-pointer font-mono text-sm text-text">hedefleme stratejisi</summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{sonuc.strateji}</p>
          </details>
          {dspler.map((d) =>
            sonuc.sheets[d]?.length ? (
              <details key={d} className="card p-4">
                <summary className="cursor-pointer font-mono text-sm text-text">
                  {DSP_AD[d]} · {sonuc.sheets[d]!.length} segment · ort. data CPM{" "}
                  {sonuc.ortalamaDataCpm[d] == null ? "—" : formatMoney(sonuc.ortalamaDataCpm[d]!)}
                </summary>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {sonuc.sheets[d]!.map((r) => (
                    <li key={r.kitleAdi} className="text-muted">
                      <span className="text-accent">{r.grup}</span> · <span className="text-text">{r.kitleAdi}</span> — {r.secimNedeni}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null,
          )}
        </section>
      )}
    </div>
  );
}
