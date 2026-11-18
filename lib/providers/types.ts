/**
 * Veri sağlayıcı arayüzü (§M5 provider pattern). Biri kapanınca diğerine geçilebilir,
 * yeni kaynak eklenebilir. Her provider dosyası §4.2c lisans yorum bloğuyla başlar ve
 * aynı bilgiyi makine okunur `LISANS` nesnesinde taşır.
 */
export type LicenseLevel = "own" | "public" | "display";

export type Lisans = {
  kaynak: string;
  seviye: LicenseLevel;
  lisansAdi: string | null; // örn. "CC BY 4.0" — doğrulanmamışsa null
  sartlarOkunduTarihi: string | null; // YYYY-MM-DD — null ise production'da KAPALI
  publicSayfadaGosterilebilir: boolean;
  bulkCsvExportaDahil: boolean;
  atif: string | null; // arayüzde gösterilecek atıf metni
  not: string;
};

export type DomainSize = {
  domain: string;
  rankBucket: number | null;
  rank: number | null;
  kaynak: string;
  tarih: string; // YYYY-MM-DD
  yyyymm?: string | null;
  kapsamDisi: boolean;
  kategoriler?: string[];
};

export interface SizeProvider {
  name: string;
  licenseLevel: LicenseLevel;
  lisans: Lisans;
  getDomain(domain: string): Promise<DomainSize | null>;
}

/**
 * §6.10: lisans bloğu doğrulanmamış provider production'a çıkmaz.
 * Geliştirmede test için çalışır ama arayüz uyarı gösterir.
 */
export function providerEnabled(l: Lisans, env: string | undefined = process.env.NODE_ENV): boolean {
  if (l.seviye === "own") return true;
  if (env !== "production") return true;
  return l.sartlarOkunduTarihi !== null && /^\d{4}-\d{2}-\d{2}$/.test(l.sartlarOkunduTarihi);
}
