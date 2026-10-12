# Toz ve Demir (arena-rpg)

Metin ve menü tabanlı, sıra tabanlı savaşlı bir mobil arena RPG iskeleti. Tasarımın merkezinde iki ilke var: **hesap yok** ve **kişisel veri saklanmıyor**.

- 📐 Mimari, veri akışları, gelir modeli, yasal notlar → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 🔒 Gizlilik / aydınlatma metni şablonu → [`docs/PRIVACY_NOTICE.md`](docs/PRIVACY_NOTICE.md)
- ✅ Yayın öncesi kontrol listesi → [`docs/LEGAL_CHECKLIST.md`](docs/LEGAL_CHECKLIST.md)

## Paketler

| Paket | Açıklama |
|---|---|
| `packages/core` | Ortak oyun çekirdeği: statlar, karakter, eşyalar, ekonomi, enerji, görevler, deterministik savaş, kayıt şeması, transfer kodu kriptosu, PvP doğrulama |
| `apps/server` | Hono API: PvP, sıralama, şifreli transfer rölesi. Log yok, kalıcı DB yok, her şey TTL'li |
| `apps/mobile` | Expo uygulaması: şifreli SQLite kaydı, Keychain anahtarı, karakter oluşturma, gizlilik ekranı |

## Komutlar

```bash
npm install                       # tüm workspace'ler
npm test                          # core + server testleri (vitest)
npm run typecheck                 # core + server + mobile

npm run dev -w @arena/server      # http://localhost:8787
npm run start -w @arena/mobile    # Expo dev server (Expo Go / development build)
```

> `expo-sqlite` ve `expo-secure-store` Expo Go'da çalışır. Mağaza derlemesi için `npx expo prebuild` veya EAS Build kullanın.
