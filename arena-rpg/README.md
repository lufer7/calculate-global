# Toz ve Demir (arena-rpg)

Metin ve menü tabanlı, sıra tabanlı savaşlı bir mobil arena RPG iskeleti. Tasarımın merkezinde iki ilke var: **hesap yok** ve **kişisel veri saklanmıyor**.

- 📐 Mimari, veri akışları, gelir modeli, yasal notlar → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 🔒 Gizlilik / aydınlatma metni şablonu → [`docs/PRIVACY_NOTICE.md`](docs/PRIVACY_NOTICE.md)
- ✅ Yayın öncesi kontrol listesi → [`docs/LEGAL_CHECKLIST.md`](docs/LEGAL_CHECKLIST.md)
- ⚔️ v2: sınıflar, yetenekler, seferler, e-posta üyelik ve yönetici paneli → [`docs/DESIGN_V2.md`](docs/DESIGN_V2.md)

## Paketler

| Paket | Açıklama |
|---|---|
| `packages/core` | Ortak oyun çekirdeği: statlar, karakter, eşyalar, ekonomi, enerji, görevler, deterministik savaş, kayıt şeması, transfer kodu kriptosu, PvP doğrulama |
| `apps/server` | Hono API: e-posta ile üyelik, dövüşçüler, yönetici paneli (`/admin`), PvP, sıralama, transfer rölesi |
| `apps/mobile` | Expo uygulaması: şifreli SQLite kaydı, Keychain anahtarı, karakter oluşturma, gizlilik ekranı |

## Komutlar

```bash
npm install                       # tüm workspace'ler
npm test                          # core + server testleri (vitest)
npm run typecheck                 # core + server + mobile

npm run dev -w @arena/server      # http://localhost:8787  (panel: /admin)
ADMIN_PASSWORD="en-az-14-karakter" npm run admin:create -w @arena/server -- siz@ornek.com
npm run mobile                    # Expo + QR kod (Expo Go ile okutun)
```

> `expo-sqlite` ve `expo-secure-store` Expo Go'da çalışır. Mağaza derlemesi için `npx expo prebuild` veya EAS Build kullanın.

## Sorun giderme (QR / Expo Go)

| Belirti | Çözüm |
|---|---|
| `Node.js ... bulundu, ancak bu proje Node 22.13+ ...` veya `EBADENGINE` / Metro hatası | nodejs.org'dan LTS sürümünü (22 veya 24) kurun, terminali yeniden açın, `npm install` tekrar. |
| QR görünmüyor | Komutu `arena-rpg` klasöründe, normal bir terminalde çalıştırın: `npm run mobile`. QR çıkmazsa terminaldeki `exp://...` adresini Expo Go'da "Enter URL manually" ile girin. |
| Telefonda "Could not connect" / "Something went wrong" | Telefon ve bilgisayar aynı Wi-Fi'da olmalı; VPN kapalı olmalı. Olmazsa `npm run mobile:tunnel`. |
| Windows'ta `running scripts is disabled on this system` | PowerShell yerine "Komut İstemi" (cmd) kullanın ya da `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| Expo Go'da "Project is incompatible with this version of Expo Go" | Expo Go uygulamasını mağazadan güncelleyin (proje Expo SDK 57 kullanıyor). |
