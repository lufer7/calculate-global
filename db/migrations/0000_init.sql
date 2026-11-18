CREATE TABLE "audience_libraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"dsp" text NOT NULL,
	"saglayici" text NOT NULL,
	"segment_adi" text NOT NULL,
	"kategori" text,
	"cpm_tl" numeric,
	"reach" integer,
	"audience_id" text,
	"kaynak" text NOT NULL,
	"yuklenme_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_libraries_platform_chk" CHECK ("audience_libraries"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "calc_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"arac" text NOT NULL,
	"girdiler_json" jsonb NOT NULL,
	"ad" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"dsp" text,
	"satin_alma" text[] DEFAULT '{}'::text[] NOT NULL,
	"format" text NOT NULL,
	"oran" text,
	"sure" integer[],
	"dosya" text,
	"bitrate" text,
	"tiklanabilir" boolean,
	"cpm_min" numeric,
	"cpm_max" numeric,
	"kaynak" text NOT NULL,
	"kaynak_url" text NOT NULL,
	"son_dogrulama" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"ad" text NOT NULL,
	"tur" text NOT NULL,
	"kanal" text[] DEFAULT '{}'::text[] NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "channels_slug_unique" UNIQUE("slug"),
	CONSTRAINT "channels_platform_chk" CHECK ("channels"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "cpm_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"format" text NOT NULL,
	"katsayi" numeric NOT NULL,
	"metot_notu" text NOT NULL,
	"kaynak" text DEFAULT 'editoryel_tahmin' NOT NULL,
	"gecerlilik_baslangic" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cpm_adjustments_katsayi_chk" CHECK ("cpm_adjustments"."katsayi" > 0),
	CONSTRAINT "cpm_adjustments_metot_chk" CHECK (length(trim("cpm_adjustments"."metot_notu")) >= 20),
	CONSTRAINT "cpm_adjustments_kaynak_chk" CHECK ("cpm_adjustments"."kaynak" = 'editoryel_tahmin'),
	CONSTRAINT "cpm_adjustments_platform_chk" CHECK ("cpm_adjustments"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "cpm_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"format" text NOT NULL,
	"kanal" text,
	"dsp" text,
	"satin_alma" text,
	"katman" text DEFAULT 'A' NOT NULL,
	"para_birimi" text NOT NULL,
	"deger_min" numeric NOT NULL,
	"deger_max" numeric NOT NULL,
	"p25" numeric,
	"p75" numeric,
	"ornek_sayisi" integer,
	"kur_degeri" numeric NOT NULL,
	"kur_tarihi" date NOT NULL,
	"kur_kaynagi" text NOT NULL,
	"kaynak" text NOT NULL,
	"kaynak_adi" text NOT NULL,
	"kaynak_url" text,
	"donem" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cpm_benchmarks_kaynak_chk" CHECK ("cpm_benchmarks"."kaynak" in ('public_benchmark', 'topluluk', 'editoryel_tahmin')),
	CONSTRAINT "cpm_benchmarks_para_chk" CHECK ("cpm_benchmarks"."para_birimi" in ('USD', 'EUR', 'TRY')),
	CONSTRAINT "cpm_benchmarks_katman_chk" CHECK ("cpm_benchmarks"."katman" in ('A', 'B')),
	CONSTRAINT "cpm_benchmarks_bant_chk" CHECK ("cpm_benchmarks"."deger_min" > 0 and "cpm_benchmarks"."deger_max" >= "cpm_benchmarks"."deger_min"),
	CONSTRAINT "cpm_benchmarks_kur_chk" CHECK ("cpm_benchmarks"."kur_degeri" > 0),
	CONSTRAINT "cpm_benchmarks_donem_chk" CHECK ("cpm_benchmarks"."donem" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "cpm_benchmarks_platform_chk" CHECK ("cpm_benchmarks"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "cpm_seasonality" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"ay" smallint NOT NULL,
	"ozel_donem" text,
	"format" text,
	"katsayi" numeric NOT NULL,
	"kaynak" text NOT NULL,
	"not" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cpm_seasonality_ay_chk" CHECK ("cpm_seasonality"."ay" between 1 and 12),
	CONSTRAINT "cpm_seasonality_katsayi_chk" CHECK ("cpm_seasonality"."katsayi" > 0),
	CONSTRAINT "cpm_seasonality_platform_chk" CHECK ("cpm_seasonality"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "cpm_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_girdi" integer DEFAULT 8 NOT NULL,
	"min_katkici" integer DEFAULT 5 NOT NULL,
	"min_gosterim" integer DEFAULT 5 NOT NULL,
	"pencere_gun" integer DEFAULT 90 NOT NULL,
	"tutarlilik_esigi" numeric DEFAULT '0.40' NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cpm_settings_tek_satir_chk" CHECK ("cpm_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "cpm_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"format" text NOT NULL,
	"dsp" text,
	"mecra" text,
	"satin_alma" text,
	"hedefleme" text,
	"ay" text NOT NULL,
	"cpm_tl" numeric NOT NULL,
	"onaylandi" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"kaynak" text DEFAULT 'topluluk' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cpm_submissions_kaynak_chk" CHECK ("cpm_submissions"."kaynak" = 'topluluk'),
	CONSTRAINT "cpm_submissions_cpm_chk" CHECK ("cpm_submissions"."cpm_tl" > 0),
	CONSTRAINT "cpm_submissions_platform_chk" CHECK ("cpm_submissions"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
CREATE TABLE "domain_adstxt" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"ssp" text NOT NULL,
	"seller_id" text NOT NULL,
	"iliski" text NOT NULL,
	"tag_id" text,
	"sellers_json_dogrulandi" boolean,
	"kaynak" text DEFAULT 'adstxt_crawl' NOT NULL,
	"cekilme_tarihi" timestamp with time zone NOT NULL,
	CONSTRAINT "domain_adstxt_iliski_chk" CHECK ("domain_adstxt"."iliski" in ('DIRECT', 'RESELLER'))
);
--> statement-breakpoint
CREATE TABLE "domain_origins" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"origin" text NOT NULL,
	"rank_bucket" integer,
	"alt_alan_adi" boolean DEFAULT false NOT NULL,
	"kaynak" text NOT NULL,
	"tarih" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"origin" text,
	"yyyymm" text,
	"tarih" date NOT NULL,
	"rank_bucket" integer,
	"rank" integer,
	"kaynak" text NOT NULL,
	"kapsam_disi" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"domain" text PRIMARY KEY NOT NULL,
	"kategori" text,
	"iab_kategori" text,
	"kategori_kaynagi" text,
	"ilk_gorulme" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"donem" text,
	"metrikler_json" jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"slug" text PRIMARY KEY NOT NULL,
	"terim" text NOT NULL,
	"acik" text,
	"kategori" text[] DEFAULT '{}'::text[] NOT NULL,
	"seviye" text NOT NULL,
	"govde_mdx" text NOT NULL,
	"ilgili" text[] DEFAULT '{}'::text[] NOT NULL,
	"kaynak" text DEFAULT 'editoryel' NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terms_seviye_chk" CHECK ("terms"."seviye" in ('temel', 'orta', 'ileri'))
);
--> statement-breakpoint
CREATE TABLE "universe_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"hedef_kitle_tanimi" text NOT NULL,
	"buyukluk" integer NOT NULL,
	"kaynak" text NOT NULL,
	"kaynak_url" text,
	"tarih" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_specs" ADD CONSTRAINT "channel_specs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cpm_benchmarks_format_donem_idx" ON "cpm_benchmarks" USING btree ("format","donem");--> statement-breakpoint
CREATE INDEX "domain_adstxt_domain_idx" ON "domain_adstxt" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_origins_uq" ON "domain_origins" USING btree ("domain","origin","tarih");--> statement-breakpoint
CREATE INDEX "domain_snapshots_domain_idx" ON "domain_snapshots" USING btree ("domain","kaynak");