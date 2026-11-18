import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/calc/tools";
import { getAllTerms } from "@/lib/sozluk/load";
import { getAllMecra } from "@/lib/mecra/load";
import { SITE_URL } from "@/lib/site";

// Yalnızca hazır modüller. Yapım aşamasındaki sayfalar noindex ve sitemap dışı.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/sozluk`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/hesapla`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/reach-tahmin`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/mecra`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...getAllMecra().map((m) => ({ url: `${SITE_URL}/mecra/${m.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...TOOLS.map((t) => ({ url: `${SITE_URL}/hesapla/${t.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...getAllTerms().map((t) => ({ url: `${SITE_URL}/sozluk/${t.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/hakkinda`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/gizlilik`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
