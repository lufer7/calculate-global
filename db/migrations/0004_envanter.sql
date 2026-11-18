CREATE TABLE "crawl_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"tip" text NOT NULL,
	"durum" text NOT NULL,
	"http" integer,
	"mesaj" text,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_adstxt" ADD COLUMN "dogrulama" text;--> statement-breakpoint
ALTER TABLE "domain_adstxt" ADD COLUMN "seller_type" text;--> statement-breakpoint
ALTER TABLE "domain_adstxt" ADD COLUMN "seller_name" text;--> statement-breakpoint
CREATE INDEX "crawl_log_host_idx" ON "crawl_log" USING btree ("host","tip","tarih");