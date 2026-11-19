import "server-only";
import path from "node:path";
import { Document, Font, G, Line, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatNumber, formatPercent } from "@/lib/calc/number";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Comment } from "./comment";
import type { ReportSummary, TrendNokta } from "./metrics";

/**
 * PDF raporu (§M7.5). Türkçe karakterler (ğ ş ı İ) için Inter ve JetBrains Mono TTF dosyaları
 * GÖMÜLÜ — varsayılan Helvetica ı/İ'de kırılır. JetBrains Mono'da ₺ glifi olmadığı için
 * para birimi "TL" soneki ile yazılır. JetBrains Mono'nun "//" gibi ligatürleri react-pdf font motorunu
 * çökerttiği için etiketler Inter ile yazılır; JBM yalnızca sayılarda kullanılır.
 */
const FONT_DIR = path.join(process.cwd(), "node_modules/@expo-google-fonts");
let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "inter/400Regular/Inter_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "inter/600SemiBold/Inter_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "inter/700Bold/Inter_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "JBM",
    fonts: [
      { src: path.join(FONT_DIR, "jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  registered = true;
}

const C = { bg: "#FFFFFF", ink: "#0A0C10", muted: "#5C6578", border: "#D9DEE7", accent: "#C47F00", accentFill: "#FFB224", info: "#2F6FD6", up: "#0F8A55", down: "#C8283B", band: "#F4F6FA" };

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: C.ink, padding: 40, backgroundColor: C.bg },
  label: { fontFamily: "Inter", fontWeight: 600, fontSize: 7.5, letterSpacing: 0.8, color: C.muted },
  h1: { fontSize: 26, fontWeight: 700, marginTop: 8 },
  h2: { fontFamily: "Inter", fontWeight: 700, fontSize: 9, letterSpacing: 0.8, color: C.accent, marginTop: 18, marginBottom: 6 },
  p: { fontSize: 10, lineHeight: 1.5 },
  li: { flexDirection: "row", marginBottom: 4 },
  bullet: { fontFamily: "JBM", color: C.accent, width: 12 },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  td: { flex: 1, padding: 6 },
  num: { fontFamily: "JBM", fontSize: 10 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontFamily: "Inter", fontSize: 7, color: C.muted },
});

const U = (x: string) => x.toLocaleUpperCase("tr-TR");
const tl = (x: number | null, d = 2) => (x === null ? "—" : `${formatNumber(x, d, d)} TL`);
const pc = (x: number | null, d = 2) => (x === null ? "—" : formatPercent(x, d));
const nn = (x: number | null, d = 0) => (x === null ? "—" : formatNumber(x, d));

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={s.li} wrap={false}>
          <Text style={s.bullet}>&gt;</Text>
          <Text style={[s.p, { flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Basit çubuk grafik (harcama) + CTR çizgisi, tek eksen değil: CTR ayrı küçük grafikte (çift eksen yok). */
function BarChart({ data, value, label, color }: { data: TrendNokta[]; value: (d: TrendNokta) => number | null; label: string; color: string }) {
  const W = 515;
  const H = 110;
  const pad = { l: 4, r: 4, t: 8, b: 16 };
  const vals = data.map(value);
  const max = Math.max(...vals.map((v) => v ?? 0), 0);
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  return (
    <View wrap={false} style={{ marginTop: 6 }}>
      <Text style={s.label}>{U(label)}</Text>
      <Svg width={W} height={H} style={{ marginTop: 4 }}>
        <Line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke={C.border} strokeWidth={1} />
        {max > 0 &&
          data.map((d, i) => {
            const v = vals[i] ?? 0;
            const h = ((H - pad.t - pad.b) * v) / max;
            return <Rect key={d.donem} x={pad.l + i * bw + 1} y={H - pad.b - h} width={Math.max(1, bw - 2)} height={h} fill={color} />;
          })}
        <G>
          <Text x={pad.l} y={H - 4} style={{ fontSize: 6, fontFamily: "JBM" }} fill={C.muted}>
            {data[0]?.donem ?? ""}
          </Text>
          <Text x={W - pad.r - 40} y={H - 4} style={{ fontSize: 6, fontFamily: "JBM" }} fill={C.muted}>
            {data.at(-1)?.donem ?? ""}
          </Text>
        </G>
      </Svg>
      <Text style={s.label}>en yüksek: {label.includes("CTR") ? pc(max, 3) : tl(max, 0)}</Text>
    </View>
  );
}

function LineChart({ data, value, label }: { data: TrendNokta[]; value: (d: TrendNokta) => number | null; label: string }) {
  const W = 515;
  const H = 90;
  const pts = data.map((d, i) => ({ i, v: value(d) })).filter((p): p is { i: number; v: number } => p.v !== null);
  if (pts.length < 2) return null;
  const max = Math.max(...pts.map((p) => p.v));
  const min = Math.min(...pts.map((p) => p.v));
  const x = (i: number) => 4 + (i * (W - 8)) / Math.max(1, data.length - 1);
  const y = (v: number) => (max === min ? H / 2 : 8 + ((max - v) * (H - 24)) / (max - min));
  const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={s.label}>{U(label)}</Text>
      <Svg width={W} height={H} style={{ marginTop: 4 }}>
        <Line x1={4} y1={H - 16} x2={W - 4} y2={H - 16} stroke={C.border} strokeWidth={1} />
        <Path d={d} stroke={C.info} strokeWidth={2} fill="none" />
      </Svg>
      <Text style={s.label}>
        aralık: {pc(min, 3)} – {pc(max, 3)}
      </Text>
    </View>
  );
}

export type PdfMeta = { kampanya: string; hazirlayan: string; sablon: string };

function ReportDoc({ sum, yorum, meta }: { sum: ReportSummary; yorum: Comment | null; meta: PdfMeta }) {
  const t = sum.totals;
  const k = sum.kpi;
  const trendData = sum.gunluk.length > 1 ? sum.gunluk : sum.haftalik;
  const rows: [string, string][] = [
    ["IMPRESSION", nn(t.impression)],
    ["KLİK", nn(t.klik)],
    ["HARCAMA", tl(t.harcama)],
    ["CPM", tl(k.cpm)],
    ["CTR", pc(k.ctr, 3)],
    ["CPC", tl(k.cpc)],
    ["VIEWABILITY", pc(k.viewability, 1)],
    ["vCPM", tl(k.vcpm)],
    ["VCR", pc(k.vcr, 1)],
    ["CPCV", tl(k.cpcv)],
    ["DÖNÜŞÜM", nn(t.donusum)],
    ["CPA", tl(k.cpa)],
    ["DÖNÜŞÜM ORANI", pc(k.cvr)],
    ["ROAS", k.roas === null ? "—" : formatNumber(k.roas, 2)],
    ["ORT. FREKANS", t.frekans === null ? "—" : formatNumber(t.frekans, 1)],
  ].filter(([, v]) => v !== "—") as [string, string][];
  const pairs: [string, string][][] = [];
  for (let i = 0; i < rows.length; i += 3) pairs.push(rows.slice(i, i + 3));

  return (
    <Document title={`${meta.kampanya} — performans yorumu`} author={meta.hazirlayan || SITE_NAME} creator={SITE_NAME} language="tr">
      <Page size="A4" style={s.page}>
        <Text style={s.label}>{SITE_NAME} · RAPOR YORUMU</Text>
        <Text style={s.h1}>{meta.kampanya || "Kampanya raporu"}</Text>
        <Text style={[s.p, { color: C.muted, marginTop: 4 }]}>
          Dönem: {sum.donem.bas ?? "?"} – {sum.donem.son ?? "?"} · Hazırlayan: {meta.hazirlayan || "—"} · Şablon: {meta.sablon}
        </Text>
        {sum.duzeltilen.length > 0 && (
          <Text style={[s.p, { color: C.accent, marginTop: 4 }]}>Not: {sum.duzeltilen.join(", ")} kolonlarına Adform 10^15 düzeltmesi uygulandı.</Text>
        )}

        <Text style={s.h2}>// METRİK ÖZETİ</Text>
        <View style={s.table}>
          {pairs.map((row, i) => (
            <View key={i} style={[s.tr, i === pairs.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              {row.map(([kk, v]) => (
                <View key={kk} style={s.td}>
                  <Text style={s.label}>{kk}</Text>
                  <Text style={[s.num, { marginTop: 2 }]}>{v}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {k.viewabilityPayda === "impression" && <Text style={[s.label, { marginTop: 4 }]}>viewability paydası: toplam impression (ölçülen impression raporda yok)</Text>}

        {sum.pacing && (
          <>
            <Text style={s.h2}>// PACING</Text>
            <Text style={s.p}>
              Harcanması gereken {tl(sum.pacing.harcanmasiGereken)} · sapma {pc(sum.pacing.sapmaYuzde, 1)} · bu hızla dönem sonu {tl(sum.pacing.tamamlanmaProjeksiyonu)} ·
              kalan günlük gereken {tl(sum.pacing.gerekenGunlukHarcama)}
            </Text>
          </>
        )}

        {trendData.length > 1 && (
          <>
            <Text style={s.h2}>// TREND ({sum.gunluk.length > 1 ? "günlük" : "haftalık"})</Text>
            <BarChart data={trendData} value={(d) => d.harcama} label="harcama" color={C.accentFill} />
            <LineChart data={trendData} value={(d) => d.ctr} label="CTR" />
          </>
        )}

        {sum.kirilim && sum.kirilim.enIyi.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>// EN İYİ / EN KÖTÜ ({sum.kirilim.olcut === "cpa" ? "CPA" : "CTR"})</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.td, s.label, { flex: 0.6 }]}> </Text>
                <Text style={[s.td, s.label, { flex: 2.4 }]}>SATIR</Text>
                <Text style={[s.td, s.label]}>{sum.kirilim.olcut === "cpa" ? "CPA" : "CTR"}</Text>
                <Text style={[s.td, s.label]}>IMPRESSION PAYI</Text>
              </View>
              {[...sum.kirilim.enIyi.map((x) => ({ ...x, tip: "▲ iyi" })), ...sum.kirilim.enKotu.map((x) => ({ ...x, tip: "▼ kötü" }))].map((x, i) => (
                <View key={`${x.tip}${x.ad}`} style={[s.tr, { backgroundColor: i % 2 ? C.band : C.bg }]}>
                  <Text style={[s.td, s.num, { flex: 0.6, color: x.tip.startsWith("▲") ? C.up : C.down }]}>{x.tip}</Text>
                  <Text style={[s.td, { flex: 2.4 }]}>{x.ad}</Text>
                  <Text style={[s.td, s.num]}>{sum.kirilim!.olcut === "cpa" ? tl(x.cpa) : pc(x.ctr, 3)}</Text>
                  <Text style={[s.td, s.num]}>{pc(x.pay, 1)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {yorum ? (
          <>
            <Text style={s.h2}>// ÖZET</Text>
            <Bullets items={yorum.ozet} />
            {yorum.iyi.length > 0 && (
              <>
                <Text style={s.h2}>// NEYİ İYİ YAPIYORUZ</Text>
                <Bullets items={yorum.iyi} />
              </>
            )}
            {yorum.paraKacan.length > 0 && (
              <>
                <Text style={s.h2}>// NEREDE PARA KAÇIYOR</Text>
                <Bullets items={yorum.paraKacan} />
              </>
            )}
            <Text style={s.h2}>// BENCHMARK KARŞILAŞTIRMASI</Text>
            {yorum.benchmark.length ? <Bullets items={yorum.benchmark} /> : <Text style={[s.p, { color: C.muted }]}>Bu rapor için yayınlanmış bir benchmark yok.</Text>}
            <Text style={s.h2}>// ÖNÜMÜZDEKİ HAFTA: 3 AKSİYON</Text>
            <Bullets items={yorum.aksiyonlar} />
            {yorum.patron.length > 0 && (
              <>
                <Text style={s.h2}>// PATRON BUNU SORACAK</Text>
                {yorum.patron.map((q, i) => (
                  <View key={i} style={{ marginBottom: 6 }} wrap={false}>
                    <Text style={[s.p, { fontWeight: 600 }]}>{q.soru}</Text>
                    <Text style={s.p}>{q.cevap}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <Text style={[s.p, { color: C.muted, marginTop: 18 }]}>Yorum bölümü üretilmedi; yalnızca deterministik metrikler.</Text>
        )}

        <View style={s.footer} fixed>
          <Text>{SITE_URL.replace(/^https?:\/\//, "")} · sayılar formülle hesaplandı{yorum ? ", yorum yapay zekâ ile yazıldı" : ""}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(sum: ReportSummary, yorum: Comment | null, meta: PdfMeta): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<ReportDoc sum={sum} yorum={yorum} meta={meta} />);
}
