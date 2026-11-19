import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { cpmSettings, cpmSubmissions, CPM_FORMATLAR } from "@/db/schema";
import { getDb } from "@/lib/db";
import { communityCell, DEFAULT_COMMUNITY_SETTINGS, type CommunityCell, type CommunitySettings } from "./community";

export async function getCommunitySettings(): Promise<CommunitySettings> {
  const db = getDb();
  if (!db) return DEFAULT_COMMUNITY_SETTINGS;
  const [r] = await db.select().from(cpmSettings).limit(1);
  return r ? { minGirdi: r.minGirdi, minKatkici: r.minKatkici, minGosterim: r.minGosterim, pencereGun: r.pencereGun } : DEFAULT_COMMUNITY_SETTINGS;
}

export type CellKey = { format: string; kanal?: string | null; satinAlma?: string | null };

/** Onaylı girdilerden hücre istatistiği (§4.1 Katman B). Minimum kayıt altındaki hücre null. */
export async function getCommunityCells(keys: CellKey[]): Promise<Map<string, CommunityCell | null>> {
  const db = getDb();
  const out = new Map<string, CommunityCell | null>();
  if (!db) return out;
  const settings = await getCommunitySettings();
  const since = new Date(Date.now() - settings.pencereGun * 86_400_000);
  const rows = await db
    .select()
    .from(cpmSubmissions)
    .where(and(eq(cpmSubmissions.platform, "programmatic"), eq(cpmSubmissions.onaylandi, true), gte(cpmSubmissions.createdAt, since)));
  for (const k of keys) {
    const subs = rows
      .filter((r) => r.format === k.format && (!k.kanal || r.kanal === k.kanal) && (!k.satinAlma || r.satinAlma === k.satinAlma))
      .map((r) => ({ cpm: Number(r.cpmTl), kullanici: r.userId, tarih: r.createdAt }));
    out.set(cellId(k), communityCell(subs, new Date(), settings));
  }
  return out;
}

export const cellId = (k: CellKey) => [k.format, k.kanal ?? "*", k.satinAlma ?? "*"].join("|");

export async function getFormatCells() {
  return getCommunityCells(CPM_FORMATLAR.map((format) => ({ format })));
}

/** Katkı veren kullanıcıya detaylı kırılım (DSP × satın alma × hedefleme). */
export async function getDetailedBreakdown(): Promise<{ anahtar: string; cell: CommunityCell }[]> {
  const db = getDb();
  if (!db) return [];
  const settings = await getCommunitySettings();
  const since = new Date(Date.now() - settings.pencereGun * 86_400_000);
  const rows = await db
    .select()
    .from(cpmSubmissions)
    .where(and(eq(cpmSubmissions.onaylandi, true), eq(cpmSubmissions.platform, "programmatic"), gte(cpmSubmissions.createdAt, since)))
    .orderBy(desc(cpmSubmissions.createdAt));
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = [r.format, r.kanal ?? "-", r.dsp ?? "-", r.satinAlma ?? "-", r.hedefleme ?? "-"].join(" · ");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([anahtar, g]) => ({ anahtar, cell: communityCell(g.map((r) => ({ cpm: Number(r.cpmTl), kullanici: r.userId, tarih: r.createdAt })), new Date(), settings) }))
    .filter((x): x is { anahtar: string; cell: CommunityCell } => x.cell !== null)
    .sort((a, b) => a.anahtar.localeCompare(b.anahtar, "tr"));
}

export async function userHasApprovedSubmission(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const r = await db.select({ id: cpmSubmissions.id }).from(cpmSubmissions).where(and(eq(cpmSubmissions.userId, userId), eq(cpmSubmissions.onaylandi, true))).limit(1);
  return r.length > 0;
}
