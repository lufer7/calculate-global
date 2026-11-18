/**
 * Bir terim başka bir terimin açıklamasında geçiyorsa otomatik link (§M1).
 * Saf fonksiyon: metni parçalara böler, eşleşen ilk geçişi link parçasına çevirir.
 *
 * Eşleşme kuralları:
 * - Kısa kısaltmalar (≤4 karakter ve büyük harf içeren: "PG", "SSP", "CTV") büyük/küçük harf DUYARLI.
 *   Böylece "pg" ya da "Ssp" yanlış eşleşmez.
 * - Diğerleri ("Header Bidding", "ads.txt") duyarsız.
 * - Kelime sınırı: önünde/arkasında harf veya rakam olamaz. Türkçe ek apostrofla geldiği için
 *   "SSP'ler", "DSP'nin" eşleşir.
 * - Uzun adlar önce denenir ("Data Clean Room", "Clean Room"dan önce).
 * - Sayfa başına her terime en fazla bir link; terim kendine link vermez.
 */

export type Matcher = { slug: string; names: string[]; tanim: string };
export type Segment = { type: "text"; value: string } | { type: "link"; value: string; slug: string; tanim: string };

type Compiled = { slug: string; tanim: string; re: RegExp; len: number };

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileMatchers(matchers: Matcher[]): Compiled[] {
  const out: Compiled[] = [];
  for (const m of matchers) {
    for (const name of m.names) {
      if (name.trim().length < 2) continue;
      const caseSensitive = name.length <= 4 && /[A-Z]/.test(name);
      out.push({
        slug: m.slug,
        tanim: m.tanim,
        re: new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, caseSensitive ? "u" : "iu"),
        len: name.length,
      });
    }
  }
  return out.sort((a, b) => b.len - a.len);
}

/** `used` paylaşılan küme: aynı sayfadaki tüm metin düğümleri boyunca tek link kuralını sağlar. */
export function linkify(text: string, compiled: Compiled[], used: Set<string>, self: string): Segment[] {
  for (const c of compiled) {
    if (c.slug === self || used.has(c.slug)) continue;
    const m = c.re.exec(text);
    if (!m) continue;
    used.add(c.slug);
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    return [
      ...(before ? linkify(before, compiled, used, self) : []),
      { type: "link", value: m[0], slug: c.slug, tanim: c.tanim },
      ...(after ? linkify(after, compiled, used, self) : []),
    ];
  }
  return [{ type: "text", value: text }];
}
