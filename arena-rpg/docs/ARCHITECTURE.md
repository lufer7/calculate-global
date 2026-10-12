# Toz ve Demir — Anonim Mimari Planı

> ⚠️ **Bu belge v1'i (hesapsız, tamamen anonim model) anlatır.** E-posta ile üyelik ve sunucu otoritesi kararıyla değişen kısımlar için [`DESIGN_V2.md`](DESIGN_V2.md) dosyasına bakın.

> Kod adı **"Toz ve Demir"** (geçici, özgün bir isim). Metin/menü tabanlı, sıra tabanlı arena RPG.
>
> ⚠️ Bu belge bir mühendislik planıdır, hukuki görüş değildir. Yayından önce KVKK/GDPR ve tüketici hukuku konusunda bir avukata danışın.

## İçindekiler

1. [Tasarım ilkeleri](#1-tasarım-ilkeleri)
2. [Teknoloji seçimi](#2-teknoloji-seçimi)
3. [Mimari şema](#3-mimari-şema)
4. [Veri akışları (adım adım)](#4-veri-akışları-adım-adım)
5. [Veri envanteri](#5-veri-envanteri)
6. [Hile ve güvenlik modeli](#6-hile-ve-güvenlik-modeli)
7. [Gelir modeli: IAP ve reklam](#7-gelir-modeli-iap-ve-reklam)
8. [Telif hakkı ve içerik sorumluluğu](#8-telif-hakkı-ve-içerik-sorumluluğu)
9. [Mağaza beyanları](#9-mağaza-beyanları)
10. [Proje yapısı](#10-proje-yapısı)
11. [Yol haritası](#11-yol-haritası)

---

## 1. Tasarım ilkeleri

| İlke | Uygulama |
|---|---|
| **Hesap yok** | Kayıt, giriş, e-posta, telefon, sosyal giriş, Firebase Auth yok. |
| **Cihaz önce (offline-first)** | Tüm ilerleme cihazdaki SQLite'ta, Keychain/Keystore anahtarıyla şifreli. Sunucu olmadan oyun tamamen oynanabilir. |
| **Çevrimiçi = isteğe bağlı** | PvP/sıralama/bulut transferi varsayılan **kapalı**. Oyuncu açmadıkça uygulama hiçbir ağ isteği yapmaz. |
| **Sunucu = hesap makinesi + geçici önbellek** | Sunucu savaşı hesaplar, sonucu döner. Kalıcı veritabanı yok; her kayıt TTL ile kendiliğinden silinir. |
| **Serbest metin yok** | Sohbet yok; çevrimiçi isimler kelime listelerinden **otomatik üretilir**. Oyuncunun yazdığı karakter adı cihazdan çıkmaz. |
| **Ortak oyun çekirdeği** | Savaş motoru, stat formülleri, doğrulama kuralları tek bir TypeScript paketinde; istemci ve sunucu aynı kodu çalıştırır. |
| **Dürüstlük** | "Sıfır veri" pratikte mümkün değil: Çevrimiçi bir istek atıldığı an IP adresi teknik olarak işlenir. Bunu saklamıyor, günlüklemiyoruz ve gizlilik metninde açıkça yazıyoruz. |

### KVKK / GDPR açısından neden işe yarar?

- **Anonim veri** KVKK ve GDPR kapsamı dışındadır. Ancak **takma adlı (pseudonymous)** veri, örneğin rastgele bir ID'nin IP ile birleştirilmesi, hâlâ kişisel veri sayılabilir. Kurul kararlarında IP adresi kişisel veri kabul ediliyor.
- Bu yüzden mimari, ID'yi IP veya cihazla **hiçbir zaman birlikte saklamaz**:
  - Ladder ID, cihazda üretilen rastgele bir sırrın hash'idir. Sunucu sırrı saklamaz.
  - IP yalnızca RAM'de, dakikada bir değişen rastgele bir tuzla hash'lenerek hız sınırlaması için kullanılır ve pencere bitince silinir.
  - Erişim günlüğü (access log) uygulamada **ve** ters proxy'de kapalıdır.
- Geriye kalan risk anlık IP işlemesidir. Bunun dayanağı meşru menfaat ya da hizmetin ifası olabilir (GDPR md. 6/1-f, KVKK md. 5/2-f). Aydınlatma metninde belirtilir.
- **Yurt dışına aktarım:** KVKK md. 9 nedeniyle sunucuyu Türkiye'de ya da hukuki değerlendirmesi yapılmış bir konumda barındırın. AB oyuncuları için AB bölgesi kullanın. Önünde Cloudflare gibi bir CDN/WAF varsa o da IP işler; ya kullanmayın ya da metinde belirtin.

---

## 2. Teknoloji seçimi

### Önerilen stack

| Katman | Seçim | Neden |
|---|---|---|
| Mobil | **React Native + Expo (SDK 57) + TypeScript** | Tek kod tabanıyla iOS ve Android. Asıl kazanç, oyun çekirdeğinin **sunucuyla birebir aynı TypeScript kodu** olması: PvP sunucuda hesaplanır, istemci aynı `seed` ile aynı savaşı yeniden oynatır. |
| Oyun çekirdeği | `packages/core`: saf TS, platform bağımsız | Test edilebilir, deterministik (seed'li PRNG), UI'dan bağımsız. |
| Yerel depolama | `expo-sqlite` (veri) + `expo-secure-store` (Keychain/Keystore'da şifreleme anahtarı) | Yapılandırılmış veri ve migration desteği. Anahtar iCloud'a senkronlanmaz (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). |
| Kriptografi | `@noble/ciphers` (AES-256-GCM), `@noble/hashes` (SHA-256, HKDF), rastgelelik için `expo-crypto` | Denetlenmiş, saf JS, native bağımlılığı yok. |
| Backend | **Node.js 22 + Hono** (`apps/server`) | Küçük, hızlı, durumsuz. Gerekirse Cloudflare Workers/Deno/Bun'a taşınabilir. |
| Geçici veri | Bellek içi `TtlStore` (MVP). Üretimde **Redis, persistence KAPALI** (`save ""`, `appendonly no`) | Kalıcı veritabanı yok. Her anahtarın TTL'i var. Yeniden başlatınca her şey silinir; bu bir özellik. |
| Barındırma | Türkiye veya AB bölgesinde küçük bir VPS + Caddy/Nginx (`access_log off`) | Tek bir konteyner yeter. Ölçek gerekirse yatay çoğaltma + Redis. |
| IAP | `expo-iap` veya `react-native-iap` (StoreKit 2 / Play Billing) | Ödeme Apple/Google'da kalır. Sunucuda makbuz saklanmaz (bkz. §7). |

### Değerlendirilip elenenler

| Seçenek | Neden elendi |
|---|---|
| **Firebase Anonymous Auth** | Kalıcı bir UID üretir. Firebase SDK'ları Installation ID ve telemetri gönderir. Google bir veri işleyen olarak devreye girer; mağaza beyanlarını ve aydınlatma metnini karmaşıklaştırır. Bizim ihtiyacımız olan "anonim kimlik" zaten cihazda üretilen rastgele token ile çözülüyor. |
| **Flutter** | Teknik olarak çok iyi bir seçenek. Ancak savaş motoru Dart'ta yazılırsa sunucu tarafında ya Dart backend ya da motorun iki dilde tekrarı gerekir. Ekip Dart biliyorsa Flutter + Dart Frog/Shelf backend de aynı mimariyle uygulanabilir. |
| **Go backend** | Performans açısından harika, fakat motor paylaşımı kaybolur. Yük gerçekten artarsa yalnızca sıralama/eşleştirme servisi Go'ya alınabilir. |
| **Analitik / Crashlytics / Sentry** | Kullanılmıyor. Store konsollarının OS düzeyindeki, kullanıcı onaylı çökme raporları yeterli. |

---

## 3. Mimari şema

```mermaid
flowchart LR
  subgraph Device["📱 Cihaz (tüm ilerleme burada)"]
    UI[Expo UI<br/>menü ekranları]
    CORE[@arena/core<br/>savaş, stat, doğrulama]
    DB[(SQLite<br/>AES-GCM şifreli kayıt)]
    KS[[Keychain / Keystore<br/>yerel anahtar]]
    TOK[[ladderToken<br/>rastgele 256-bit sır]]
    UI --> CORE --> DB
    KS -. anahtar .-> DB
  end

  subgraph Server["☁️ Sunucu (durumsuz + TTL)"]
    API[Hono API<br/>log yok]
    RL[Hız sınırlayıcı<br/>RAM, tuzlu IP hash, 1 dk]
    POOL[(Rakip havuzu<br/>TTL 24 sa)]
    LAD[(Sıralama<br/>hash ID, TTL 30 gün)]
    TR[(Transfer rölesi<br/>şifreli blob, TTL 72 sa, tek okuma)]
    API --> RL
    API --> POOL & LAD & TR
  end

  STORE[(App Store / Google Play<br/>ödeme + makbuz)]

  UI -- "isteğe bağlı: {token, build}" --> API
  API -- "{seed, sonuç, üretilmiş isim}" --> UI
  UI -- "isteğe bağlı: şifreli blob" --> TR
  UI <-- "satın alma (doğrudan mağaza)" --> STORE
```

Sunucuya giden şeyler bundan ibarettir: rastgele bir token, bir "build" (seviye, statlar, eşya ID'leri) ve okunamayan şifreli bloklar. İsim, cihaz ID'si, reklam ID'si, konum veya iletişim bilgisi hiçbir zaman gönderilmez.

---

## 4. Veri akışları (adım adım)

### A. İlk açılış ve karakter oluşturma (tamamen çevrimdışı)

1. Uygulama açılır. Ağ isteği yapılmaz.
2. `saveRepository.loadSave()` SQLite'ta kayıt arar ve bulamaz.
3. Oyuncu isim, köken ve stat dağılımı seçer. `createCharacter()` kuralları doğrular (`packages/core/src/character.ts`).
4. `getLocalKey()` ilk kez çağrıldığında 32 baytlık rastgele bir anahtar üretir ve Keychain/Keystore'a koyar.
5. `writeSave()` kaydı AES-256-GCM ile şifreleyip `save_slots` tablosuna yazar.

> Karakter adı yalnızca bu şifreli kayıtta yaşar. Hiçbir API çağrısı onu içermez.

### B. Oynanış (görevler, mağaza, demirci)

- Enerji ve görev süreleri cihaz saatine göre hesaplanır (`energy.ts`, `quests.ts`).
- Mağaza, ekipman ve demirci saf fonksiyonlardır (`economy.ts`). Sonuç her seferinde yerel kayda yazılır.
- Cihaz saatiyle oynamak yalnızca oyuncunun kendi tek kişilik oyununu etkiler (bkz. §6).

### C. Transfer kodu (yedekleme / cihaz değiştirme)

```
code     = 16 rastgele bayt + 1 bayt checksum → "7KQ2-M9XD-…" (28 karakter, Crockford base32)
lookupId = HKDF(code, "lookup")   → sunucuda adres (sunucu yalnızca bunu görür)
encKey   = HKDF(code, "enc")      → AES-256-GCM anahtarı (cihazdan çıkmaz)
blob     = "AR1." + base64url(nonce ‖ AES-GCM(encKey, kayıt))
```

**Çevrimdışı mod:** Blob paylaşım menüsüyle oyuncunun kendisine gönderilir (not, dosya, kendine e-posta). Kod ayrıca yazılıp saklanır. Sunucu hiç kullanılmaz.

**Röle modu (isteğe bağlı):**

1. Eski cihaz `PUT /v1/transfer/{lookupId}` ile blob'u yükler. TTL 72 saattir.
2. Yeni cihazda kod girilir. `lookupId` yeniden türetilir, `GET` ile blob indirilir ve sunucudan **anında silinir** (tek okuma).
3. Blob `encKey` ile çözülür. Sunucu anahtarı hiç görmediği için içeriği okuyamaz.

Kod kaybolursa kurtarma yoktur. Bu, verinin gerçekten bizde olmamasının doğal sonucu ve kullanıcıya açıkça söylenir.

### D. Anonim PvP

1. Oyuncu "Çevrimiçi özellikleri aç" der. Cihaz `generateLadderToken()` ile 256 bitlik rastgele bir sır üretip kayda koyar.
2. `buildSnapshot(save)` yalnızca seviye, köken, statlar ve eşya ID'leri/yükseltme seviyelerini içerir. İsim veya ID yoktur.
3. `POST /v1/pvp/fight {token, snapshot}` çağrılır.
4. Sunucu tarafında:
   - `validateSnapshot()` build'in o seviyede **mümkün olup olmadığını** denetler (stat bütçesi, eşya seviyesi, slot ve yükseltme sınırı) ve bilinmeyen alanları atar.
   - `ladderId = SHA-256("…:" + token)` hesaplanır. Token saklanmaz.
   - Havuzdan benzer seviyede bir rakip build'i seçilir. Havuz boşsa prosedürel bir "hayalet" rakip kullanılır.
   - `simulateBattle(a, b, seed)` deterministik olarak çalışır. Elo güncellenir, build havuza 24 saatlik TTL ile konur.
5. Yanıt `{seed, result, log, opponent.displayName, me.displayName, rating}` biçimindedir. İsimler `displayNameFromId()` ile **üretilir** ("Paslı Çakal #4821").
6. İstemci aynı `seed` ile savaşı yerelde yeniden oynatıp animasyonlu gösterebilir.

### E. Sıralama (leaderboard)

- `GET /v1/ladder`, `{displayName, rating, wins, losses}` listesi döner. Başka bir şey yoktur.
- Kayıtlar 30 gün işlem görmezse kendiliğinden düşer. Sezon sonunda store boşaltılır ve cihaz yeni token üretir. Böylece sezonlar arası bağlantı kurulamaz.

### F. Silme hakkı

- **Cihazda:** "Tüm Verilerimi Sil" SQLite dosyasını ve Keychain anahtarını siler.
- **Sunucuda:** Aynı işlem `DELETE /v1/ladder {token}` çağrısını da yapar; sıralama kaydı ve havuzdaki build anında silinir. Ağ yoksa veri zaten TTL ile kaybolur.
- Kimse "verilerimi gönderin" diye başvurursa elimizde kişiyle ilişkilendirebileceğimiz veri yoktur. Bu durum aydınlatma metninde açıklanır.

---

## 5. Veri envanteri

| Veri | Nerede | Kişisel veri mi? | Saklama |
|---|---|---|---|
| Karakter adı, ilerleme, envanter | Cihaz (SQLite, şifreli) | Ad teorik olarak gerçek isim olabilir, ama cihazdan çıkmaz ve biz erişemeyiz. | Uygulama silinene kadar |
| Yerel şifreleme anahtarı | Keychain/Keystore | Hayır | Uygulama silinene kadar |
| `ladderToken` | Cihaz | Hayır (rastgele) | Sezon boyunca |
| `ladderId` = hash(token) | Sunucu RAM/Redis | Takma adlı. IP veya cihazla eşleştirilmez. | 30 gün hareketsizlik veya sezon sonu |
| PvP build'i | Sunucu RAM/Redis | Hayır | 24 saat |
| Transfer blob'u | Sunucu RAM/Redis | Şifreli, okunamaz | İlk okuma veya 72 saat |
| IP adresi | Sunucu RAM (yalnızca tuzlu hash) | Evet, anlık | ≤ 1 dakika, diske yazılmaz |
| Satın alma makbuzu | Apple/Google + cihaz | Mağazanın sorumluluğunda | Bizde saklanmaz |

**Yasaklar listesi** (kod incelemesinde kontrol edin):

- `console.log(req)`, Hono `logger()`, Nginx/Caddy access log
- `expo-device`, `expo-application` ile cihaz/kurulum ID'si okumak
- `expo-tracking-transparency`, AD_ID izni, reklam ID'si
- Analitik, attribution veya crash SDK'sı (Firebase, Amplitude, AppsFlyer, Sentry…)
- Push bildirimi (push token kalıcı bir cihaz tanımlayıcısıdır). Yerel bildirim serbesttir.

---

## 6. Hile ve güvenlik modeli

İlerleme cihazda olduğu için kayıt **manipüle edilebilir**. Bunu bilinçli olarak kabul ediyoruz, çünkü:

1. **Tek kişilik oyunda** hile yalnızca hileciyi etkiler. Saat değiştirmek ya da kaydı düzenlemek kimseye zarar vermez.
2. **PvP'de** sunucu ilerlemeye güvenmez, **kurallara** güvenir. `validateSnapshot()` bir build'in o seviyede yasal olarak ulaşılabilecek sınırı aşmasını engeller. En kötü durumda hileci, sıfırdan "mükemmel" oynanmış yasal bir build ile savaşır.
3. Savaşı her zaman **sunucu** hesaplar. İstemcinin sonuç bildirmesi diye bir şey yoktur.
4. Yerel şifreleme ve GCM bütünlük etiketi sıradan kayıt düzenlemeyi zorlaştırır. Root/jailbreak'e karşı mutlak bir koruma değildir ve olması da gerekmez.
5. Hız sınırlaması, istek gövdesi limiti (64 KB) ve sıkı şema doğrulaması kötüye kullanıma karşı yeterli. Gerekirse Proof-of-Work (hashcash) eklenebilir; bu da kimlik gerektirmez.

İleride seviyeler arası dengesizlik görülürse PvP'yi "seviye normalize" moda almak (herkes aynı seviyeye ölçeklenir) basit bir çözümdür.

---

## 7. Gelir modeli: IAP ve reklam

### Uygulama içi satın alma (önerilen ana gelir)

- **Ne satılır:** Kozmetikler (`cosmetic: true` eşyalar, çerçeveler, temalar), kolaylık (ek kayıt slotu, enerji yenileme, görev süresini kısaltma) ve "reklamsız" paketi.
- **PvP'ye güç satılmaz.** `itemPower()` kozmetik eşyalar için 0 döner ve snapshot doğrulaması statları sınırlar. Böylece satın alınan bir şey PvP adaletini bozmaz ve **sunucu tarafı makbuz doğrulamasına ihtiyaç kalmaz**: makbuz saklamak, sunucuya işlem kimliği göndermek ya da kullanıcı eşleştirmek gerekmez.
- **Doğrulama cihazda yapılır:** StoreKit 2 JWS imzası cihazda doğrulanır. Play Billing'de satın alma imzası uygulamaya gömülü public key ile kontrol edilir. Satın alınan hak yerel kayda yazılır, ardından `finishTransaction` / `acknowledgePurchase` çağrılır.
- **Geri yükleme:** "Satın almaları geri yükle" doğrudan mağaza API'sini çağırır. Non-consumable ürünler ve abonelikler mağaza hesabına bağlı olduğu için bizim kimlik tutmamız gerekmez.
- **Kaçınılacaklar:** Ücretli rastgele ödül kutuları (loot box). Belçika/Hollanda'da kumar olarak değerlendirilebilir, mağazalar olasılık açıklaması ister ve çocuk koruma riski taşır. Bunun yerine sabit içerikli paketler satın.

### Reklamlar (dikkat: "veri toplamama" iddiasıyla çelişir)

AdMob SDK'sı, **kişiselleştirilmemiş reklam (NPA) modunda bile** IP, cihaz bilgisi ve frekans sınırı için çerez benzeri tanımlayıcılar işler. Google bu modda da AEA/BK kullanıcıları için **ePrivacy kapsamında onay (UMP/CMP)** istenmesini şart koşar. Sonuçları:

- App Store etiketi "Data Not Collected" olamaz. Google Play Data Safety formunda Google'ın topladığı verilerin beyan edilmesi gerekir.
- Aydınlatma metnine Google'ı üçüncü taraf olarak eklemek gerekir.

**Önerim:**

1. **Başlangıç:** Reklam yok. Yalnızca IAP. "Hiçbir veri toplanmaz" iddiası ancak bu durumda tam doğru olur.
2. Reklam şartsa: Yalnızca **ödüllü reklam** (oyuncunun kendi tercihiyle izlediği), `requestNonPersonalizedAdsOnly: true`, AEA/BK'de UMP ile onay alınmadıysa **Limited Ads**, `tagForUnderAgeOfConsent` / `tagForChildDirectedTreatment` doğru ayarlı ve `com.google.android.gms.permission.AD_ID` izni engellenmiş olmalı. Gizlilik metni ve mağaza beyanları buna göre güncellenmeli. `PRIVACY.adsEnabled` bayrağı bunun için var.

---

## 8. Telif hakkı ve içerik sorumluluğu

- **Mekanikler telif kapsamında değildir** (stat, sıra tabanlı savaş, enerji ve görev döngüsü genel türe aittir). **İfade ise korunur:** isimler, metinler, görseller, UI düzeni, ikonlar, ses ve veri tabloları.
- Bu repoda:
  - Tüm isimler, kökenler, eşyalar, görevler ve formüller **özgündür** ve sıfırdan yazılmıştır.
  - Statlar `strength / agility / intellect / vitality / fortune` gibi jenerik kavramlardır.
  - Hiçbir şema, değer tablosu veya metin başka bir oyundan alınmamıştır.
- **Yapın:**
  - Mağaza başlığında, açıklamasında, anahtar kelimelerde ve reklamlarda "Gladiatus", "Gameforge" veya başka bir markayı **kullanmayın**. Rakip marka adıyla anahtar kelime doldurma marka ihlali ve mağaza politikası ihlalidir.
  - UI'ı belirli bir oyunun ekran düzenini taklit etmeyecek şekilde tasarlayın (trade dress).
  - Varlıklarınızı (görsel, font, ses) yalnızca lisansı net kaynaklardan alın: kendi üretiminiz, sözleşmeli sanatçı veya CC0. `docs/ASSET_LICENSES.md` dosyasında her varlığın kaynağını ve lisansını kaydedin.
  - Oyun adınız için TÜRKPATENT ve EUIPO'da marka araştırması yapın.
- **Kullanıcı içeriği (UGC):** Sohbet, mesaj, klan duvarı, profil açıklaması veya serbest yazılı çevrimiçi isim **yoktur**. Kullanıcının yazdığı tek metin (karakter adı) cihazdan çıkmaz; dolayısıyla moderasyon yükümlülüğü ve 5651 sayılı Kanun kapsamında "yer sağlayıcı" riski oluşmaz. Çevrimiçi görünen isimler, küfür veya hakaret içeremeyecek şekilde elle seçilmiş kelime listelerinden üretilir (`names.ts`).

---

## 9. Mağaza beyanları

| Durum | Apple Privacy Label | Google Play Data Safety |
|---|---|---|
| Çevrimiçi özellikler kapalı, reklam yok | **Data Not Collected** | **No data collected** |
| PvP/sıralama açık | "Data Not Linked to You": *Identifiers → User ID* (rastgele ladder ID), *Gameplay Content*. Takip: Hayır. | "Device or other IDs" (isteğe bağlı, şifreli aktarım, silme talebi mümkün) ve "App activity". Anlık işlenen veriler "ephemeral" olarak işaretlenir. |
| Reklam açık | AdMob'un beyan ettiği kategoriler eklenir. | Aynı şekilde. |

Mağazalar veri toplanmasa bile **herkese açık bir gizlilik politikası URL'si** ister: `docs/PRIVACY_NOTICE.md` içeriğini statik bir sayfada yayınlayın. Apple, hesap varsa hesap silme ister; bizde hesap yoktur, "Tüm Verilerimi Sil" yeterlidir.

---

## 10. Proje yapısı

```
arena-rpg/
├── package.json              # npm workspaces
├── tsconfig.base.json
├── docs/
│   ├── ARCHITECTURE.md       # bu belge
│   ├── PRIVACY_NOTICE.md     # gizlilik / aydınlatma metni şablonu (TR + EN)
│   ├── LEGAL_CHECKLIST.md    # yayın öncesi kontrol listesi
│   └── ASSET_LICENSES.md     # görsel/ses/font lisans kaydı
├── packages/
│   └── core/                 # @arena/core – istemci + sunucu ortak, saf TS
│       ├── src/
│       │   ├── stats.ts        # stat anahtarları, türetilmiş değerler
│       │   ├── character.ts    # köken, karakter oluşturma, XP/seviye
│       │   ├── items.ts        # eşya kataloğu, demirci formülleri
│       │   ├── economy.ts      # mağaza, envanter, ekipman, yükseltme
│       │   ├── energy.ts       # zaman tabanlı enerji
│       │   ├── quests.ts       # görevler (süre + PvE savaş)
│       │   ├── combat.ts       # deterministik sıra tabanlı savaş
│       │   ├── enemies.ts      # prosedürel rakip / hayalet
│       │   ├── save.ts         # kayıt şeması + migration
│       │   ├── transfer.ts     # transfer kodu, HKDF, AES-GCM
│       │   ├── pvp.ts          # snapshot, doğrulama, ladder ID, Elo
│       │   ├── names.ts        # üretilmiş anonim takma adlar
│       │   └── encoding.ts     # base32/base64url/utf8
│       └── test/
├── apps/
│   ├── server/               # @arena/server – Hono, log yok, TTL store
│   │   ├── src/app.ts          # /v1/pvp/fight, /v1/ladder, /v1/transfer
│   │   ├── src/lib/ttlStore.ts
│   │   ├── src/lib/rateLimit.ts
│   │   └── test/
│   └── mobile/               # @arena/mobile – Expo
│       ├── app.json            # allowBackup:false, izin engelleri, privacy manifest
│       ├── App.tsx             # basit durum makinesi yönlendirici
│       └── src/
│           ├── config/privacy.ts       # ağ/reklam/analitik bayrakları
│           ├── storage/database.ts     # SQLite + migration
│           ├── storage/saveRepository.ts  # şifreli kayıt, Keychain anahtarı, silme
│           ├── lib/api.ts              # tek ağ istemcisi (credentials: omit)
│           ├── lib/random.ts           # OS CSPRNG
│           ├── i18n/                   # TR metinler, gizlilik özeti
│           └── screens/                # CreateCharacter, Home, Privacy
```

---

## 11. Yol haritası

1. **MVP (çevrimdışı):** Görev, mağaza ve demirci ekranları (`QuestScreen`, `ShopScreen`, `SmithScreen`); savaş günlüğü görüntüleyici. Bu aşamada sunucu yok.
2. **Transfer:** Çevrimdışı dışa/içe aktarma ve QR kod (`expo-camera` yalnızca içe aktarırken, izin isteğiyle).
3. **Çevrimiçi (isteğe bağlı):** "Çevrimiçi özellikleri aç" onay ekranı, arena, sıralama ve sezon sıfırlama.
4. **Gelir:** IAP (kozmetik ve kolaylık), cihazda doğrulama, "Satın almaları geri yükle".
5. **Yayın:** `LEGAL_CHECKLIST.md` maddelerinin tamamı.
