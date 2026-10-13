# Arkadaşlarla test (APK + iPhone)

Oyun, sunucu senin bilgisayarında çalışırken test edilir. Arkadaşların internetin her yerinden bağlanabilir: ücretsiz ve geçici bir HTTPS adresi (Cloudflare) açılır. Bunun için hesap açman gerekmez.

## 1. Test sunucusunu aç (her test gününde)

`arena-rpg` klasöründe bir terminal aç ve şunu yaz:

```bash
npm run test-server
```

- **İlk sefer:** Oyunun web sürümü hazırlanır ve `cloudflared` aracı indirilir (1-2 dakika).
- **Hazır olunca** terminalde kutu içinde bir adres görünür, ör. `https://kirmizi-elma-123.trycloudflare.com`. Bu adresi arkadaşlarına gönder.
- **Açık kalma:** Terminal penceresi açık ve bilgisayar uyanık kaldığı sürece oyun çalışır.
- **Adres değişir:** Komutu her kapatıp açtığında adres değişir; yenisini tekrar gönder. Hesaplar ve ilerleme silinmez, `apps/server/arena-test.db` dosyasında durur.
- **E-posta yok:** Test sunucusu e-posta göndermez. Kayıt kodu uygulamada kendiliğinden doldurulur.

## 2. Android: APK

1. **APK'yı bul:** APK, GitHub'da kendiliğinden derlenir. Depoda **Releases** bölümünde en üstteki "Aegis test APK #N" kaydında `Aegis-test-N.apk` dosyası bulunur. Aynı dosya **Actions → Android test APK** çalışmasında "Artifacts" altında da durur.
2. **Gönder:** Bu dosyayı arkadaşlarına gönder (WhatsApp, Drive vb.).
3. **Kur:** Telefonda dosyayı aç, "Bilinmeyen kaynaklardan yüklemeye izin ver" de, ardından **Yükle**.
4. **Bağlan:** Giriş ekranının altında **"Sunucu adresini değiştir"** düğmesine dokun, test adresini yaz ve **Kaydet ve dene** de.

Uygulamada bir şey değiştiğinde yeni APK kendiliğinden derlenir (yaklaşık 20-30 dakika). Elle başlatmak için GitHub'da **Actions → Android test APK → Run workflow**.

## 3. iPhone (ve bilgisayar)

Apple, mağaza dışından uygulama kurdurmaz. TestFlight için yıllık 99 $ Apple Developer hesabı gerekir. Test için en kolay yol web sürümüdür:

1. Test adresini **Safari**'de aç.
2. **Paylaş** düğmesine, sonra **Ana Ekrana Ekle**'ye dokun.
3. Ana ekranda Aegis simgesi belirir ve tam ekran açılır.

Bilgisayardan oynamak için aynı adresi tarayıcıda açmak yeterli.

## Notlar

- Test sunucusu kişisel bir denemedir. Herkese açık yayın için `docs/DEPLOY.md` dosyasındaki adımlarla 7/24 açık bir sunucu kurulmalıdır.
- Test APK'sı test imzasıyla imzalanır; mağazaya yüklenemez, yalnızca arkadaş testi içindir.
- Telefon ve bilgisayar aynı Wi-Fi'daysa, adres olarak bilgisayarın yerel IP'si de yazılabilir (ör. `192.168.1.20`).
