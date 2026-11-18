import { z } from "zod";
import { KATEGORI_SLUGLARI } from "./kategoriler";

export const frontmatterSchema = z.object({
  terim: z.string().min(1),
  acik: z.string().optional(),
  kategori: z.array(z.enum(KATEGORI_SLUGLARI)).min(1),
  seviye: z.enum(["temel", "orta", "ileri"]),
  ilgili: z.array(z.string()).default([]),
  esanlam: z.array(z.string()).default([]), // otomatik link için ek adlar
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export type Term = Frontmatter & {
  slug: string;
  tanim: string; // "Tek cümlede" bölümünden
  govde: string; // markdown gövde
  ilgiliSluglar: string[];
};

export const TANIM_BASLIGI = "## Tek cümlede";

/** Gövdedeki "## Tek cümlede" bölümünün ilk paragrafını çıkarır. */
export function extractTanim(body: string): string | null {
  const i = body.indexOf(TANIM_BASLIGI);
  if (i === -1) return null;
  const rest = body.slice(i + TANIM_BASLIGI.length).trimStart();
  const end = rest.search(/\n\s*\n|\n##/);
  const t = (end === -1 ? rest : rest.slice(0, end)).trim();
  return t || null;
}
