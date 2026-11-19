import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { favorites } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";
const key = z.object({ tip: z.enum(["terim", "mecra", "arac"]), ref: z.string().regex(/^[a-z0-9-]{1,80}$/) });

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const k = key.safeParse({ tip: sp.get("tip"), ref: sp.get("ref") });
  const user = await getCurrentUser();
  const db = getDb();
  if (!k.success || !user || !db) return NextResponse.json({ girisli: !!user, favori: false }, { headers: { "cache-control": "no-store" } });
  const r = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.tip, k.data.tip), eq(favorites.ref, k.data.ref)))
    .limit(1);
  return NextResponse.json({ girisli: true, favori: r.length > 0 }, { headers: { "cache-control": "no-store" } });
}

/** Favoriyi aç/kapat. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user) return NextResponse.json({ hata: "favori için giriş yap" }, { status: 401 });
  if (!db) return NextResponse.json({ hata: "veritabanı yapılandırılmadı" }, { status: 503 });
  const k = key.safeParse(await req.json().catch(() => null));
  if (!k.success) return NextResponse.json({ hata: "geçersiz istek" }, { status: 400 });
  const where = and(eq(favorites.userId, user.id), eq(favorites.tip, k.data.tip), eq(favorites.ref, k.data.ref));
  const r = await db.select({ id: favorites.id }).from(favorites).where(where).limit(1);
  if (r.length) {
    await db.delete(favorites).where(where);
    return NextResponse.json({ favori: false });
  }
  await db.insert(favorites).values({ userId: user.id, ...k.data }).onConflictDoNothing();
  return NextResponse.json({ favori: true });
}
