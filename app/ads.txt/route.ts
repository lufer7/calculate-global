/**
 * Kendi ads.txt'imiz (§6.8). AdSense yayıncı kimliği tanımlıysa Google satırı eklenir.
 * NEXT_PUBLIC_ADSENSE_CLIENT biçimi: ca-pub-XXXXXXXXXXXXXXXX
 */
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pub = client?.replace(/^ca-/, "");
  const lines = [
    `# ads.txt — ${SITE_URL.replace(/^https?:\/\//, "")}`,
    "# Programatik sitesinin ads.txt'i olmaması komik olurdu.",
    pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0` : "# AdSense yayıncı kimliği tanımlandığında Google satırı burada yer alacak.",
    `contact=${SITE_URL}/hakkinda`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
