import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LoginForm } from "./LoginForm";
import { supabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Giriş", robots: { index: false, follow: false } };

export default function Page() {
  const env = supabaseEnv();
  return (
    <>
      <PageHeader etiket="// GİRİŞ" baslik="Giriş">
        <p>Araçlar girişsiz çalışır. Giriş; hesaplamaları kaydetmek, favoriler ve topluluk CPM katkısı için. Şifre yok: e-postana tek kullanımlık bağlantı gelir.</p>
      </PageHeader>
      <div className="mx-auto max-w-md px-4 py-10">
        {env ? (
          <LoginForm url={env.url} anonKey={env.anonKey} />
        ) : (
          <p className="syslog">supabase yapılandırılmadı. README&apos;deki kurulum adımlarına bak.</p>
        )}
      </div>
    </>
  );
}
