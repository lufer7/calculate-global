import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { calcPresets } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

/** Kaydedilen hesaplama: aracın URL parametreleri. Yalnızca giriş yapmış kullanıcı. */
const body = z.object({
  arac: z.string().regex(/^[a-z0-9-]{2,40}$/),
  ad: z.string().trim().min(1).max(80),
  girdiler: z.record(z.string().max(40), z.string().max(80)).refine((o) => Object.keys(o).length <= 20),
});

async function ctx() {
  const user = await getCurrentUser();
  const db = getDb();
  return { user, db };
}

export async function POST(req: Request) {
  const { user, db } = await ctx();
  if (!user) return NextResponse.json({ hata: "kaydetmek için giriş yap" }, { status: 401 });
  if (!db) return NextResponse.json({ hata: "veritabanı yapılandırılmadı" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: "geçersiz istek" }, { status: 400 });
  const existing = await db.select({ id: calcPresets.id }).from(calcPresets).where(eq(calcPresets.userId, user.id));
  if (existing.length >= 200) return NextResponse.json({ hata: "en fazla 200 kayıt" }, { status: 400 });
  await db.insert(calcPresets).values({ userId: user.id, arac: parsed.data.arac, ad: parsed.data.ad, girdilerJson: parsed.data.girdiler });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, db } = await ctx();
  if (!user || !db) return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ hata: "geçersiz id" }, { status: 400 });
  await db.delete(calcPresets).where(and(eq(calcPresets.id, id), eq(calcPresets.userId, user.id)));
  return NextResponse.json({ ok: true });
}
