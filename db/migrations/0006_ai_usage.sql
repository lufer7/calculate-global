CREATE TABLE "ai_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"tip" text NOT NULL,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_usage_idx" ON "ai_usage" USING btree ("ip_hash","tip","tarih");