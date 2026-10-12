# Yayın Öncesi Kontrol Listesi

KVKK/GDPR maddeleri için güncel liste: [`KVKK_COMPLIANCE.md`](KVKK_COMPLIANCE.md) §3.

## Mağaza ve tüketici
- [ ] Gizlilik politikası (`PRIVACY_NOTICE.md`) ve kullanım koşulları (`TERMS.md`) herkese açık bir adreste yayında.
- [ ] Hesap silme için web sayfası var (Google Play şartı); uygulama içinden silme zaten mevcut.
- [ ] Apple App Privacy ve Google Play Data Safety formları `KVKK_COMPLIANCE.md` §3'e göre dolduruldu.
- [ ] Yaş derecelendirmesi (IARC / App Store) yapıldı.
- [ ] Ücretli rastgele ödül kutusu yok.
- [ ] Mağaza başlığı, açıklaması, anahtar kelimeleri ve görsellerinde başka bir oyunun veya şirketin markası yok (ör. Gladiatus, Gameforge, Albion).

## Telif / marka
- [ ] Oyun adı için TÜRKPATENT / EUIPO marka araştırması yapıldı.
- [ ] Bütün görsel, font ve seslerin kaynağı `ASSET_LICENSES.md` dosyasında. "Albion tarzı" görseller sıfırdan üretilir; başka oyunun görselleri birebir taklit edilmez.

## Sunucu
- [ ] HTTPS, erişim günlüğü kapalı, `NODE_ENV=production`, gerçek SMTP (`ADMIN_SETUP.md` §5).
- [ ] Yönetici IP izin listesi ayarlı.
- [ ] Şifreli günlük yedek, 30 gün saklama.
