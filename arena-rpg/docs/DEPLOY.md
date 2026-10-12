# Oyunu yayına almak (canlı sunucu)

**Kısa cevap:** Sunucu kendi kendine sürekli açık kalmaz. Şu an oyun yalnızca senin bilgisayarın açıkken ve `npm run dev` çalışırken oynanabiliyor. Herkesin istediği zaman girebilmesi için gerekenler:

1. 7/24 açık bir sunucu (VPS).
2. Bir alan adı.
3. Bir e-posta gönderim servisi.
4. Mağazaya yüklenecek, bu sunucuya bağlanan bir uygulama derlemesi.

Bu klasördeki `deploy/` paketi sunucu tarafını tek komuta indirir. HTTPS sertifikası otomatik alınır ve yenilenir. Sunucu çökerse ya da makine yeniden başlarsa oyun kendiliğinden tekrar açılır.

## Aylık maliyet (yaklaşık)

| Kalem | Örnek | Ücret |
|---|---|---|
| VPS (2 vCPU, 4 GB RAM; birkaç bin oyuncuya yeter) | Hetzner, DigitalOcean, Türkiye'de bir sağlayıcı | 5–15 € / ay |
| Alan adı | ornekoyun.com | ~10–15 $ / yıl |
| E-posta gönderimi | Brevo, Mailjet, Amazon SES (AB bölgesi) | Başlangıçta ücretsiz katman |
| Google Play geliştirici hesabı | | Tek seferlik 25 $ |
| Apple Developer | | 99 $ / yıl |

**KVKK notu:** Sunucu yurt dışındaysa bu bir yurt dışına veri aktarımıdır. Ayrıntılar `KVKK_COMPLIANCE.md` dosyasında. Türkiye'de bir VPS seçmek bu yükü azaltır. Sağlayıcılarla veri işleme sözleşmesi yap.

## 1. Sunucuyu kur (bir kez)

1. **VPS kirala.** Ubuntu 24.04 seç. Sağlayıcı sana bir IP adresi verir.
2. **Alan adını yönlendir.** Alan adı panelinde bir **A kaydı** oluştur: `api.ornekoyun.com` → VPS'in IP adresi.
3. **Sunucuya bağlan ve Docker'ı kur:**
   ```bash
   ssh root@SUNUCU_IP
   curl -fsSL https://get.docker.com | sh
   ```
4. **Projeyi sunucuya al.** İki yol var:
   - `git clone` ile depoyu çek.
   - Zip'i `scp arena-rpg.zip root@SUNUCU_IP:` ile kopyala, ardından `unzip` ile aç.
5. **Ayarları yaz:**
   ```bash
   cd arena-rpg/deploy
   cp .env.example .env
   nano .env
   ```
   Dolduracakların:
   - `DOMAIN`: alan adın.
   - `SMTP_URL` ve `MAIL_FROM`: e-posta servisinden alırsın.
   - `ADMIN_NOTIFY_EMAIL`: senin adresin.
   - `PROPHECY_SECRET`: `openssl rand -hex 24` komutunun çıktısını yapıştır.
6. **Başlat:**
   ```bash
   docker compose up -d --build
   ```
   Tarayıcıda `https://api.ornekoyun.com/health` adresini aç. `{"ok":true}` görmelisin.
7. **Yönetici hesabını oluştur:**
   ```bash
   docker compose exec -e ADMIN_PASSWORD="en-az-14-karakterli-sifre" server npx --no-install tsx scripts/create-admin.ts sen@ornekoyun.com
   ```
   Çıkan anahtarı doğrulayıcı uygulamana ekle. Panelin adresi `https://api.ornekoyun.com/admin`.
8. **Günlük yedeği aç:**
   ```bash
   crontab -e
   ```
   Açılan dosyaya şu satırı ekle:
   ```
   15 4 * * * /root/arena-rpg/deploy/backup.sh >> /var/log/arena-backup.log 2>&1
   ```
   Yedekler `deploy/backups/` klasöründe 14 gün tutulur. Ara sıra bir kopyasını sunucu dışına al.

**Güncelleme:** Yeni kodu sunucuya al ve `docker compose up -d --build` komutunu tekrar çalıştır. Oyuncu verisi `gamedata` biriminde durur; güncellemede silinmez.

## 2. Uygulamayı bu sunucuya bağla ve mağazaya yükle

1. `apps/mobile/eas.json` içindeki `EXPO_PUBLIC_API_URL` değerini kendi alan adınla değiştir: `https://api.ornekoyun.com`.
2. `apps/mobile/app.json` dosyasında:
   - `com.example.tozvedemir` paket adını kendi adınla değiştir (ör. `com.senin-studyon.tozvedemir`). Bu ad mağazaya yüklendikten sonra değiştirilemez.
   - `version` alanını düzenle.
3. Derle:
   ```bash
   npm i -g eas-cli
   cd apps/mobile
   eas login
   eas build -p android --profile preview      # telefona doğrudan kurulabilen APK (test)
   eas build -p android --profile production   # Google Play için AAB
   eas build -p ios --profile production       # App Store (Apple hesabı gerekir)
   ```
4. Mağaza kayıtlarında gizlilik politikasının bağlantısı istenir. `docs/PRIVACY_NOTICE.md` dosyasını sitende bir sayfa olarak yayınla. Mağazaların veri güvenliği formlarını `LEGAL_CHECKLIST.md` dosyasına göre doldur.

Üretim derlemesinde giriş ekranında sunucu adresi, bağlantı durumu ya da geliştirici seçenekleri **görünmez**. Bunlar yalnızca geliştirme modunda gösterilir. Sunucuya ulaşılamazsa oyuncu yalnızca "Oyun sunucusuna bağlanılamıyor. İnternet bağlantını kontrol edip tekrar dene." mesajını görür.

## Üretim modunda sunucu ne yapar, ne yapmaz

- **Başlamadan önce:** `SMTP_URL`, `MAIL_FROM` ve `PROPHECY_SECRET` yoksa **başlamayı reddeder**. Yanlış ayarla canlıya çıkılamaz.
- **Kapalı olanlar:** Hız çarpanı (`GAME_SPEED`) ve tarayıcı CORS izni kapalıdır.
- **Kayıt tutmama:** İstek ve IP kaydı tutulmaz. Caddy'nin erişim kayıtları da kapalıdır. Docker günlükleri en fazla 15 MB ile sınırlıdır ve yalnızca başlangıç mesajlarını içerir.
- **Bakım:** Saklama ve imha görevi her 6 saatte bir çalışır.
