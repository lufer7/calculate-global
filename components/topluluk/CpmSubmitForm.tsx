"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useMe } from "@/components/account/useMe";

const FORMAT = [
  ["banner", "Banner (display)"],
  ["instream", "In-stream video"],
  ["ctv", "CTV"],
  ["native", "Native"],
] as const;

export function CpmSubmitForm() {
  const uid = useId();
  const me = useMe();
  const now = new Date();
  const [f, setF] = useState({ format: "banner", kanal: "", dsp: "", mecra: "", satinAlma: "", hedefleme: "", ay: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`, cpm: "" });
  const [onay, setOnay] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me) return <div className="card h-40 animate-pulse" aria-hidden="true" />;
  if (!me.hesapAcik) return <p className="syslog">hesap sistemi bu ortamda yapılandırılmadı.</p>;
  if (!me.girisli)
    return (
      <p className="card p-4 text-sm text-muted">
        Katkı için giriş gerekli (spam ve tekrarı önlemek için; adın hiçbir yerde görünmez).{" "}
        <Link href="/giris?next=/topluluk" className="text-accent underline">
          Giriş yap
        </Link>
      </p>
    );

  const sel = (k: keyof typeof f, label: string, opts: readonly (readonly [string, string])[], optional = true) => (
    <div>
      <label htmlFor={`${uid}-${k}`} className="label">
        {label}
      </label>
      <select id={`${uid}-${k}`} className="input mt-2" value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))}>
        {optional && <option value="">—</option>}
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      className="card space-y-4 p-4 md:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const body = { ...f, onay, kanal: f.kanal || null, satinAlma: f.satinAlma || null, hedefleme: f.hedefleme || null };
        const r = await fetch("/api/topluluk/cpm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = (await r.json()) as { mesaj?: string; hata?: string };
        setMsg({ ok: r.ok, t: j.mesaj ?? j.hata ?? "" });
        if (r.ok) setF((s) => ({ ...s, cpm: "" }));
        setBusy(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sel("format", "format", FORMAT, false)}
        {sel("kanal", "kanal", [["desktop", "Desktop"], ["mobil", "Mobil"], ["ctv", "CTV"]])}
        {sel("satinAlma", "satın alma", [["open", "Open auction"], ["pmp", "PMP"], ["pg", "PG"]])}
        {sel("hedefleme", "hedefleme", [["genis", "Geniş"], ["baglamsal", "Bağlamsal"], ["3p-kitle", "3P kitle"], ["1p-kitle", "1P kitle"], ["retargeting", "Retargeting"]])}
        <div>
          <label htmlFor={`${uid}-dsp`} className="label">
            DSP (opsiyonel)
          </label>
          <input id={`${uid}-dsp`} className="input mt-2" value={f.dsp} onChange={(e) => setF((s) => ({ ...s, dsp: e.target.value }))} placeholder="DV360" />
        </div>
        <div>
          <label htmlFor={`${uid}-mecra`} className="label">
            mecra (opsiyonel)
          </label>
          <input id={`${uid}-mecra`} className="input mt-2" value={f.mecra} onChange={(e) => setF((s) => ({ ...s, mecra: e.target.value }))} />
        </div>
        <div>
          <label htmlFor={`${uid}-ay`} className="label">
            ay
          </label>
          <input id={`${uid}-ay`} type="month" required className="input mt-2" value={f.ay} onChange={(e) => setF((s) => ({ ...s, ay: e.target.value }))} />
        </div>
        <div>
          <label htmlFor={`${uid}-cpm`} className="label">
            gördüğün CPM (₺, fee hariç)
          </label>
          <input id={`${uid}-cpm`} required inputMode="decimal" className="input mt-2" value={f.cpm} onChange={(e) => setF((s) => ({ ...s, cpm: e.target.value }))} placeholder="24,50" />
        </div>
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm text-muted">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--accent)]" required />
        <span>
          Bu değeri anonim olarak paylaşma yetkim var. Müşteri adı, deal ID, gizlilik sözleşmesine tabi rate card veya işverenimin paylaşmama yükümlülüğü
          olan bir sayıyı girmiyorum.
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${msg ? (msg.ok ? "up" : "down") : "syslog"}`} aria-live="polite">
          {msg ? `${msg.ok ? "■" : "▲"} ${msg.t}` : "girdiler moderasyondan sonra, en az 5 kayıt birikince görünür."}
        </p>
        <button type="submit" className="btn btn-primary" disabled={busy || !onay}>
          katkı gönder
        </button>
      </div>
    </form>
  );
}
