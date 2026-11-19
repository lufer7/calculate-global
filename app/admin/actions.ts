"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cpmAdjustments, cpmBenchmarks, cpmSeasonality, CPM_FORMATLAR, CPM_KAYNAK, PARA_BIRIMLERI, reachSettings, REACH_KANALLAR, universeRefs } from "@/db/schema";
import { cpmSettings, cpmSubmissions, domains } from "@/db/schema";
import { crawlAndStore, fetchHomepageMeta } from "@/lib/adstxt/crawl";
import { classifyDomain } from "@/lib/ai/classify";
import { normalizeHost } from "@/lib/envanter/domain";
import { ENVANTER_KATEGORI_SLUGLARI } from "@/lib/envanter/kategoriler";
import { requireAdmin } from "@/lib/auth";
import { parseTrNumber } from "@/lib/calc/number";
import { getDb } from "@/lib/db";

export type ActionState = { ok: boolean; mesaj: string } | null;

const num = () =>
  z.string().transform((s, ctx) => {
    const n = parseTrNumber(s);
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: "pozitif bir sayı olmalı" });
      return z.NEVER;
    }
    return n;
  });
const optNum = () => z.string().transform((s) => s.trim()).pipe(z.union([z.literal("").transform(() => null), num()]));
const optText = z.string().transform((s) => (s.trim() === "" ? null : s.trim()));

function fail(e: z.ZodError): ActionState {
  return { ok: false, mesaj: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") };
}

function db() {
  const d = getDb();
  if (!d) throw new Error("DATABASE_URL tanımlı değil");
  return d;
}

const benchmarkSchema = z
  .object({
    format: z.enum(CPM_FORMATLAR),
    donem: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "YYYY-AA biçiminde olmalı"),
    paraBirimi: z.enum(PARA_BIRIMLERI),
    degerMin: num(),
    degerMax: num(),
    p25: optNum(),
    p75: optNum(),
    kurDegeri: num(),
    kurTarihi: z.string().date(),
    kurKaynagi: z.string().trim().min(2),
    kaynak: z.enum(CPM_KAYNAK),
    kaynakAdi: z.string().trim().min(3),
    kaynakUrl: optText.pipe(z.string().url().nullable()),
    kanal: optText,
    satinAlma: optText,
  })
  .refine((v) => v.degerMax >= v.degerMin, { message: "max ≥ min olmalı", path: ["degerMax"] })
  .refine((v) => v.paraBirimi !== "TRY" || v.kurDegeri === 1, { message: "TRY kaynaklı değerde kur 1 olmalı", path: ["kurDegeri"] });

export async function addBenchmark(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = benchmarkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  const v = parsed.data;
  await db().insert(cpmBenchmarks).values({
    ...v,
    degerMin: String(v.degerMin),
    degerMax: String(v.degerMax),
    p25: v.p25 === null ? null : String(v.p25),
    p75: v.p75 === null ? null : String(v.p75),
    kurDegeri: String(v.kurDegeri),
  });
  revalidatePath("/", "layout");
  return { ok: true, mesaj: "benchmark eklendi. ticker tazelendi." };
}

const adjustmentSchema = z.object({
  format: z.enum(CPM_FORMATLAR),
  katsayi: num(),
  metotNotu: z.string().trim().min(20, "metot notu en az 20 karakter: bu katsayıya neye dayanarak karar verdin?"),
  gecerlilikBaslangic: z.string().date(),
});

export async function addAdjustment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = adjustmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  await db()
    .insert(cpmAdjustments)
    .values({ ...parsed.data, katsayi: String(parsed.data.katsayi), kaynak: "editoryel_tahmin" });
  revalidatePath("/", "layout");
  return { ok: true, mesaj: "katsayı eklendi." };
}

const seasonSchema = z.object({
  ay: z.coerce.number().int().min(1).max(12),
  ozelDonem: optText,
  format: optText.pipe(z.enum(CPM_FORMATLAR).nullable()),
  katsayi: num(),
  kaynak: z.string().trim().min(3),
  not: optText,
});

export async function addSeasonality(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = seasonSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  await db()
    .insert(cpmSeasonality)
    .values({ ...parsed.data, katsayi: String(parsed.data.katsayi) });
  revalidatePath("/admin/sezon");
  return { ok: true, mesaj: "sezon katsayısı eklendi." };
}

const universeSchema = z.object({
  hedefKitleTanimi: z.string().trim().min(3),
  buyukluk: num().pipe(z.number().int("tam sayı olmalı")),
  kaynak: z.string().trim().min(3, "kaynak zorunlu: TÜİK, IAB Türkiye, We Are Social/Meltwater..."),
  kaynakUrl: optText.pipe(z.string().url().nullable()),
  tarih: z.string().date(),
});

export async function addUniverse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = universeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  await db().insert(universeRefs).values(parsed.data);
  revalidatePath("/reach-tahmin");
  return { ok: true, mesaj: "universe referansı eklendi." };
}

const reachSettingSchema = z.object({
  kanal: z.enum(REACH_KANALLAR),
  nbdR: optNum(),
  erisilebilirOran: num().pipe(z.number().max(1, "0–1 arası olmalı")),
  metotNotu: z.string().trim().min(20, "metot notu en az 20 karakter"),
  tarih: z.string().date(),
});

export async function addReachSetting(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = reachSettingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  const v = parsed.data;
  await db()
    .insert(reachSettings)
    .values({ ...v, nbdR: v.nbdR === null ? null : String(v.nbdR), erisilebilirOran: String(v.erisilebilirOran) });
  revalidatePath("/reach-tahmin");
  return { ok: true, mesaj: "model ayarı eklendi." };
}

const TABLES = {
  benchmark: cpmBenchmarks,
  adjustment: cpmAdjustments,
  sezon: cpmSeasonality,
  universe: universeRefs,
  reach: reachSettings,
} as const;

export async function deleteRow(form: FormData): Promise<void> {
  await requireAdmin();
  const tablo = z.enum(["benchmark", "adjustment", "sezon", "universe", "reach"]).parse(form.get("tablo"));
  const id = z.coerce.number().int().positive().parse(form.get("id"));
  const t = TABLES[tablo];
  await db().delete(t).where(eq(t.id, id));
  revalidatePath("/", "layout");
}

export async function addDomains(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = String(form.get("liste") ?? "");
  const list = [...new Set(raw.split(/[\s,;]+/).map((x) => normalizeHost(x)?.domain).filter((x): x is string => !!x))];
  if (!list.length) return { ok: false, mesaj: "geçerli alan adı yok" };
  const kat = String(form.get("kategori") ?? "");
  const kategori = (ENVANTER_KATEGORI_SLUGLARI as readonly string[]).includes(kat) ? kat : null;
  await db()
    .insert(domains)
    .values(list.map((domain) => ({ domain, kategori, kategoriKaynagi: kategori ? "admin" : null })))
    .onConflictDoUpdate({ target: domains.domain, set: kategori ? { kategori, kategoriKaynagi: "admin" } : { domain: sql`excluded.domain` } });
  revalidatePath("/admin/envanter");
  return { ok: true, mesaj: `${list.length} domain eklendi / güncellendi. gece taramasında ads.txt'leri çekilecek.` };
}

export async function setCategory(form: FormData): Promise<void> {
  await requireAdmin();
  const domain = z.string().min(3).parse(form.get("domain"));
  const kat = String(form.get("kategori") ?? "");
  const kategori = (ENVANTER_KATEGORI_SLUGLARI as readonly string[]).includes(kat) ? kat : null;
  // Admin düzeltmesi LLM çıktısını her zaman ezer (§4.2c)
  await db().update(domains).set({ kategori, kategoriKaynagi: kategori ? "admin" : null }).where(eq(domains.domain, domain));
  revalidatePath("/admin/envanter");
  revalidatePath(`/envanter/kategori/${kategori}`);
}

export async function crawlNow(form: FormData): Promise<void> {
  await requireAdmin();
  const domain = normalizeHost(String(form.get("domain") ?? ""))?.domain;
  if (!domain) return;
  await crawlAndStore(domain, { maxSsp: 30 });
  revalidatePath("/admin/envanter");
}

/** Kategorisi boş domainleri (en fazla 10) LLM ile ilk kez sınıflandırır. Admin ataması olanlara dokunmaz. */
export async function classifyPending(_: ActionState, __: FormData): Promise<ActionState> {
  await requireAdmin();
  const d = db();
  const rows = await d.select({ domain: domains.domain }).from(domains).where(sql`${domains.kategori} is null`).limit(10);
  let n = 0;
  for (const { domain } of rows) {
    const meta = await fetchHomepageMeta(domain);
    if (!meta) continue;
    const r = await classifyDomain(domain, meta);
    if (r.ok && r.data.kategori && r.data.eminlik !== "dusuk") {
      await d
        .update(domains)
        .set({ kategori: r.data.kategori, kategoriKaynagi: "llm" })
        .where(sql`${domains.domain} = ${domain} and (${domains.kategoriKaynagi} is null or ${domains.kategoriKaynagi} <> 'admin')`);
      n++;
    }
  }
  revalidatePath("/admin/envanter");
  return { ok: true, mesaj: `${rows.length} domain denendi, ${n} tanesi sınıflandırıldı (eminliği düşük olanlar boş bırakıldı).` };
}

export async function moderateSubmission(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(form.get("id"));
  const karar = z.enum(["onayla", "sil"]).parse(form.get("karar"));
  if (karar === "onayla") await db().update(cpmSubmissions).set({ onaylandi: true }).where(eq(cpmSubmissions.id, id));
  else await db().delete(cpmSubmissions).where(eq(cpmSubmissions.id, id));
  revalidatePath("/admin/topluluk");
  revalidatePath("/", "layout");
}

const settingsSchema = z.object({
  minGirdi: z.coerce.number().int().min(1).max(1000),
  minKatkici: z.coerce.number().int().min(1).max(1000),
  minGosterim: z.coerce.number().int().min(1).max(1000),
  pencereGun: z.coerce.number().int().min(7).max(730),
  tutarlilikEsigi: num().pipe(z.number().max(5)),
});

export async function updateCpmSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);
  const v = { ...parsed.data, tutarlilikEsigi: String(parsed.data.tutarlilikEsigi), guncelleme: new Date() };
  await db().insert(cpmSettings).values({ id: 1, ...v }).onConflictDoUpdate({ target: cpmSettings.id, set: v });
  revalidatePath("/", "layout");
  return { ok: true, mesaj: "eşikler güncellendi." };
}
