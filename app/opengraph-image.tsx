import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "PRGTURK — Programatik Masası";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ etiket: "// programatik masası", baslik: "Programatiğin tamamı, tek masada.", alt: "Sözlük · Metrik Hesapla · Reach · Envanter · Hedef Kitle · Rapor" });
}
