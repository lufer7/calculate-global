import "server-only";
import { createSupabaseServer } from "./supabase/server";

export type CurrentUser = { id: string; email: string };

/** Giriş yapmış kullanıcı (Supabase oturumu). Yoksa ya da Supabase yapılandırılmadıysa null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ? { id: data.user.id, email: data.user.email } : null;
}
