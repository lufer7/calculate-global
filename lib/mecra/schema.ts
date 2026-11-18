import { z } from "zod";

/**
 * Mecra & Spec (§M4). Kural: bilinmeyen alan BOŞ bırakılır, tahmini sayı yazılmaz.
 * Her kayıt kaynak ve son doğrulama tarihi taşır; 6 aydan eski ya da hiç doğrulanmamış
 * kayıtlar "doğrulanmalı" etiketi alır.
 */
export const KANALLAR = { ctv: "CTV", mobil: "Mobil", desktop: "Desktop", ses: "Ses", dooh: "DOOH", uygulama: "Uygulama" } as const;
export const SATIN_ALMA = ["PG", "PMP", "Open Auction", "Self-serve", "Managed Service", "Doğrudan (IO)"] as const;

const dspSchema = z.object({
  dsp: z.string().min(2),
  satin_alma: z.array(z.enum(SATIN_ALMA)).default([]),
  oncelik: z.number().int().positive().optional(),
  notlar: z.string().optional(),
});

const formatSchema = z.object({
  ad: z.string().min(2),
  oran: z.string().optional(),
  sure: z.array(z.number().positive()).optional(),
  dosya: z.string().optional(),
  bitrate: z.string().optional(),
  max_boyut: z.string().optional(),
  tiklanabilir: z.boolean().optional(),
});

const band = z.object({ min: z.number().positive(), max: z.number().positive(), para: z.enum(["TRY", "USD", "EUR"]) });

export const mecraSchema = z
  .object({
    mecra: z.string().min(2),
    kanal: z.array(z.enum(Object.keys(KANALLAR) as [keyof typeof KANALLAR, ...(keyof typeof KANALLAR)[]])).min(1),
    tur: z.string().min(2),
    ozet: z.string().min(10),
    dspler: z.array(dspSchema).default([]),
    formatlar: z.array(formatSchema).default([]),
    tahmini_cpm_bandi: band.extend({ kaynak: z.string().min(3), tarih: z.string() }).optional(),
    min_butce: band.pick({ min: true, para: true }).extend({ kaynak: z.string().min(3) }).optional(),
    olcumleme: z.array(z.string()).default([]),
    kaynak_ad: z.string().optional(),
    kaynak_url: z.string().url().optional(),
    son_dogrulama: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    dogrulama_notu: z.string().optional(),
  })
  .refine((m) => !m.son_dogrulama || !!m.kaynak_url, { message: "doğrulanmış kayıt kaynak_url taşımalı" })
  .refine((m) => !m.tahmini_cpm_bandi || m.tahmini_cpm_bandi.max >= m.tahmini_cpm_bandi.min, { message: "CPM bandı max ≥ min" });

export type MecraFrontmatter = z.infer<typeof mecraSchema>;
export type Mecra = MecraFrontmatter & { slug: string; govde: string };

export type Dogrulama = { durum: "guncel" | "eski" | "dogrulanmadi"; ay: number | null };

/** 6 aydan eski ya da hiç doğrulanmamış kayıt → "doğrulanmalı". */
export function dogrulamaDurumu(sonDogrulama: string | null, now: Date, esikAy = 6): Dogrulama {
  if (!sonDogrulama) return { durum: "dogrulanmadi", ay: null };
  const d = new Date(`${sonDogrulama}T00:00:00Z`);
  const ay = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth()) - (now.getUTCDate() < d.getUTCDate() ? 1 : 0);
  return { durum: ay >= esikAy ? "eski" : "guncel", ay };
}

export type MecraFiltre = { kanal?: string; dsp?: string; satinAlma?: string; format?: string; q?: string };

export function filtreleMecra<T extends Pick<Mecra, "mecra" | "kanal" | "dspler" | "formatlar" | "tur">>(list: T[], f: MecraFiltre): T[] {
  const q = f.q?.toLocaleLowerCase("tr-TR").trim();
  return list.filter(
    (m) =>
      (!f.kanal || (m.kanal as string[]).includes(f.kanal)) &&
      (!f.dsp || m.dspler.some((d) => d.dsp === f.dsp)) &&
      (!f.satinAlma || m.dspler.some((d) => (d.satin_alma as string[]).includes(f.satinAlma!))) &&
      (!f.format || m.formatlar.some((x) => x.ad === f.format)) &&
      (!q || m.mecra.toLocaleLowerCase("tr-TR").includes(q) || m.tur.toLocaleLowerCase("tr-TR").includes(q)),
  );
}
