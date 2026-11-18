import { ogImage, OG_SIZE } from "@/lib/og";
import { getTool, TOOLS } from "@/lib/calc/tools";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Metrik Hesapla";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ arac: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ arac: string }> }) {
  const t = getTool((await params).arac);
  return ogImage({ etiket: "// metrik hesapla", baslik: t?.baslik ?? "Metrik Hesapla", alt: t ? `${t.soru} ${t.formul}` : undefined });
}
