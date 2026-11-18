import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __prgDb?: Db };

/**
 * Sunucu tarafı DB bağlantısı. DATABASE_URL yoksa null döner — site DB'siz de açılır
 * (ticker "veri bekleniyor" der, admin "yapılandırılmadı" uyarısı verir).
 */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.__prgDb) {
    // Supabase transaction pooler prepared statement desteklemez → prepare: false
    const client = postgres(url, { prepare: false, max: 5 });
    globalForDb.__prgDb = drizzle(client, { schema });
  }
  return globalForDb.__prgDb;
}
