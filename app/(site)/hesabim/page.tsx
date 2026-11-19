import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { calcPresets, cpmSubmissions, favorites } from "@/db/schema";
import { PageHeader } from "@/components/PageHeader";
import { DeletePreset } from "@/components/account/DeletePreset";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatMoney } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import { getAllTerms } from "@/lib/sozluk/load";
import { getAllMecra } from "@/lib/mecra/load";

export const metadata: Metadata = { title: "Hesabım", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function presetHref(arac: string, girdiler: Record<string, string>) {
  const q = new URLSearchParams(girdiler).toString();
  return `${arac === "reach-tahmin" ? "/reach-tahmin" : `/hesapla/${arac}`}${q ? `?${q}` : ""}`;
}

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?next=/hesabim");
  const db = getDb();
  const [presets, favs, subs] = db
    ? await Promise.all([
        db.select().from(calcPresets).where(eq(calcPresets.userId, user.id)).orderBy(desc(calcPresets.createdAt)),
        db.select().from(favorites).where(eq(favorites.userId, user.id)).orderBy(desc(favorites.createdAt)),
        db.select().from(cpmSubmissions).where(eq(cpmSubmissions.userId, user.id)).orderBy(desc(cpmSubmissions.createdAt)).limit(50),
      ])
    : [[], [], []];
  const terms = getAllTerms();
  const mecralar = getAllMecra();
  const favAd = (tip: string, ref: string) =>
    tip === "terim" ? terms.find((t) => t.slug === ref)?.terim : tip === "mecra" ? mecralar.find((m) => m.slug === ref)?.mecra : ref;
  const favHref = (tip: string, ref: string) => (tip === "terim" ? `/sozluk/${ref}` : tip === "mecra" ? `/mecra/${ref}` : `/hesapla/${ref}`);

  return (
    <>
      <PageHeader etiket="// HESABIM" baslik="Hesabım" sistem={`oturum: ${user.email}`}>
        <p>Kaydettiğin hesaplamalar, favorilerin ve topluluk CPM katkıların.</p>
      </PageHeader>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section aria-labelledby="kayit">
          <h2 id="kayit" className="label">
            // kayıtlı hesaplamalar
          </h2>
          {presets.length === 0 ? (
            <p className="syslog mt-3">henüz kayıt yok. hesaplayıcılarda &ldquo;kaydet&rdquo; düğmesini kullan.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {presets.map((p) => (
                <li key={p.id} className="card flex items-center justify-between gap-3 p-3">
                  <Link href={presetHref(p.arac, p.girdilerJson as Record<string, string>)} className="min-w-0">
                    <span className="block truncate text-sm text-text">{p.ad}</span>
                    <span className="font-mono text-xs text-muted">
                      {p.arac} · {formatDate(p.createdAt)}
                    </span>
                  </Link>
                  <DeletePreset id={p.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="fav">
          <h2 id="fav" className="label">
            // favoriler
          </h2>
          {favs.length === 0 ? (
            <p className="syslog mt-3">favori yok. sözlük ve mecra sayfalarında yıldıza bas.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {favs.map((f) => (
                <li key={f.id}>
                  <Link href={favHref(f.tip, f.ref)} className="btn min-h-11 px-3 text-xs">
                    {favAd(f.tip, f.ref) ?? f.ref}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="katki">
          <h2 id="katki" className="label">
            // CPM katkıların
          </h2>
          {subs.length === 0 ? (
            <p className="syslog mt-3">
              henüz katkı yok. <Link href="/topluluk" className="text-accent underline">topluluk CPM&apos;ine katkı ver</Link> — karşılığında detaylı kırılımı gör.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {subs.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-border-dim py-1.5">
                  <span className="font-mono text-text">
                    {s.format} · {s.ay} · {formatMoney(Number(s.cpmTl))}
                  </span>
                  <span className={`font-mono text-xs ${s.onaylandi ? "text-up" : "text-muted"}`}>{s.onaylandi ? "■ onaylandı" : "□ moderasyonda"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn">
            çıkış yap
          </button>
        </form>
      </div>
    </>
  );
}
