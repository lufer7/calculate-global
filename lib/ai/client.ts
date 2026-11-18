import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/**
 * Anthropic API — yalnızca server-side. API anahtarı client bundle'a girmez (§6.3).
 * Model çıktısı her zaman zod şemasıyla doğrulanır; serbest metin döndürmez (§M6).
 * Güvenlik sınıflandırıcısı reddederse sunucu taraflı fallback devreye girer.
 */
export const AI_MODEL = "claude-opus-5-5";

let _client: Anthropic | null = null;

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function client(): Anthropic {
  if (!_client) _client = new Anthropic({ timeout: 240_000, maxRetries: 2 });
  return _client;
}

export type StructuredResult<T> = { ok: true; data: T; model: string } | { ok: false; neden: "yapilandirilmadi" | "reddedildi" | "gecersiz" | "hata"; mesaj: string };

export async function structuredCall<S extends z.ZodType>(
  schema: S,
  system: string,
  user: string,
  opts: { effort?: "low" | "medium" | "high" | "xhigh"; maxTokens?: number } = {},
): Promise<StructuredResult<z.infer<S>>> {
  if (!aiConfigured()) return { ok: false, neden: "yapilandirilmadi", mesaj: "ANTHROPIC_API_KEY tanımlı değil" };
  try {
    const res = await client().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(schema) },
    });
    if (res.stop_reason === "refusal") return { ok: false, neden: "reddedildi", mesaj: "model isteği reddetti" };
    if (res.stop_reason === "max_tokens") return { ok: false, neden: "gecersiz", mesaj: "çıktı uzunluk sınırına takıldı" };
    if (res.parsed_output == null) return { ok: false, neden: "gecersiz", mesaj: "çıktı şemaya uymadı" };
    return { ok: true, data: res.parsed_output as z.infer<S>, model: res.model };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, neden: "hata", mesaj: "yapay zekâ servisi yoğun, biraz sonra dene" };
    if (e instanceof Anthropic.APIError) return { ok: false, neden: "hata", mesaj: `yapay zekâ servisi hatası (${e.status ?? "?"})` };
    return { ok: false, neden: "hata", mesaj: "yapay zekâ servisine ulaşılamadı" };
  }
}
