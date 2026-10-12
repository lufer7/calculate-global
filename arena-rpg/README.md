# Aegis (arena-rpg)

Metin ve menü tabanlı, sıra tabanlı savaşlı bir mobil arena RPG iskeleti. Tasarımın merkezinde iki ilke var: **hesap yok** ve **kişisel veri saklanmıyor**.

- 📐 Mimari, veri akışları, gelir modeli, yasal notlar → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 🔒 Aydınlatma metni ve kullanım koşulları → [`docs/PRIVACY_NOTICE.md`](docs/PRIVACY_NOTICE.md), [`docs/TERMS.md`](docs/TERMS.md)
- ✅ Yayın öncesi kontrol listesi → [`docs/LEGAL_CHECKLIST.md`](docs/LEGAL_CHECKLIST.md)
- ⚔️ v2: sınıflar, yetenekler, seferler, e-posta üyelik ve yönetici paneli → [`docs/DESIGN_V2.md`](docs/DESIGN_V2.md)
- 🛡️ Yönetici paneli kurulumu → [`docs/ADMIN_SETUP.md`](docs/ADMIN_SETUP.md)
- 🚀 Canlıya alma (7/24 sunucu, HTTPS, yedek, mağaza derlemesi) → [`docs/DEPLOY.md`](docs/DEPLOY.md)
- ⚖️ KVKK / GDPR uyumu (kodda olanlar ve sizin yapmanız gerekenler) → [`docs/KVKK_COMPLIANCE.md`](docs/KVKK_COMPLIANCE.md)

## Paketler

| Paket | Açıklama |
|---|---|
| `packages/core` | Ortak oyun çekirdeği: statlar, karakter, eşyalar, ekonomi, enerji, görevler, deterministik savaş, kayıt şeması, transfer kodu kriptosu, PvP doğrulama |
| `apps/server` | Hono API: e-posta ile üyelik, dövüşçüler, yönetici paneli (`/admin`), PvP, sıralama, transfer rölesi |
| `apps/mobile` | Expo uygulaması: kayıt/giriş, çete ve reis seçimi, yetenek ağacı, giyim ekranı + çanta + demirci, Salı Pazarı, arena (savaş tekrarı), seferler, Rasathane, simya, raporlar, hesap. Görseller SVG ile çizilir (`src/art`) |

## Komutlar

```bash
npm install                       # tüm workspace'ler (Node 22.13+ veya 24+)
npm run dev                       # sunucu + Expo (QR kod) birlikte; süreler test için 20 kat hızlı
npm test                          # çekirdek + sunucu testleri
npm run typecheck                 # çekirdek + sunucu + mobil
npm run legal:docs                # yasal metinleri uygulamadaki metinden yeniden üretir

ADMIN_PASSWORD="en-az-14-karakter" npm run admin:create -w @arena/server -- siz@ornek.com
# Yönetim paneli: http://<bilgisayarın-IP-adresi>:8787/admin
```

**Telefonda denemek:** `npm run dev` çalıştırın, QR'ı Expo Go ile okutun. Kayıt olurken e-posta doğrulama kodu (henüz gerçek e-posta servisi bağlı olmadığı için) **sunucunun terminal çıktısına** yazılır: `[dev-mail] ... doğrulama kodun: 123456`. Telefon ve bilgisayar aynı Wi-Fi'da olmalı; uygulama sunucuya bilgisayarın adresinden (port 8787) bağlanır.

## Sorun giderme (QR / Expo Go)

| Belirti | Çözüm |
|---|---|
| `Node.js ... bulundu, ancak bu proje Node 22.13+ ...` veya `EBADENGINE` / Metro hatası | nodejs.org'dan LTS sürümünü (22 veya 24) kurun, terminali yeniden açın, `npm install` tekrar. |
| QR görünmüyor | Komutu `arena-rpg` klasöründe, normal bir terminalde çalıştırın: `npm run mobile`. QR çıkmazsa terminaldeki `exp://...` adresini Expo Go'da "Enter URL manually" ile girin. |
| Telefonda "Could not connect" / "Something went wrong" | Telefon ve bilgisayar aynı Wi-Fi'da olmalı; VPN kapalı olmalı. |
| Giriş ekranının altında kırmızı nokta: "Sunucuya ulaşılamıyor" | Yanında yazan adres bilgisayarınızın IP'si ve 8787 portu olmalı (ör. `http://192.168.1.20:8787`). `npm run dev` açık olmalı; telefonun tarayıcısında bu adrese `/health` ekleyerek açmayı deneyin, `{"ok":true}` görmelisiniz. `--tunnel` ile açtıysanız telefon sunucuya ulaşamaz; aynı Wi-Fi ile normal `npm run dev` kullanın. |
| Uygulamada "Sunucuya ulaşılamadı" | `npm run dev` ile sunucunun da açık olduğundan emin olun. Bilgisayarın güvenlik duvarı 8787 portuna izin vermeli (Windows ilk açılışta sorar: "Özel ağlar"a izin verin). |
| Windows'ta `running scripts is disabled on this system` | PowerShell yerine "Komut İstemi" (cmd) kullanın ya da `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| Expo Go'da "Project is incompatible with this version of Expo Go" | Expo Go uygulamasını mağazadan güncelleyin (proje Expo SDK 57 kullanıyor). |
