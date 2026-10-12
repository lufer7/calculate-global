# Yayın Öncesi Hukuki ve Gizlilik Kontrol Listesi

> Hukuki tavsiye değildir. Son kontrolü bir avukata yaptırın.

## Gizlilik / KVKK / GDPR
- [ ] `apps/mobile/src/config/privacy.ts`: `analytics: false`, `adsEnabled` durumu metinle uyumlu.
- [ ] `package.json` bağımlılıklarında analitik, crash, attribution veya reklam SDK'sı yok (`npm ls` ile kontrol).
- [ ] Uygulama ilk açılışta hiçbir ağ isteği yapmıyor (Proxyman/Charles/mitmproxy ile doğrulayın).
- [ ] Çevrimiçi özellikler açıldığında giden istek gövdelerinde isim veya cihaz bilgisi yok.
- [ ] Sunucuda `logger()` yok; ters proxy'de `access_log off` / Caddy'de `log` bloğu yok; barındırma panelindeki "request logging" kapalı.
- [ ] Redis kullanılıyorsa `save ""` ve `appendonly no` ayarlı; her anahtarın TTL'i var.
- [ ] Sunucu konumu belirlendi ve KVKK md. 9 (yurt dışı aktarım) değerlendirmesi yapıldı.
- [ ] VERBİS kayıt yükümlülüğü değerlendirildi (yıllık çalışan ve bilanço eşikleri; muafiyet koşulları güncel mevzuattan kontrol edilmeli).
- [ ] `docs/PRIVACY_NOTICE.md` dolduruldu, herkese açık bir URL'de yayında; uygulama içindeki özet metinle tutarlı.
- [ ] Android `allowBackup: false`; iOS privacy manifest güncel.
- [ ] "Tüm Verilerimi Sil" cihazda ve sunucuda test edildi.

## Mağazalar
- [ ] Apple Privacy Label ve Google Play Data Safety formu `ARCHITECTURE.md §9`'a göre dolduruldu.
- [ ] Yaş derecelendirmesi anketi (IARC / App Store) dolduruldu. Şiddet içeriği → PEGI 7/12 olası.
- [ ] Ücretli rastgele ödül kutusu yok. Varsa olasılıklar açıklanmalı ve ilgili ülke düzenlemeleri incelenmeli.
- [ ] "Satın almaları geri yükle" düğmesi mevcut.
- [ ] Mağaza başlığı, açıklaması, anahtar kelimeleri ve ekran görüntülerinde başka bir oyunun veya şirketin markası yok.

## Telif / Marka
- [ ] Oyun adı için TÜRKPATENT / EUIPO / USPTO marka araştırması yapıldı.
- [ ] Tüm görsel, font ve seslerin kaynağı ve lisansı `docs/ASSET_LICENSES.md` dosyasında kayıtlı.
- [ ] Hiçbir metin, eşya adı, görev metni veya değer tablosu başka bir oyundan alınmadı.
- [ ] UI düzeni ve ikonografi özgün.

## Tüketici hukuku
- [ ] Kullanım koşulları (EULA) hazırlandı: sanal eşyaların gerçek para karşılığı olmadığı, hizmetin "olduğu gibi" sunulduğu, sezon sıfırlamaları. Apple'ın standart EULA'sı da kullanılabilir.
- [ ] İade süreçleri mağazalara yönlendiriliyor; dijital içerikte cayma hakkı istisnası (Mesafeli Sözleşmeler Yönetmeliği) değerlendirildi.
- [ ] Yerel bildirimler varsa gece saatlerinde gönderilmiyor ve kapatılabiliyor.
