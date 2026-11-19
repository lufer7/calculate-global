"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState } from "react";
import { formatMoney, formatNumber, formatPercent, parseTrNumber } from "@/lib/calc/number";
import {
  budgetFromImpressions,
  combineChannels,
  estimateReach,
  frequencyTradeoff,
  impressionsForReach,
  impressionsFromBudget,
  reachCurve,
  type ReachParams,
} from "@/lib/calc/reach";
import { quip } from "@/lib/quips";
import { formatDate } from "@/lib/format-date";
import { IconCheck, IconLink } from "@/components/icons";
import { useCopyLink, useInitialParams, writeParams } from "@/components/hesapla/useShareUrl";
import { SavePreset } from "@/components/account/SavePreset";
import type { ReachSetting, UniverseRef } from "@/lib/reach/queries";

const ReachChart = dynamic(() => import("./ReachChart").then((m) => m.ReachChart), {
  ssr: false,
  loading: () => <div className="card h-72 animate-pulse" aria-hidden="true" />,
});

const KANALLAR = [
  { k: "genel", ad: "Genel" },
  { k: "display", ad: "Display" },
  { k: "video", ad: "Video" },
  { k: "ctv", ad: "CTV" },
] as const;
type Kanal = (typeof KANALLAR)[number]["k"];

function paramsFor(settings: Record<string, ReachSetting>, kanal: string): ReachParams {
  const s = settings[kanal] ?? settings.genel;
  return s ? { r: s.r, erisilebilirOran: s.erisilebilirOran } : {};
}

function Input({ id, label, value, onChange, ph, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; ph?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label label-en">
        {label}
      </label>
      <input id={id} inputMode="decimal" autoComplete="off" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} className="input mt-2 text-base" aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && (
        <p id={`${id}-h`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ReachTool({ refs, settings }: { refs: UniverseRef[]; settings: Record<string, ReachSetting> }) {
  const uid = useId();
  const initial = useInitialParams();
  const { copied, copy } = useCopyLink();
  const [mod, setMod] = useState<"butce" | "reach">("butce");
  const [refId, setRefId] = useState<string>("");
  const [manualU, setManualU] = useState("");
  const [kanal, setKanal] = useState<Kanal>("genel");
  const [butce, setButce] = useState("");
  const [cpm, setCpm] = useState("");
  const [frekans, setFrekans] = useState("3");
  const [hedefKisi, setHedefKisi] = useState("");
  const [cok, setCok] = useState({ display: ["", ""], video: ["", ""], ctv: ["", ""] } as Record<"display" | "video" | "ctv", [string, string]>);
  const [cakisma, setCakisma] = useState("30");

  useEffect(() => {
    if (!initial) return;
    const g = (k: string) => initial.get(k) ?? "";
    if (g("mod") === "reach") setMod("reach");
    if (g("ref")) setRefId(g("ref"));
    setManualU(g("u"));
    const k = g("kanal");
    if (KANALLAR.some((x) => x.k === k)) setKanal(k as Kanal);
    setButce(g("b"));
    setCpm(g("cpm"));
    if (g("f")) setFrekans(g("f"));
    setHedefKisi(g("hk"));
  }, [initial]);

  useEffect(() => {
    if (!initial) return;
    writeParams({ mod: mod === "reach" ? "reach" : "", ref: refId, u: refId ? "" : manualU, kanal: kanal === "genel" ? "" : kanal, b: butce, cpm, f: frekans === "3" ? "" : frekans, hk: hedefKisi });
  }, [initial, mod, refId, manualU, kanal, butce, cpm, frekans, hedefKisi]);

  const ref = refs.find((r) => String(r.id) === refId);
  const universe = ref ? ref.buyukluk : parseTrNumber(manualU);
  const params = useMemo(() => paramsFor(settings, kanal), [settings, kanal]);
  const ayar = settings[kanal] ?? settings.genel;
  const n = Math.max(1, Math.round(parseTrNumber(frekans) ?? 3));
  const b = parseTrNumber(butce);
  const c = parseTrNumber(cpm);
  const hk = parseTrNumber(hedefKisi);

  const sonuc = useMemo(() => {
    if (!universe || universe <= 0 || !c) return null;
    if (mod === "butce") {
      if (b === null) return null;
      const imp = impressionsFromBudget(b, c);
      if (imp === null) return null;
      const esikler = Array.from(new Set([1, 2, 3, 5, 10, n])).sort((x, y) => x - y);
      const est = estimateReach(imp, universe, params, esikler);
      if (!est) return null;
      const doymaButce = budgetFromImpressions(est.doymaImpression, c);
      const maxB = Math.max(b * 2, (doymaButce ?? b) * 1.3);
      const curve = reachCurve(maxB, c, universe, n, params, 48);
      const trade = frequencyTradeoff(b, c, universe, n, n * 2, params);
      return { tip: "butce" as const, imp, est, doymaButce, curve, trade };
    }
    if (hk === null) return null;
    const imp = impressionsForReach(hk, n, universe, params);
    return { tip: "reach" as const, imp, butceGerekli: imp === null ? null : budgetFromImpressions(imp, c) };
  }, [universe, c, mod, b, n, params, hk]);

  const coklu = useMemo(() => {
    if (!universe || universe <= 0) return null;
    const rows = (["display", "video", "ctv"] as const)
      .map((k) => ({ ad: k, butce: parseTrNumber(cok[k][0]), cpm: parseTrNumber(cok[k][1]), params: paramsFor(settings, k) }))
      .filter((r): r is { ad: "display" | "video" | "ctv"; butce: number; cpm: number; params: ReachParams } => r.butce !== null && r.cpm !== null && r.cpm > 0);
    const o = parseTrNumber(cakisma);
    if (rows.length < 2 || o === null) return null;
    return combineChannels(rows, universe, Math.min(100, Math.max(0, o)) / 100);
  }, [universe, cok, cakisma, settings]);

  let sistem: string;
  if (!universe) sistem = refs.length ? "universe seç ya da kendin gir." : "universe referans tablosu boş. hedef kitle büyüklüğünü sen gir — biz sayı uydurmuyoruz.";
  else if (!sonuc) sistem = quip("bos_form");
  else if (sonuc.tip === "butce" && sonuc.est.ortalamaFrekans !== null && sonuc.est.ortalamaFrekans >= 10)
    sistem = quip("frekans_yuksek", formatNumber(sonuc.est.ortalamaFrekans, 1));
  else if (sonuc.tip === "butce" && sonuc.est.doymaGecildi) sistem = "doyma noktası geçildi. ek bütçe yeni kişiden çok aynı kişilere gidiyor.";
  else if (sonuc.tip === "reach" && sonuc.imp === null) sistem = "bu hedef, erişilebilir kitlenin tavanında ya da üstünde. ya hedefi düşür ya universe'ü kontrol et.";
  else sistem = "tahmin hazır. DSP forecast'iyle karşılaştırmayı unutma.";

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor={`${uid}-ref`} className="label">
              hedef kitle büyüklüğü (universe)
            </label>
            <select id={`${uid}-ref`} className="input mt-2" value={refId} onChange={(e) => setRefId(e.target.value)}>
              <option value="">{refs.length ? "— elle gir —" : "referans yok — elle gir"}</option>
              {refs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.tanim} · {formatNumber(r.buyukluk, 0)} · {r.kaynak}
                </option>
              ))}
            </select>
            {ref ? (
              <p className="mt-1.5 text-xs text-muted">
                kaynak: {ref.kaynakUrl ? (
                  <a href={ref.kaynakUrl} target="_blank" rel="noopener noreferrer" className="text-info underline">
                    {ref.kaynak}
                  </a>
                ) : (
                  ref.kaynak
                )}{" "}
                · {formatDate(ref.tarih)}
              </p>
            ) : (
              <input
                aria-label="Universe (kişi)"
                inputMode="decimal"
                className="input mt-2"
                placeholder="örn. 12.000.000"
                value={manualU}
                onChange={(e) => setManualU(e.target.value)}
              />
            )}
          </div>
          <div>
            <label htmlFor={`${uid}-kanal`} className="label">
              kanal (model ayarı)
            </label>
            <select id={`${uid}-kanal`} className="input mt-2" value={kanal} onChange={(e) => setKanal(e.target.value as Kanal)}>
              {KANALLAR.map((k) => (
                <option key={k.k} value={k.k}>
                  {k.ad}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">
              {ayar
                ? `${ayar.r ? `yoğunlaşma r=${formatNumber(ayar.r, 2)}` : "Poisson"} · erişilebilir ${formatPercent(ayar.erisilebilirOran * 100, 0)}`
                : "Poisson, tam erişilebilirlik (admin ayarı yok)"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded border border-border bg-bg p-1" role="radiogroup" aria-label="Hesap yönü">
          {(
            [
              ["butce", "Bütçeden reach'e"],
              ["reach", "Reach'ten bütçeye"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={`flex min-h-11 cursor-pointer items-center justify-center rounded font-mono text-[12.5px] ${mod === v ? "bg-accent font-semibold text-bg" : "text-muted hover:text-text"}`}>
              <input type="radio" name={`${uid}-mod`} value={v} checked={mod === v} onChange={() => setMod(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {mod === "butce" ? (
            <Input id={`${uid}-b`} label="Bütçe (₺)" value={butce} onChange={setButce} ph="500.000" />
          ) : (
            <Input id={`${uid}-hk`} label="Hedef tekil kişi" value={hedefKisi} onChange={setHedefKisi} ph="3.000.000" />
          )}
          <Input id={`${uid}-cpm`} label="CPM (₺)" value={cpm} onChange={setCpm} ph="25" />
          <Input id={`${uid}-f`} label="Hedef frekans (n+)" value={frekans} onChange={setFrekans} ph="3" hint="kişi başı en az kaç gösterim" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="syslog" aria-live="polite">
            {sistem}
          </p>
          <div className="flex flex-wrap gap-2">
          <SavePreset arac="reach-tahmin" varsayilanAd="Reach senaryosu" />
          <button type="button" onClick={copy} className="btn">
            {copied ? <IconCheck className="h-4 w-4 text-up" /> : <IconLink className="h-4 w-4" />}
            {copied ? "kopyalandı" : "linki kopyala"}
          </button>
          </div>
        </div>
      </div>

      {sonuc?.tip === "butce" && universe && (
        <>
          <section aria-labelledby="reach-tablo" className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="card overflow-hidden">
              <h2 id="reach-tablo" className="label border-b border-border px-4 py-3">
                // frekans dağılımı
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="px-4 py-2 font-normal">frekans</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">tekil kişi</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">universe %</th>
                  </tr>
                </thead>
                <tbody>
                  {sonuc.est.reach.map((r) => (
                    <tr key={r.n} className={`border-t border-border-dim ${r.n === n ? "bg-accent/5" : ""}`}>
                      <th scope="row" className="num px-4 py-2 text-left font-normal text-text">
                        {r.n}+{r.n === n && <span className="ml-2 text-xs text-accent">hedef</span>}
                      </th>
                      <td className="num px-4 py-2 text-right">{formatNumber(r.kisi, 0)}</td>
                      <td className="num px-4 py-2 text-right">{formatPercent(r.yuzde, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="grid grid-cols-2 gap-px border-t border-border bg-border text-sm">
                {[
                  ["impression", formatNumber(sonuc.imp, 0)],
                  ["ort. frekans", sonuc.est.ortalamaFrekans === null ? "—" : formatNumber(sonuc.est.ortalamaFrekans, 2)],
                  ["doyma bütçesi", sonuc.doymaButce === null ? "—" : formatMoney(sonuc.doymaButce, "TRY", 0)],
                  ["yeni kişi olasılığı", formatPercent(sonuc.est.marjinalYeniErisim * 100, 1)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-panel px-4 py-2.5">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="num mt-0.5 font-mono text-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ReachChart data={sonuc.curve} n={n} doymaButce={sonuc.doymaButce} butce={b ?? 0} universe={universe} />
          </section>
          {sonuc.trade && (
            <p className="card p-4 text-[15px] leading-relaxed text-text">
              <span className="label mr-2">// yorum</span>
              Aynı bütçeyle frekans {n} yerine {n * 2} hedeflersen, {n * 2}+ gören kişi {formatNumber(sonuc.trade.reachB, 0)} olur:{" "}
              <strong className="text-down">▼ {formatNumber(sonuc.trade.ayniButceFark, 0)} kişi daha az</strong>.{" "}
              {sonuc.trade.ekButce !== null ? (
                <>
                  Aynı {formatNumber(sonuc.trade.reachA, 0)} kişiye {n * 2}+ ile ulaşmak için ise{" "}
                  <strong className="text-accent">{formatMoney(sonuc.trade.ekButce, "TRY", 0)} daha</strong> harcaman gerekir. Kullanıcı seni
                  hatırlayacak; bütçe de seni hatırlayacak.
                </>
              ) : (
                <>Aynı kişi sayısına {n * 2}+ ile ulaşmak bu universe'te mümkün görünmüyor.</>
              )}
            </p>
          )}
        </>
      )}

      {sonuc?.tip === "reach" && (
        <div className="card grid gap-px overflow-hidden bg-border sm:grid-cols-2">
          {[
            ["gereken impression", sonuc.imp === null ? "ulaşılamaz" : formatNumber(sonuc.imp, 0)],
            ["gereken bütçe", sonuc.butceGerekli == null ? "—" : formatMoney(sonuc.butceGerekli, "TRY", 0)],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel p-4">
              <p className="label">{k}</p>
              <p className="num mt-2 font-mono text-2xl text-accent">{v}</p>
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="coklu" className="card space-y-4 p-4 md:p-6">
        <h2 id="coklu" className="label">
          // çoklu kanal senaryosu
        </h2>
        <p className="text-sm text-muted">En az iki kanal gir. Çakışma oranı senin varsayımın: küçük kanalların kitlesinin büyük kanalla ne kadar örtüştüğü.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(["display", "video", "ctv"] as const).map((k) => (
            <fieldset key={k} className="space-y-3 rounded border border-border-dim p-3">
              <legend className="px-1 font-mono text-xs tracking-widest text-accent">{k.toUpperCase()}</legend>
              <Input id={`${uid}-${k}-b`} label="Bütçe (₺)" value={cok[k][0]} onChange={(v) => setCok((s) => ({ ...s, [k]: [v, s[k][1]] }))} />
              <Input id={`${uid}-${k}-c`} label="CPM (₺)" value={cok[k][1]} onChange={(v) => setCok((s) => ({ ...s, [k]: [s[k][0], v] }))} />
            </fieldset>
          ))}
        </div>
        <div className="max-w-xs">
          <Input id={`${uid}-cak`} label="Çakışma varsayımı (%)" value={cakisma} onChange={setCakisma} hint="0 = hiç çakışma yok · 100 = tamamen aynı kitle" />
        </div>
        {coklu ? (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-sm">
              <tbody>
                {coklu.kanallar.map((k) => (
                  <tr key={k.ad} className="border-b border-border-dim">
                    <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                      {k.ad === "ctv" ? "CTV" : k.ad} 1+ reach
                    </th>
                    <td className="num px-3 py-2 text-right">{formatNumber(k.reach, 0)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border-dim bg-accent/5">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-text">
                    birleşik reach (senin varsayımın)
                  </th>
                  <td className="num px-3 py-2 text-right text-accent">
                    {formatNumber(coklu.birlesik, 0)} · {formatPercent((coklu.birlesik / universe!) * 100, 1)}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                    referans: rastgele çakışma (Sainsbury)
                  </th>
                  <td className="num px-3 py-2 text-right">{formatNumber(coklu.rastgele, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="syslog">iki kanal ve universe gerekli.</p>
        )}
      </section>
    </div>
  );
}
