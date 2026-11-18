import { NextResponse } from "next/server";
import { getTickerData } from "@/lib/cpm/queries";

export const revalidate = 3600;

/** Tahmini CPM bantları (Katman A). Kaynak ve metot notları her hücrede. */
export async function GET() {
  const data = await getTickerData();
  return NextResponse.json({
    aciklama: "tahmini CPM bandı — public benchmark × editöryel Türkiye katsayısı. DSP forecast'i değildir.",
    ...data,
  });
}
