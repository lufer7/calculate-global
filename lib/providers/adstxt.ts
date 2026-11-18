/**
 * Kaynak: Kendi crawl'ımız — yayıncıların herkese açık /ads.txt ve SSP'lerin /sellers.json dosyaları
 * Lisans seviyesi: own (bize ait; IAB Tech Lab standartlarıyla herkese açık yayımlanan dosyalar)
 * Şartların okunduğu tarih: — (üçüncü taraf lisansı yok; crawl etiği §4.2c uygulanır)
 * Public sayfada gösterilebilir: evet
 * Bulk CSV export'a dahil: evet
 */
import type { Lisans } from "./types";

export const LISANS: Lisans = {
  kaynak: "ads.txt / sellers.json crawl",
  seviye: "own",
  lisansAdi: null,
  sartlarOkunduTarihi: null,
  publicSayfadaGosterilebilir: true,
  bulkCsvExportaDahil: true,
  atif: null,
  not: "User-Agent'ta iletişim URL'i, robots.txt'e uyum, host başına günde en fazla bir istek.",
};
