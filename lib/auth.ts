import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type AdminState =
  | { durum: "yapilandirilmadi" }
  | { durum: "giris_yok" }
  | { durum: "yetkisiz"; email: string }
  | { durum: "admin"; email: string };

export async function getAdminState(): Promise<AdminState> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { durum: "yapilandirilmadi" };
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return { durum: "giris_yok" };
  return adminEmails().includes(email) ? { durum: "admin", email } : { durum: "yetkisiz", email };
}

/** Server action'larda kullanılır: admin değilse istisna fırlatır / yönlendirir. */
export async function requireAdmin(): Promise<string> {
  const s = await getAdminState();
  if (s.durum === "admin") return s.email;
  if (s.durum === "giris_yok") redirect("/giris?next=/admin");
  throw new Error("Yetkisiz");
}
