/**
 * Kanal / platform kavramı (§0, P5). Programatik dışında sosyal kanal (Meta, TikTok) aynı veri
 * modeline `platform='social'` + `alt_platform` ile eklenir; tablolar yeniden yapılandırılmaz.
 * Sosyal kanal arayüzü henüz yayında değil — model hazır.
 */
export const PLATFORMLAR = {
  programmatic: { ad: "Programatik", altlar: [] as readonly string[], yayinda: true },
  social: { ad: "Sosyal medya", altlar: ["meta", "tiktok"] as const, yayinda: false },
} as const;

export type Platform = keyof typeof PLATFORMLAR;
export const ALT_PLATFORM_AD: Record<string, string> = { meta: "Meta", tiktok: "TikTok" };
