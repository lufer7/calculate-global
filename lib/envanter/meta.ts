/** Ana sayfa HTML'inden yalnızca <title> ve meta description çıkarır (saf). */
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMeta(html: string): { title: string | null; description: string | null } {
  const head = html.slice(0, 200_000);
  const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  let description: string | null = null;
  for (const m of metas) {
    if (/(name|property)\s*=\s*["'](description|og:description)["']/i.test(m)) {
      const c = m.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
      const v = c ? decode(c[1] ?? c[2]!) : "";
      if (v) {
        description = v.slice(0, 400);
        break;
      }
    }
  }
  const title = t ? decode(t[1]!).slice(0, 200) || null : null;
  return { title, description };
}
