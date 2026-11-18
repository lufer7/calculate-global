import type { Mecra } from "@/lib/mecra/schema";

const COLS: [keyof Mecra["formatlar"][number], string][] = [
  ["oran", "oran"],
  ["sure", "süre (sn)"],
  ["dosya", "dosya"],
  ["bitrate", "bitrate"],
  ["max_boyut", "maks. boyut"],
  ["tiklanabilir", "tıklanabilir"],
];

function cell(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (Array.isArray(v)) return v.join(" / ");
  if (typeof v === "boolean") return v ? "evet" : "hayır";
  return String(v);
}

export function SpecTable({ formatlar }: { formatlar: Mecra["formatlar"] }) {
  if (formatlar.length === 0) return <p className="syslog">format bilgisi yok.</p>;
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[36rem] text-xs">
        <thead className="bg-bg-alt text-left text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-normal">format</th>
            {COLS.map(([, l]) => (
              <th key={l} scope="col" className="px-3 py-2 font-normal">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formatlar.map((f) => (
            <tr key={f.ad} className="border-t border-border-dim">
              <th scope="row" className="px-3 py-2 text-left font-normal text-text">
                {f.ad}
              </th>
              {COLS.map(([k]) => (
                <td key={k} className={`px-3 py-2 ${f[k] === undefined ? "text-muted" : "text-text"}`}>
                  {cell(f[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border-dim px-3 py-2 text-[11px] text-muted">— = doğrulanmış bilgi yok. Tahmini değer yazmıyoruz.</p>
    </div>
  );
}
