/**
 * PRGTURK veri modeli (§4.3).
 *
 * Kurallar (DB seviyesinde zorlanıyor):
 * - Her veri tablosunda `kaynak` ve bir tarih alanı NOT NULL. Kaynağı olmayan sayı siteye girmez.
 * - cpm_benchmarks.kaynak yalnızca: public_benchmark | topluluk | editoryel_tahmin (§4.1).
 * - CPM değeri KAYNAK para biriminde saklanır; TL kolonu YOK, gösterimde hesaplanır (§4.1 Kural 1).
 * - Türkiye düzeltme katsayısı zorunlu metot_notu ile saklanır (§4.1 Kural 2).
 * - domain_snapshots'ta mutlak ziyaret kolonu YOK (§4.2).
 * - `platform` kolonu: 'programmatic' | 'social' — sosyal kanal eklendiğinde refactor gerekmesin (§0).
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const platform = () =>
  text("platform").notNull().default("programmatic");
const platformCheck = (table: string, col: AnyPgColumn) =>
  check(`${table}_platform_chk`, sql`${col} in ('programmatic', 'social')`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Sözlük ---------------------------------------------------------------
// Birincil kaynak content/sozluk/*.mdx (git'te versiyonlu). Tablo, admin düzenlemesi
// ve ileride arama indeksi için ayna olarak tutulur.
export const terms = pgTable("terms", {
  slug: text("slug").primaryKey(),
  terim: text("terim").notNull(),
  acik: text("acik"),
  kategori: text("kategori").array().notNull().default(sql`'{}'::text[]`),
  seviye: text("seviye").notNull(),
  govdeMdx: text("govde_mdx").notNull(),
  ilgili: text("ilgili").array().notNull().default(sql`'{}'::text[]`),
  kaynak: text("kaynak").notNull().default("editoryel"),
  guncelleme: timestamp("guncelleme", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("terms_seviye_chk", sql`${t.seviye} in ('temel', 'orta', 'ileri')`)]);

// --- Mecra & Spec (P1) ----------------------------------------------------
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  ad: text("ad").notNull(),
  tur: text("tur").notNull(),
  kanal: text("kanal").array().notNull().default(sql`'{}'::text[]`),
  platform: platform(),
  aktif: boolean("aktif").notNull().default(true),
}, (t) => [platformCheck("channels", t.platform)]);

export const channelSpecs = pgTable("channel_specs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  dsp: text("dsp"),
  satinAlma: text("satin_alma").array().notNull().default(sql`'{}'::text[]`),
  format: text("format").notNull(),
  oran: text("oran"),
  sure: integer("sure").array(),
  dosya: text("dosya"),
  bitrate: text("bitrate"),
  tiklanabilir: boolean("tiklanabilir"),
  cpmMin: numeric("cpm_min"),
  cpmMax: numeric("cpm_max"),
  kaynak: text("kaynak").notNull(),
  kaynakUrl: text("kaynak_url").notNull(),
  sonDogrulama: date("son_dogrulama").notNull(),
});

// --- CPM (§4.1) -----------------------------------------------------------
export const CPM_KAYNAK = ["public_benchmark", "topluluk", "editoryel_tahmin"] as const;
export const CPM_FORMATLAR = ["banner", "instream", "ctv", "native"] as const;
export const PARA_BIRIMLERI = ["USD", "EUR", "TRY"] as const;

export const cpmBenchmarks = pgTable(
  "cpm_benchmarks",
  {
    id: serial("id").primaryKey(),
    platform: platform(),
    format: text("format").notNull(),
    kanal: text("kanal"),
    dsp: text("dsp"),
    satinAlma: text("satin_alma"),
    katman: text("katman").notNull().default("A"),
    // Değerler KAYNAK para biriminde (Kural 1)
    paraBirimi: text("para_birimi").notNull(),
    degerMin: numeric("deger_min").notNull(),
    degerMax: numeric("deger_max").notNull(),
    p25: numeric("p25"),
    p75: numeric("p75"),
    ornekSayisi: integer("ornek_sayisi"),
    kurDegeri: numeric("kur_degeri").notNull(), // 1 birim kaynak para = ? TL
    kurTarihi: date("kur_tarihi").notNull(),
    kurKaynagi: text("kur_kaynagi").notNull(), // örn. "TCMB efektif satış"
    kaynak: text("kaynak").notNull(),
    kaynakAdi: text("kaynak_adi").notNull(), // örn. "Burt Intelligence Open Auction Benchmarks"
    kaynakUrl: text("kaynak_url"),
    donem: text("donem").notNull(), // YYYY-MM
    createdAt: createdAt(),
  },
  (t) => [
    check("cpm_benchmarks_kaynak_chk", sql`${t.kaynak} in ('public_benchmark', 'topluluk', 'editoryel_tahmin')`),
    check("cpm_benchmarks_para_chk", sql`${t.paraBirimi} in ('USD', 'EUR', 'TRY')`),
    check("cpm_benchmarks_katman_chk", sql`${t.katman} in ('A', 'B')`),
    check("cpm_benchmarks_bant_chk", sql`${t.degerMin} > 0 and ${t.degerMax} >= ${t.degerMin}`),
    check("cpm_benchmarks_kur_chk", sql`${t.kurDegeri} > 0`),
    check("cpm_benchmarks_donem_chk", sql`${t.donem} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    platformCheck("cpm_benchmarks", t.platform),
    index("cpm_benchmarks_format_donem_idx").on(t.format, t.donem),
  ],
);

/** Türkiye düzeltme katsayısı — editöryel tahmin, zorunlu metot notu (Kural 2). */
export const cpmAdjustments = pgTable(
  "cpm_adjustments",
  {
    id: serial("id").primaryKey(),
    platform: platform(),
    format: text("format").notNull(),
    katsayi: numeric("katsayi").notNull(),
    metotNotu: text("metot_notu").notNull(),
    kaynak: text("kaynak").notNull().default("editoryel_tahmin"),
    gecerlilikBaslangic: date("gecerlilik_baslangic").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("cpm_adjustments_katsayi_chk", sql`${t.katsayi} > 0`),
    check("cpm_adjustments_metot_chk", sql`length(trim(${t.metotNotu})) >= 20`),
    check("cpm_adjustments_kaynak_chk", sql`${t.kaynak} = 'editoryel_tahmin'`),
    platformCheck("cpm_adjustments", t.platform),
  ],
);

export const cpmSeasonality = pgTable(
  "cpm_seasonality",
  {
    id: serial("id").primaryKey(),
    platform: platform(),
    ay: smallint("ay").notNull(),
    ozelDonem: text("ozel_donem"), // örn. "Black Friday", "Ramazan"
    format: text("format"), // null = tüm formatlar
    katsayi: numeric("katsayi").notNull(),
    kaynak: text("kaynak").notNull(),
    not: text("not"),
    createdAt: createdAt(),
  },
  (t) => [
    check("cpm_seasonality_ay_chk", sql`${t.ay} between 1 and 12`),
    check("cpm_seasonality_katsayi_chk", sql`${t.katsayi} > 0`),
    platformCheck("cpm_seasonality", t.platform),
  ],
);

/** Katman B geçiş eşikleri vb. (§4.1). Tek satırlık ayar tablosu. */
export const cpmSettings = pgTable(
  "cpm_settings",
  {
    id: smallint("id").primaryKey().default(1),
    minGirdi: integer("min_girdi").notNull().default(8),
    minKatkici: integer("min_katkici").notNull().default(5),
    minGosterim: integer("min_gosterim").notNull().default(5),
    pencereGun: integer("pencere_gun").notNull().default(90),
    tutarlilikEsigi: numeric("tutarlilik_esigi").notNull().default("0.40"),
    guncelleme: timestamp("guncelleme", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("cpm_settings_tek_satir_chk", sql`${t.id} = 1`)],
);

export const cpmSubmissions = pgTable(
  "cpm_submissions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    platform: platform(),
    format: text("format").notNull(),
    dsp: text("dsp"),
    mecra: text("mecra"),
    satinAlma: text("satin_alma"),
    hedefleme: text("hedefleme"),
    ay: text("ay").notNull(), // YYYY-MM
    cpmTl: numeric("cpm_tl").notNull(), // kullanıcının TL olarak gördüğü değer
    onaylandi: boolean("onaylandi").notNull().default(false),
    ipHash: text("ip_hash"),
    kaynak: text("kaynak").notNull().default("topluluk"),
    createdAt: createdAt(),
  },
  (t) => [
    check("cpm_submissions_kaynak_chk", sql`${t.kaynak} = 'topluluk'`),
    check("cpm_submissions_cpm_chk", sql`${t.cpmTl} > 0`),
    platformCheck("cpm_submissions", t.platform),
  ],
);

// --- Envanter (P2, §4.2) --------------------------------------------------
export const domains = pgTable("domains", {
  domain: text("domain").primaryKey(),
  kategori: text("kategori"),
  iabKategori: text("iab_kategori"),
  kategoriKaynagi: text("kategori_kaynagi"), // 'llm' | 'admin' | 'cloudflare'
  ilkGorulme: timestamp("ilk_gorulme", { withTimezone: true }).notNull().defaultNow(),
});

export const domainSnapshots = pgTable(
  "domain_snapshots",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    origin: text("origin"),
    yyyymm: text("yyyymm"),
    tarih: date("tarih").notNull(),
    rankBucket: integer("rank_bucket"),
    rank: integer("rank"),
    kaynak: text("kaynak").notNull(), // 'crux' | 'cloudflare_radar' | 'digitalrank'
    kapsamDisi: boolean("kapsam_disi").notNull().default(false),
    // Bilinçli olarak mutlak ziyaret kolonu YOK (§4.2).
  },
  (t) => [index("domain_snapshots_domain_idx").on(t.domain, t.kaynak)],
);

export const domainOrigins = pgTable(
  "domain_origins",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    origin: text("origin").notNull(),
    rankBucket: integer("rank_bucket"),
    altAlanAdi: boolean("alt_alan_adi").notNull().default(false),
    kaynak: text("kaynak").notNull(),
    tarih: date("tarih").notNull(),
  },
  (t) => [uniqueIndex("domain_origins_uq").on(t.domain, t.origin, t.tarih)],
);

export const domainAdstxt = pgTable(
  "domain_adstxt",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    ssp: text("ssp").notNull(),
    sellerId: text("seller_id").notNull(),
    iliski: text("iliski").notNull(),
    tagId: text("tag_id"),
    sellersJsonDogrulandi: boolean("sellers_json_dogrulandi"),
    dogrulama: text("dogrulama"), // dogrulandi | bulunamadi | tip_uyusmuyor | alan_adi_uyusmuyor | gizli | sellers_json_yok
    sellerType: text("seller_type"),
    sellerName: text("seller_name"),
    kaynak: text("kaynak").notNull().default("adstxt_crawl"),
    cekilmeTarihi: timestamp("cekilme_tarihi", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("domain_adstxt_iliski_chk", sql`${t.iliski} in ('DIRECT', 'RESELLER')`),
    index("domain_adstxt_domain_idx").on(t.domain),
  ],
);

// --- Reach (P1) -----------------------------------------------------------
export const universeRefs = pgTable(
  "universe_refs",
  {
    id: serial("id").primaryKey(),
    hedefKitleTanimi: text("hedef_kitle_tanimi").notNull(),
    buyukluk: integer("buyukluk").notNull(),
    kaynak: text("kaynak").notNull(),
    kaynakUrl: text("kaynak_url"),
    tarih: date("tarih").notNull(),
  },
  (t) => [check("universe_refs_buyukluk_chk", sql`${t.buyukluk} > 0`)],
);

// --- Hedef kitle (P3) -----------------------------------------------------
export const audienceLibraries = pgTable("audience_libraries", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"), // null = admin kütüphanesi
  platform: platform(),
  dsp: text("dsp").notNull(),
  saglayici: text("saglayici").notNull(),
  segmentAdi: text("segment_adi").notNull(),
  kategori: text("kategori"),
  cpmTl: numeric("cpm_tl"),
  reach: integer("reach"),
  audienceId: text("audience_id"),
  kaynak: text("kaynak").notNull(),
  yuklenmeTarihi: timestamp("yuklenme_tarihi", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [platformCheck("audience_libraries", t.platform)]);

// --- Kullanıcı kayıtları (P5) --------------------------------------------
export const calcPresets = pgTable("calc_presets", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  arac: text("arac").notNull(),
  girdilerJson: jsonb("girdiler_json").notNull(),
  ad: text("ad").notNull(),
  createdAt: createdAt(),
});

/** Opsiyonel rapor kaydı — yalnızca kullanıcı açıkça "kaydet" derse (§M7). */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  ad: text("ad").notNull(),
  donem: text("donem"),
  metriklerJson: jsonb("metrikler_json").notNull(),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Reach modeli parametreleri (§M3) — kanal bazlı, admin panelden ayarlanır.
 * r: NBD yoğunlaşma (null = Poisson) · erisilebilir_oran: universe tavanı (0–1].
 * Editöryel ayardır; metot notu zorunlu.
 */
export const REACH_KANALLAR = ["genel", "display", "video", "ctv"] as const;
export const reachSettings = pgTable(
  "reach_settings",
  {
    id: serial("id").primaryKey(),
    platform: platform(),
    kanal: text("kanal").notNull(),
    nbdR: numeric("nbd_r"),
    erisilebilirOran: numeric("erisilebilir_oran").notNull().default("1"),
    metotNotu: text("metot_notu").notNull(),
    kaynak: text("kaynak").notNull().default("editoryel_tahmin"),
    tarih: date("tarih").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("reach_settings_kanal_chk", sql`${t.kanal} in ('genel', 'display', 'video', 'ctv')`),
    check("reach_settings_r_chk", sql`${t.nbdR} is null or ${t.nbdR} > 0`),
    check("reach_settings_oran_chk", sql`${t.erisilebilirOran} > 0 and ${t.erisilebilirOran} <= 1`),
    check("reach_settings_metot_chk", sql`length(trim(${t.metotNotu})) >= 20`),
    platformCheck("reach_settings", t.platform),
  ],
);

/**
 * Crawl günlüğü (§4.2c crawl etiği): domain başına günde birden fazla istek yapılmadığını
 * kanıtlar ve hata/robots durumlarını şeffaf tutar. Satır verisi değil, durum kaydıdır.
 */
export const crawlLog = pgTable(
  "crawl_log",
  {
    id: serial("id").primaryKey(),
    host: text("host").notNull(),
    tip: text("tip").notNull(), // adstxt | sellers | robots
    durum: text("durum").notNull(), // ok | yok | robots_engelledi | hata | cok_buyuk
    http: integer("http"),
    mesaj: text("mesaj"),
    tarih: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("crawl_log_host_idx").on(t.host, t.tip, t.tarih)],
);
