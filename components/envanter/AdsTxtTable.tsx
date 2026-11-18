import type { AdsTxtSatir } from "@/lib/envanter/report";

const DOG: Record<string, { t: string; c: string }> = {
  dogrulandi: { t: "■ doğrulandı", c: "text-up" },
  bulunamadi: { t: "▲ sellers.json'da yok", c: "text-down" },
  tip_uyusmuyor: { t: "▲ tip uyuşmuyor", c: "text-down" },
  alan_adi_uyusmuyor: { t: "▲ alan adı farklı", c: "text-accent" },
  gizli: { t: "□ gizli satıcı", c: "text-muted" },
  sellers_json_yok: { t: "□ sellers.json alınamadı", c: "text-muted" },
};

export function AdsTxtTable({ satirlar }: { satirlar: AdsTxtSatir[] }) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded border border-border">
      <table className="w-full min-w-[34rem] text-xs">
        <thead className="sticky top-0 bg-bg-alt text-left text-muted">
          <tr>
            {["reklam sistemi", "satıcı id", "ilişki", "sellers.json"].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s) => {
            const d = s.dogrulama ? DOG[s.dogrulama] : null;
            return (
              <tr key={`${s.ssp}|${s.sellerId}|${s.iliski}`} className="border-t border-border-dim">
                <td className="px-3 py-1.5 text-text">{s.ssp}</td>
                <td className="px-3 py-1.5 text-muted">
                  {s.sellerId}
                  {s.sellerName && <span className="block text-[10.5px]">{s.sellerName}</span>}
                </td>
                <td className={`px-3 py-1.5 ${s.iliski === "DIRECT" ? "text-text" : "text-muted"}`}>{s.iliski}</td>
                <td className={`px-3 py-1.5 ${d?.c ?? "text-muted"}`}>{d?.t ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
