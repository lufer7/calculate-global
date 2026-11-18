import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { reachSettings, universeRefs } from "@/db/schema";
import { getDb } from "@/lib/db";

export type UniverseRef = { id: number; tanim: string; buyukluk: number; kaynak: string; kaynakUrl: string | null; tarih: string };
export type ReachSetting = { kanal: string; r: number | null; erisilebilirOran: number; metotNotu: string; tarih: string };

export async function getUniverseRefs(): Promise<UniverseRef[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(universeRefs).orderBy(asc(universeRefs.hedefKitleTanimi));
    return rows.map((r) => ({ id: r.id, tanim: r.hedefKitleTanimi, buyukluk: r.buyukluk, kaynak: r.kaynak, kaynakUrl: r.kaynakUrl, tarih: r.tarih }));
  } catch (e) {
    console.error("[reach] universe okunamadı:", (e as Error).message);
    return [];
  }
}

/** Kanal başına en güncel ayar. Ayar yoksa model Poisson + tam erişilebilirlik ile çalışır. */
export async function getReachSettings(): Promise<Record<string, ReachSetting>> {
  const db = getDb();
  if (!db) return {};
  try {
    const rows = await db
      .select()
      .from(reachSettings)
      .where(eq(reachSettings.platform, "programmatic"))
      .orderBy(desc(reachSettings.tarih), desc(reachSettings.createdAt));
    const out: Record<string, ReachSetting> = {};
    for (const r of rows) {
      if (out[r.kanal]) continue;
      out[r.kanal] = {
        kanal: r.kanal,
        r: r.nbdR === null ? null : Number(r.nbdR),
        erisilebilirOran: Number(r.erisilebilirOran),
        metotNotu: r.metotNotu,
        tarih: r.tarih,
      };
    }
    return out;
  } catch (e) {
    console.error("[reach] ayarlar okunamadı:", (e as Error).message);
    return {};
  }
}
