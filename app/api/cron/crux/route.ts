import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { ingestCrux, LISANS, prevYyyymm } from "@/lib/providers/crux";
import { gcpConfigured } from "@/lib/providers/gcp";
import { providerEnabled } from "@/lib/providers/types";

export const maxDuration = 800;

/**
 * Aylık CrUX ingest (ayın 15'i, tekrar 22'si). CrUX takip eden ayın 2. Salı'sı yayınlanır:
 * önce geçen ayın tablosu denenir, yoksa bir önceki ay (yyyymm alanında hangi ayın verisi olduğu saklanır).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  if (!providerEnabled(LISANS)) return NextResponse.json({ hata: "CrUX sağlayıcısı kapalı: lisans şartları okunmadı (lib/providers/crux.ts)" }, { status: 409 });
  if (!gcpConfigured()) return NextResponse.json({ hata: "kişisel GCP kimlik bilgileri yok" }, { status: 503 });
  const now = new Date();
  const thisMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const target = prevYyyymm(thisMonth);
  for (const y of [target, prevYyyymm(target)]) {
    try {
      return NextResponse.json(await ingestCrux(y));
    } catch (e) {
      const msg = (e as Error).message;
      if (!/404|not found/i.test(msg)) return NextResponse.json({ hata: msg }, { status: 500 });
    }
  }
  return NextResponse.json({ hata: "CrUX tablosu bulunamadı" }, { status: 404 });
}
