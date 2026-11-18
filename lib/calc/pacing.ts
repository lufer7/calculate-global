/**
 * Pacing (§M2):
 *   harcanması gereken = toplam bütçe × (geçen gün / toplam gün)
 *   sapma %            = (gerçekleşen harcama / harcanması gereken − 1) × 100
 *
 * Varsayım: doğrusal (eşit günlük) dağıtım. Hafta sonu / sezon ağırlıklı flight'larda
 * DSP'nin kendi pacing hedefi esas alınmalıdır.
 * Tolerans: ±%5 "yolunda" kabul edilir (sektörde yaygın kullanılan eşik; ayarlanabilir).
 */

export type PacingInput = {
  toplamButce: number;
  toplamGun: number;
  gecenGun: number;
  harcanan: number;
  tolerans?: number; // yüzde puanı, varsayılan 5
};

export type PacingStatus = "geride" | "yolunda" | "onde";

export type PacingResult = {
  harcanmasiGereken: number;
  sapmaYuzde: number | null; // geçen gün 0 iken tanımsız
  fark: number; // harcanan − harcanması gereken (negatif = geride)
  kalanButce: number;
  kalanGun: number;
  gerekenGunlukHarcama: number | null; // kalan gün 0 iken tanımsız
  tamamlanmaProjeksiyonu: number | null; // mevcut hızla dönem sonunda harcanacak tutar
  durum: PacingStatus | null;
};

export function pacing(input: PacingInput): PacingResult | null {
  const { toplamButce, toplamGun, gecenGun, harcanan } = input;
  const tolerans = input.tolerans ?? 5;
  const nums = [toplamButce, toplamGun, gecenGun, harcanan, tolerans];
  if (!nums.every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (toplamGun === 0 || gecenGun > toplamGun) return null;

  const harcanmasiGereken = toplamButce * (gecenGun / toplamGun);
  const sapmaYuzde = harcanmasiGereken === 0 ? null : (harcanan / harcanmasiGereken - 1) * 100;
  const kalanGun = toplamGun - gecenGun;
  const kalanButce = toplamButce - harcanan;
  const gerekenGunlukHarcama = kalanGun === 0 ? null : kalanButce / kalanGun;
  const tamamlanmaProjeksiyonu = gecenGun === 0 ? null : (harcanan / gecenGun) * toplamGun;

  let durum: PacingStatus | null = null;
  if (sapmaYuzde !== null) {
    if (sapmaYuzde < -tolerans) durum = "geride";
    else if (sapmaYuzde > tolerans) durum = "onde";
    else durum = "yolunda";
  }

  return {
    harcanmasiGereken,
    sapmaYuzde,
    fark: harcanan - harcanmasiGereken,
    kalanButce,
    kalanGun,
    gerekenGunlukHarcama,
    tamamlanmaProjeksiyonu,
    durum,
  };
}
