-- Supabase, public şemadaki tabloları anon anahtarla PostgREST üzerinden açar.
-- Uygulama DB'ye yalnızca server-side (DATABASE_URL) bağlanır; bu yüzden tüm tablolarda
-- RLS açık ve politika YOK → anon/authenticated rolleri hiçbir satırı göremez/yazamaz.
ALTER TABLE "terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channel_specs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cpm_benchmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cpm_adjustments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cpm_seasonality" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cpm_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cpm_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domain_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domain_origins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domain_adstxt" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "universe_refs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audience_libraries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calc_presets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Katman B eşikleri için tek ayar satırı (§4.1)
INSERT INTO "cpm_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
