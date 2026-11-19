import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Magic link dönüşü: kodu oturuma çevirir, güvenli bir iç yola yönlendirir. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/hesabim";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/hesabim";
  const supabase = await createSupabaseServer();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/giris?hata=1`);
}
