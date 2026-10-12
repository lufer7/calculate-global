# Yönetici Paneli Kurulumu

Panel, oyun sunucusunun içinde `/admin` adresinde çalışır. Ayrı bir kurulum gerekmez: sunucuyu açar, bir yönetici hesabı oluşturur ve telefonunuzdaki doğrulama uygulamasını bağlarsınız.

## 1. Gerekenler

- **Node.js 22.13 veya üstü** (ya da 24). Kontrol: `node -v`. Eskiyse https://nodejs.org adresinden "LTS" sürümünü kurun.
- **Telefonda bir doğrulama uygulaması:** Google Authenticator, Microsoft Authenticator, Aegis veya 1Password.
- Proje klasörü (`arena-rpg`) ve içinde bir kez `npm install`.

## 2. Yönetici hesabını oluşturun

Şifre, komut geçmişinde kalmasın diye bir ortam değişkeniyle verilir. En az 14 karakter olmalı.

**macOS / Linux:**
```bash
cd arena-rpg
ADMIN_PASSWORD="buraya-guclu-bir-sifre" npm run admin:create -w @arena/server -- siz@ornek.com
```

**Windows (PowerShell):**
```powershell
cd arena-rpg
$env:ADMIN_PASSWORD="buraya-guclu-bir-sifre"; npm run admin:create -w @arena/server -- siz@ornek.com; Remove-Item Env:ADMIN_PASSWORD
```

**Windows (Komut İstemi / cmd):**
```bat
cd arena-rpg
set ADMIN_PASSWORD=buraya-guclu-bir-sifre&& npm run admin:create -w @arena/server -- siz@ornek.com
set ADMIN_PASSWORD=
```

Komut şöyle bir çıktı verir:
```
Yönetici hesabı hazır.
  Anahtar: JBSWY3DPEHPK3PXP....
  URI:     otpauth://totp/...
```

## 3. Doğrulama uygulamasını bağlayın

1. Doğrulama uygulamasında **"+" → "Kurulum anahtarı gir"** (Enter a setup key) seçin.
2. Hesap adı olarak "Toz ve Demir Admin" yazın.
3. Anahtar olarak çıktıdaki **Anahtar** satırını girin. Tür "Zamana dayalı" (Time based) olsun.
4. Uygulama artık her 30 saniyede bir değişen 6 haneli bir kod gösterir.

> Anahtar yalnızca bir kez gösterilir; bir yere not etmeyin, doğrudan uygulamaya girin. Kaybederseniz adım 2'yi aynı e-postayla tekrar çalıştırın: yeni anahtar üretilir ve eski yönetici oturumları kapanır.

## 4. Paneli açın

```bash
npm run dev          # sunucu + mobil (QR) birlikte
# ya da yalnızca sunucu:
npm run server
```

- Aynı bilgisayardan: http://localhost:8787/admin
- Aynı Wi-Fi'daki telefondan: `http://<bilgisayarın-IP-adresi>:8787/admin`
  - Bilgisayarın IP adresi: Windows'ta `ipconfig` komutunda "IPv4 Address", macOS'ta Sistem Ayarları → Wi-Fi → Ayrıntılar.

Girişte e-posta, şifre ve uygulamadaki 6 haneli kod istenir.

### Panelde neler var?

| Sekme | Ne işe yarar |
|---|---|
| **Genel** | Hesap ve dövüşçü sayıları, bugünkü kayıtlar, ana sınıf dağılımı. Bildirimler: yeni üye, yeni dövüşçü, yeni KVKK başvurusu |
| **Oyuncular** | Arama; oyuncu detayı (e-posta maskeli); yasaklama ve yasak kaldırma; dövüşçü adı değiştirme; verilerini dışa aktarma; e-postayı gerekçeyle gösterme; hesap silme |
| **KVKK başvuruları** | Oyuncuların uygulamadan gönderdiği başvurular; kalan gün ve gecikme uyarısı; yanıt veya gerekçeli ret |
| **Saklama ve imha** | Otomatik silme görevinin geçmiş çalışmaları; "Şimdi çalıştır" düğmesi |
| **İşlem kaydı** | Panelde yapılan her işlem; silinemez |

**Güvenlik notları**
- Oturum 30 dakika işlem yapılmazsa kapanır; sekmeyi kapatınca da çıkış yapılmış olur.
- Dakikada 10'dan fazla giriş denemesi engellenir.

## 5. Canlıya alırken (sunucuda)

1. **Sunucu:** Türkiye'de (KVKK md. 9 yükünü azaltmak için) küçük bir Linux sunucu (1 vCPU, 1 GB RAM yeterli). Node.js 22 LTS kurun.
2. **Ortam değişkenleri** (ör. `/etc/arena.env`):
   ```bash
   NODE_ENV=production
   PORT=8787
   DB_PATH=/var/lib/arena/arena.db
   TRUST_PROXY=1
   SMTP_URL=smtps://kullanici:sifre@smtp.saglayici.com:465
   MAIL_FROM="Toz ve Demir <no-reply@alanadiniz.com>"
   ADMIN_NOTIFY_EMAIL=siz@ornek.com
   ADMIN_ALLOWED_IPS=evinizin.veya.ofisinizin.ip.adresi   # isteğe bağlı ama önerilir
   PROPHECY_SECRET=uzun-rastgele-bir-metin
   ```
   Üretim modunda `SMTP_URL` ve `MAIL_FROM` yoksa sunucu bilerek başlamaz; doğrulama kodları gönderilemezse kayıt olunamaz.
3. **HTTPS ve günlük:** Önüne Caddy koyun. Caddy sertifikayı kendisi alır ve varsayılan olarak erişim günlüğü tutmaz:
   ```
   api.alanadiniz.com {
       reverse_proxy 127.0.0.1:8787
   }
   ```
4. **Servis olarak çalıştırma (systemd):**
   ```ini
   [Service]
   EnvironmentFile=/etc/arena.env
   WorkingDirectory=/opt/arena-rpg/apps/server
   ExecStart=/usr/bin/npx tsx src/index.ts
   Restart=always
   User=arena
   ```
5. **Mobil uygulamayı canlı sunucuya bağlama:** `apps/mobile/app.json` → `expo.extra.apiBaseUrl` alanına `https://api.alanadiniz.com` yazın.
6. **Yönetici hesabı:** Adım 2'yi sunucuda, aynı `DB_PATH` ile çalıştırın.
7. **Yedek:** `arena.db` dosyasının şifreli yedeğini günlük alın ve 30 gün saklayın (`docs/KVKK_COMPLIANCE.md` §3).

## 6. Sorun giderme

| Belirti | Çözüm |
|---|---|
| "E-posta, şifre veya kod hatalı" | Bilgisayarın ve telefonun saati otomatik ayarlı olmalı; TOTP saat farkına duyarlıdır. Kod her 30 saniyede değişir, son saniyelerde girmeyin. |
| Aynı kodu iki kez denedim, olmadı | Güvenlik gereği bir kod yalnızca bir kez kullanılabilir. Bir sonraki kodu bekleyin. |
| `/admin` 404 veriyor | `ADMIN_ALLOWED_IPS` ayarlıysa yalnızca o adreslerden açılır. |
| Sunucu açılmıyor, "SMTP_URL ve MAIL_FROM..." | Üretim modundasınız (`NODE_ENV=production`). Yerelde denemek için bu değişkeni kaldırın. |
| Doğrulama kodu gelmiyor (yerelde) | Yerelde e-posta gönderilmez; kodlar sunucunun terminal çıktısında `[dev-mail]` satırında görünür. |
