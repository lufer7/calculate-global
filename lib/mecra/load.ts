import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { mecraSchema, type Mecra } from "./schema";

const DIR = path.join(process.cwd(), "content", "mecra");

export const getAllMecra = cache((): Mecra[] => {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
      const parsed = mecraSchema.safeParse(data);
      if (!parsed.success) throw new Error(`content/mecra/${file}: ${parsed.error.message}`);
      return { ...parsed.data, slug: file.replace(/\.mdx$/, ""), govde: content.trim() };
    })
    .sort((a, b) => a.mecra.localeCompare(b.mecra, "tr"));
});

export function getMecra(slug: string): Mecra | undefined {
  return getAllMecra().find((m) => m.slug === slug);
}
