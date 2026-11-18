import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { slugify } from "./normalize";
import { extractTanim, frontmatterSchema, type Term } from "./schema";

const DIR = path.join(process.cwd(), "content", "sozluk");

/** Tüm sözlük maddelerini okur ve doğrular. Bozuk dosya build'i kırar — sessizce yutulmaz. */
export const getAllTerms = cache((): Term[] => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
  const raw = files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
    const parsed = frontmatterSchema.safeParse(data);
    if (!parsed.success) throw new Error(`content/sozluk/${file}: ${parsed.error.message}`);
    const tanim = extractTanim(content);
    if (!tanim) throw new Error(`content/sozluk/${file}: "## Tek cümlede" bölümü yok`);
    return { ...parsed.data, slug, tanim, govde: content.trim() };
  });

  const byName = new Map<string, string>();
  for (const t of raw) {
    byName.set(slugify(t.terim), t.slug);
    byName.set(t.slug, t.slug);
  }
  return raw
    .map((t) => ({
      ...t,
      ilgiliSluglar: t.ilgili.map((n) => byName.get(slugify(n))).filter((s): s is string => !!s && s !== t.slug),
    }))
    .sort((a, b) => a.terim.localeCompare(b.terim, "tr"));
});

export function getTerm(slug: string): Term | undefined {
  return getAllTerms().find((t) => t.slug === slug);
}
