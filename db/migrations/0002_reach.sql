CREATE TABLE "reach_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'programmatic' NOT NULL,
	"kanal" text NOT NULL,
	"nbd_r" numeric,
	"erisilebilir_oran" numeric DEFAULT '1' NOT NULL,
	"metot_notu" text NOT NULL,
	"kaynak" text DEFAULT 'editoryel_tahmin' NOT NULL,
	"tarih" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_settings_kanal_chk" CHECK ("reach_settings"."kanal" in ('genel', 'display', 'video', 'ctv')),
	CONSTRAINT "reach_settings_r_chk" CHECK ("reach_settings"."nbd_r" is null or "reach_settings"."nbd_r" > 0),
	CONSTRAINT "reach_settings_oran_chk" CHECK ("reach_settings"."erisilebilir_oran" > 0 and "reach_settings"."erisilebilir_oran" <= 1),
	CONSTRAINT "reach_settings_metot_chk" CHECK (length(trim("reach_settings"."metot_notu")) >= 20),
	CONSTRAINT "reach_settings_platform_chk" CHECK ("reach_settings"."platform" in ('programmatic', 'social'))
);
--> statement-breakpoint
ALTER TABLE "universe_refs" ADD CONSTRAINT "universe_refs_buyukluk_chk" CHECK ("universe_refs"."buyukluk" > 0);