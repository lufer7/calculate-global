import type { Metadata } from "next";
import Link from "next/link";
import { getAdminState } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LINKS = [
  ["/admin", "Durum"],
  ["/admin/cpm", "CPM tabloları"],
  ["/admin/sezon", "Sezon katsayıları"],
  ["/admin/reach", "Reach & universe"],
  ["/admin/envanter", "Envanter"],
  ["/admin/topluluk", "Topluluk"],
  ["/admin/sozluk", "Sözlük"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const state = await getAdminState();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-bg-alt">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <Logo />
          <span className="label text-accent">// admin</span>
          {state.durum === "admin" && (
            <nav aria-label="Admin" className="flex flex-wrap gap-1">
              {LINKS.map(([href, ad]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center px-2 font-mono text-xs text-muted hover:text-text">
                  {ad}
                </Link>
              ))}
            </nav>
          )}
          {"email" in state && <span className="ml-auto font-mono text-xs text-muted">{state.email}</span>}
        </div>
      </header>
      <main id="icerik" className="mx-auto max-w-6xl px-4 py-8">
        {state.durum === "admin" ? (
          getDb() ? (
            children
          ) : (
            <p className="syslog">DATABASE_URL tanımlı değil. README → Supabase kurulumu.</p>
          )
        ) : state.durum === "yapilandirilmadi" ? (
          <div className="card max-w-xl p-6">
            <h1 className="text-xl font-semibold">Supabase yapılandırılmadı</h1>
            <p className="mt-2 text-sm text-muted">
              Admin paneli için <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
              <code>DATABASE_URL</code> ve <code>ADMIN_EMAILS</code> gerekli. README&apos;deki adımları izle.
            </p>
          </div>
        ) : state.durum === "giris_yok" ? (
          <p className="syslog">
            oturum yok. <Link href="/giris?next=/admin" className="text-accent underline">giriş yap</Link>
          </p>
        ) : (
          <p className="syslog">bu e-posta admin listesinde değil.</p>
        )}
      </main>
    </div>
  );
}
