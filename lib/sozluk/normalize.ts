/** Türkçe karakter normalizasyonu (arama için): ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c, İ→i. */
const MAP: Record<string, string> = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c", â: "a", î: "i", û: "u" };

export function trNormalize(input: string): string {
  return input
    .replace(/[ıİşŞğĞüÜöÖçÇâîû]/g, (c) => MAP[c]!)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** "MRC Standardı" → "mrc-standardi", "ads.txt" → "ads-txt", "First/Second" → "first-second" */
export function slugify(input: string): string {
  return trNormalize(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
