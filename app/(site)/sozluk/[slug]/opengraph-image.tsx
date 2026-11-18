import { ogImage, OG_SIZE } from "@/lib/og";
import { getAllTerms, getTerm } from "@/lib/sozluk/load";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Programatik Sözlük";

export function generateStaticParams() {
  return getAllTerms().map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTerm((await params).slug);
  const tanim = t?.tanim ?? "";
  return ogImage({
    etiket: `// sözlük${t?.acik ? ` · ${t.acik}` : ""}`,
    baslik: t ? `${t.terim} nedir?` : "Sözlük",
    alt: tanim.length > 140 ? `${tanim.slice(0, 137)}...` : tanim,
  });
}
