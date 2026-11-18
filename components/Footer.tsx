import Link from "next/link";
import { NAV, SITE_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-alt">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-mono text-sm font-bold tracking-[0.08em]">
            <span className="text-accent">&gt;</span>
            {SITE_NAME}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Programatik dünyanın dağınık PDF'lerini, Slack'te kaybolan formüllerini ve &ldquo;bunu kim hesaplamıştı&rdquo;
            sorularını tek yerde topluyoruz. Kişisel bir projedir; hiçbir ajansın ya da reklamverenin verisi
            kullanılmaz.
          </p>
          <p className="syslog mt-4">tüm sayılar kaynaklı. kaynağı olmayan sayı yayına girmez.</p>
        </div>
        <nav aria-label="Modüller">
          <p className="label">// Modüller</p>
          <ul className="mt-3 space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-text">
                  {n.ad}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site">
          <p className="label">// Site</p>
          <ul className="mt-3 space-y-1">
            {[
              ["/hakkinda", "Hakkında & veri politikası"],
              ["/gizlilik", "Gizlilik & KVKK"],
              ["/ads.txt", "ads.txt"],
            ].map(([href, ad]) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-text">
                  {ad}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border-dim">
        <p className="mx-auto max-w-6xl px-4 py-4 font-mono text-xs text-muted">
          © {new Date().getFullYear()} {SITE_NAME} · tahmin modelleri DSP forecast'inin yerini tutmaz
        </p>
      </div>
    </footer>
  );
}
