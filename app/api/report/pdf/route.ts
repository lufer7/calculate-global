import { z } from "zod";
import { NextResponse } from "next/server";
import { commentSchema } from "@/lib/report/comment";
import { renderReportPdf } from "@/lib/report/pdf";
import { metaSchema, summarySchema } from "@/lib/report/summary-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** PDF bellekte üretilir ve doğrudan döndürülür; diske/DB'ye yazılmaz. */
export async function POST(req: Request) {
  const parsed = z
    .object({ ozet: summarySchema, yorum: commentSchema.nullable(), meta: metaSchema })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: "istek doğrulanamadı" }, { status: 400 });
  const buf = await renderReportPdf(parsed.data.ozet, parsed.data.yorum, parsed.data.meta);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="rapor-yorumu.pdf"`,
      "cache-control": "no-store",
    },
  });
}
