CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tip" text NOT NULL,
	"ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_tip_chk" CHECK ("favorites"."tip" in ('terim', 'mecra', 'arac'))
);
--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "alt_platform" text;--> statement-breakpoint
ALTER TABLE "cpm_benchmarks" ADD COLUMN "alt_platform" text;--> statement-breakpoint
ALTER TABLE "cpm_submissions" ADD COLUMN "alt_platform" text;--> statement-breakpoint
ALTER TABLE "cpm_submissions" ADD COLUMN "kanal" text;--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_uq" ON "favorites" USING btree ("user_id","tip","ref");--> statement-breakpoint
CREATE INDEX "cpm_submissions_cell_idx" ON "cpm_submissions" USING btree ("platform","format","created_at");--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_alt_platform_chk" CHECK (("channels"."platform" = 'programmatic' and "channels"."alt_platform" is null) or ("channels"."platform" = 'social' and "channels"."alt_platform" in ('meta', 'tiktok')));--> statement-breakpoint
ALTER TABLE "cpm_benchmarks" ADD CONSTRAINT "cpm_benchmarks_alt_platform_chk" CHECK (("cpm_benchmarks"."platform" = 'programmatic' and "cpm_benchmarks"."alt_platform" is null) or ("cpm_benchmarks"."platform" = 'social' and "cpm_benchmarks"."alt_platform" in ('meta', 'tiktok')));--> statement-breakpoint
ALTER TABLE "cpm_submissions" ADD CONSTRAINT "cpm_submissions_ay_chk" CHECK ("cpm_submissions"."ay" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
ALTER TABLE "cpm_submissions" ADD CONSTRAINT "cpm_submissions_alt_platform_chk" CHECK (("cpm_submissions"."platform" = 'programmatic' and "cpm_submissions"."alt_platform" is null) or ("cpm_submissions"."platform" = 'social' and "cpm_submissions"."alt_platform" in ('meta', 'tiktok')));