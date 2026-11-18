"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "@/lib/calc/number";
import type { CurvePoint } from "@/lib/calc/reach";

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

export function ReachChart({
  data,
  n,
  doymaButce,
  butce,
  universe,
}: {
  data: CurvePoint[];
  n: number;
  doymaButce: number | null;
  butce: number;
  universe: number;
}) {
  const current = data.reduce((best, p) => (Math.abs(p.butce - butce) < Math.abs(best.butce - butce) ? p : best), data[0]!);
  return (
    <figure className="card p-4" aria-labelledby="reach-egri-baslik">
      <figcaption id="reach-egri-baslik" className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">// bütçe → tahmini tekil erişim</span>
        <span className="flex gap-4 font-mono text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-accent" /> 1+ reach
          </span>
          {n > 1 && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-info" /> {n}+ reach
            </span>
          )}
          {doymaButce !== null && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3 border-l border-dashed border-muted" /> doyma noktası
            </span>
          )}
        </span>
      </figcaption>
      <div className="mt-3 h-64 w-full md:h-72" role="img" aria-label={`Bütçe arttıkça tahmini erişim eğrisi; universe ${formatNumber(universe, 0)} kişi`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--border-dim)" vertical={false} />
            <XAxis
              dataKey="butce"
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(v: number) => `₺${compact.format(v)}`}
              stroke="var(--muted)"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tickFormatter={(v: number) => compact.format(v)}
              stroke="var(--muted)"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, universe]}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
              contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}
              labelStyle={{ color: "var(--text)" }}
              itemStyle={{ color: "var(--text)" }}
              labelFormatter={(v) => `bütçe ${formatMoney(Number(v), "TRY", 0)}`}
              formatter={(v, name) => [`${formatNumber(Number(v), 0)} kişi`, name === "reach1" ? "1+ reach" : `${n}+ reach`]}
            />
            {doymaButce !== null && doymaButce <= data[data.length - 1]!.butce && (
              <ReferenceLine x={doymaButce} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: "doyma", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }} />
            )}
            <Line type="monotone" dataKey="reach1" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {n > 1 && <Line type="monotone" dataKey="reachN" stroke="var(--info)" strokeWidth={2} dot={false} isAnimationActive={false} />}
            {current && <ReferenceDot x={current.butce} y={current.reach1} r={5} fill="var(--accent)" stroke="var(--panel)" strokeWidth={2} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
