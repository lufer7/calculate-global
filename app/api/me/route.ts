import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { supabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseEnv()) return NextResponse.json({ hesapAcik: false, girisli: false });
  const u = await getCurrentUser();
  return NextResponse.json({ hesapAcik: true, girisli: !!u, email: u?.email ?? null }, { headers: { "cache-control": "no-store" } });
}
