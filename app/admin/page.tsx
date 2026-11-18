import { count } from "drizzle-orm";
import Link from "next/link";
import { cpmAdjustments, cpmBenchmarks, cpmSeasonality, cpmSettings } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getAllTerms } from "@/lib/sozluk/load";

export default async function AdminHome() {
  const db = getDb()!;
  const [[b], [a], [s], [settings]] = await Promise.all([
    db.select({ n: count() }).from(cpmBenchmarks),
    db.select({ n: count() }).from(cpmAdjustments),
    db.select({ n: count() }).from(cpmSeasonality),
    db.select().from(cpmSettings).limit(1),
  ]);
  const cards = [
    ["/admin/cpm", "CPM benchmark", b?.n ?? 0, "satır"],
    ["/admin/cpm#katsayi", "Türkiye katsayısı", a?.n ?? 0, "satır"],
    ["/admin/sezon", "Sezon katsayısı", s?.n ?? 0, "satır"],
    ["/admin/sozluk", "Sözlük", getAllTerms().length, "terim (MDX)"],
  ] as const;
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Durum</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([href, ad, n, birim]) => (
          <li key={href}>
            <Link href={href} className="card block p-4 hover:border-muted">
              <span className="label">{ad}</span>
              <span className="num mt-2 block text-2xl text-text">{n}</span>
              <span className="text-xs text-muted">{birim}</span>
            </Link>
          </li>
        ))}
      </ul>
      {settings && (
        <section className="card p-5">
          <h2 className="label">// katman B geçiş eşiği (cpm_settings)</h2>
          <p className="num mt-2 font-mono text-sm text-text">
            son {settings.pencereGun} gün · ≥{settings.minGirdi} girdi · ≥{settings.minKatkici} katkıcı · gösterim için ≥{settings.minGosterim} kayıt ·
            kaynaklar arası sapma eşiği {Number(settings.tutarlilikEsigi) * 100}%
          </p>
        </section>
      )}
      <p className="syslog">şirket verisi bu panele girmez. kalibrasyon için bile.</p>
    </div>
  );
}
