import type { Dogrulama } from "@/lib/mecra/schema";

export function DogrulamaBadge({ d }: { d: Dogrulama }) {
  if (d.durum === "guncel") {
    return <span className="rounded border border-up/40 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-widest text-up">■ doğrulandı</span>;
  }
  return (
    <span className="rounded border border-accent/50 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-widest text-accent">
      ▲ doğrulanmalı{d.durum === "eski" ? ` · ${d.ay} ay` : ""}
    </span>
  );
}
