/** İstemciden gelen toplu özetin doğrulanması (ham satır içermez; boyut sınırlı). */
import { z } from "zod";

const num = z.number().finite().nullable();
const trend = z.object({ donem: z.string().max(10), impression: z.number(), klik: z.number(), harcama: z.number(), cpm: num, ctr: num });
const kir = z.object({ ad: z.string().max(200), impression: z.number(), harcama: z.number(), klik: num, donusum: num, pay: z.number(), ctr: num, cpa: num, cpm: num });
const alanlar = ["impression", "klik", "harcama", "gorulebilir", "olculen", "videoBaslama", "videoTamamlama", "donusum", "donusumDegeri", "frekans", "reach"] as const;

export const summarySchema = z.object({
  satir: z.number().int().nonnegative(),
  donem: z.object({ bas: z.string().max(10).nullable(), son: z.string().max(10).nullable() }),
  totals: z.object(Object.fromEntries(alanlar.map((a) => [a, num])) as Record<(typeof alanlar)[number], typeof num>),
  kpi: z.object({
    cpm: num,
    ctr: num,
    cpc: num,
    viewability: num,
    viewabilityPayda: z.enum(["olculen", "impression"]).nullable(),
    vcpm: num,
    vcr: num,
    cpcv: num,
    cpa: num,
    cvr: num,
    roas: num,
  }),
  gunluk: z.array(trend).max(400),
  haftalik: z.array(trend).max(60),
  kirilim: z.object({ olcut: z.enum(["cpa", "ctr"]), enIyi: z.array(kir).max(5), enKotu: z.array(kir).max(5), satirSayisi: z.number() }).nullable(),
  frekans: z.array(z.object({ kova: z.string().max(10), pay: z.number() })).max(6).nullable(),
  pacing: z
    .object({
      harcanmasiGereken: z.number(),
      sapmaYuzde: num,
      fark: z.number(),
      kalanButce: z.number(),
      kalanGun: z.number(),
      gerekenGunlukHarcama: num,
      tamamlanmaProjeksiyonu: num,
      durum: z.enum(["geride", "yolunda", "onde"]).nullable(),
      sonVeri: z.string().max(10),
    })
    .nullable(),
  duzeltilen: z.array(z.enum(alanlar)).max(2),
});

export const metaSchema = z.object({
  kampanya: z.string().trim().max(120).default(""),
  hazirlayan: z.string().trim().max(80).default(""),
  sablon: z.string().max(30).default("tanınmadı"),
});
