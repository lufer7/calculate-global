# Tasarım v2: Sınıflar, Yetenekler, Seferler ve Hesap Modeli

Bu not, `gld.docx` tasarım belgesinin koda nasıl döküldüğünü, yapılan varsayımları ve açık kararları kaydeder.

## 1. Kodda olanlar (`packages/core/src/game/`)

| Dosya | İçerik | Belgedeki bölüm |
|---|---|---|
| `config.ts` | Parametre tablosunun tamamı (`fighter.*`, `skill.*`, `expedition.*`, `combat.*`, `plunder.*`, `seer.*`) | §8 |
| `classes.ts` | Gözcü / Kılıç Ustası / Müneccim; dal rolleri (savaş, imza, hibrit); temel stat çarpanları | §1 |
| `skills.json` | 9 dal × 6 yetenek = 54 yetenek. Alanlar: `id`, `class`, `branch`, `tier`, `max_rank`, `value_per_rank` veya `values_by_rank`, `effect` | §3–5 |
| `skills.ts` | YP hesabı, rütbe maliyeti, kademe kilidi, `rankUp`, sunucu tarafı `validateAllocation`, respec (Unutma İksiri) | §2 |
| `fighters.ts` | Dövüşçü durumu (hazır / seferde / arenada / yaralı), dövüşçü açılma seviyeleri, +%50 yetişme deneyimi | Genel, §8 |
| `expedition.ts` | Bölgeler, slot formülü, süre (%40 taban), göreli nadir şansı + üst sınır, olay ve yaralanma zarları, geri çağırma, Zaman Büküm, günlük kehanet | §6 |
| `pvpRules.ts` | Yağma (korunan %25), seviye farkı koruması, arena can kaybı, sunucu saatine göre gece | §4–5 |

Rastgelelik her zaman dışarıdan verilir (`rng`). Sunucu her sefer için bir `seed` üretip kayda yazar; aynı seed ile sonuç birebir yeniden üretilebilir. Belgedeki "loglanabilir RNG" şartı böyle karşılanıyor.

## 2. Denge (çözüldü)

İlk değerlerle (`rank_costs = [1,1,2,2,3]`) 100. seviyede üç dal birden doluyordu ve Gölge, Kalkan ve Yıldızlar dallarının ustalıkları hiç açılamıyordu. `rank_costs = [1,2,2,3,4]` ile:

| Sınıf | Dal maliyetleri | En pahalı iki dal | Üç dal |
|---|---|---|---|
| Gözcü | Keşif 47, Gölge 36, Avcı 54 | 101 ≤ 109 | 137 > 109 |
| Kılıç Ustası | Kılıç 47, Kalkan 36, Savaş Ağası 47 | 94 ≤ 109 | 130 > 109 |
| Müneccim | Yıldızlar 33, Lanet 47, Simya 40 | 87 ≤ 109 | 120 > 109 |

Her ustalık kendi dalına yatırımla açılıyor. Bu iki kural testlerde sabitlendi; ileride bir yetenek eklenip denge bozulursa test kırılır.

### 2.1 Ana sınıf avantajları (hesap geneli)

Hesabın **ilk dövüşçüsünün sınıfı** "ana sınıf" olur ve hesaptaki bütün dövüşçülere kalıcı avantaj sağlar. Bu avantajlar araştırmayla ya da yetenek puanıyla açılmaz; ilk karakter oluşturulduğu anda gelir ve sonradan değişmez (`classPerks.ts`).

| Ana sınıf | Avantaj adı | Etki |
|---|---|---|
| Gözcü | Kâşifler Yolu | Tüm seferler %20 daha kısa; nadir ve üstü ödül şansı %30 daha yüksek (göreli) |
| Kılıç Ustası | Kılıç Hakkı | Kazanılan saldırılarda %25 daha fazla altın; saldırıya uğrayınca %25 daha az altın kaybı; demircide %15 indirim |
| Müneccim | Yıldız Okuru | Kafa Kazanı araştırmaları %20 daha kısa; günün kehanet bölgesi her zaman görünür ve oraya giden seferlere +%10 ödül; yaralanma süresi %20 daha kısa |

Gözcü dövüşçüsünün "her 25 seviyede +1 sefer slotu" pasifi ayrıca geçerli. Bu, dövüşçünün kendisine bağlıdır, ana sınıftan bağımsızdır. Yetenek ve ana sınıf bonusları toplanır, ama süre için %40 tabanı ve olasılıklar için üst sınır her zaman korunur.

## 3. Varsayımlar (onayınızı bekleyenler)

- **Hesap seviyesi**, hesaptaki en yüksek dövüşçünün seviyesidir. Belge bunu ayrıca tanımlamıyor.
- **Yetişme deneyimi**, dövüşçü en yüksek dövüşçüden 5 seviyeden fazla gerideyken uygulanır. Belgede "yaklaşana kadar" yazıyor.
- **Sefer slotları** §6.1'e göre hesaplanır: araştırma + her 25 Gözcü seviyesi için +1. Belgenin başındaki "10. seviyede 2 slot" ifadesi bununla çelişiyor; §6.1 esas alındı.
- **Bölgeler:** Karanlık Orman (Sv 1), Sisli Bataklık (Sv 20), Terk Edilmiş Madenler (Sv 45) ve yalnızca Kayıp Diyarlar ustalığıyla açılan Kayıp Diyarlar (Sv 60). Süreler ve ödül ağırlıkları başlangıç değerleridir.
- **Seviye farkı koruması:** 5 seviyeye kadar tam ödül; 5–20 arası ödül doğrusal azalır; 20+ farkta saldırı engellenir.
- **Arena:** Yenilgide can %15 düşer; yaralanma ve altın kaybı yoktur.
- **Araştırma sekmesinin adı:** **Kafa Kazanı**. Değiştirmek için `config.ts` içindeki `research.tab_name` alanı yeterli.

## 4. Hesap modeli değişti: e-posta ile üyelik

İlk mimari "hesap yok, veri yok" üzerineydi (`ARCHITECTURE.md`). E-posta ile üyelik ve sunucu otoritesi seçildiği için şunlar değişiyor:

- **Kişisel veri artık işleniyor.** E-posta adresi ve bir hesapla ilişkilendirilmiş oyun verisi KVKK ve GDPR kapsamındadır. Yasal sorumluluk sıfırlanamaz; yalnızca küçültülebilir. Bu yüzden:
  - Yalnızca e-posta istenir; ad, telefon, doğum tarihi istenmez. Oyun içi isim takma addır.
  - Şifreler Argon2id ile saklanır, e-posta doğrulanır. Yönetici paneli için TOTP iki adımlı doğrulama ve işlem kaydı (audit log) tutulur.
  - Hesap silme talebi, uygulama içinden tek dokunuşla yapılabilir (Apple ve Google bunu zorunlu tutuyor).
  - Saklama süreleri tanımlanır. Örneğin 24 ay giriş yapılmayan hesap uyarı sonrası silinir.
- **Kayıt ekranında onay:** Aydınlatma metni okundu onayı ve kullanım koşulları kabulü olmadan kayıt tamamlanmaz.
  - Dikkat: Hesap için gereken e-posta işlenmesinin dayanağı "sözleşmenin ifası"dır (KVKK md. 5/2-c). Buna ayrıca "açık rıza" istemek gerekmez ve Kurul bunu yanlış uygulama sayıyor.
  - Açık rıza yalnızca gerçekten isteğe bağlı işlemler için (ör. pazarlama e-postası) ayrı ve işaretsiz bir kutuyla alınır.
- **Yöneticiye yeni üye bildirimi:** Bildirimde e-posta adresi değil, hesap ID'si ve takma ad gösterilir. Yönetici e-postayı gerekirse panelden görür ve bu erişim kayda geçer.
- **Push bildirimi:** Kalıcı bir cihaz tanımlayıcısı (push token) gerektirir. Ayarlardan kapatılabilir ve aydınlatma metninde belirtilir.
- **Sunucu otoritesi:** Zamanlayıcılar, savaşlar ve zarlar sunucuda çalışır; cihaz yalnızca gösterir. İlk iskeletteki "ilerleme yalnızca cihazda" yaklaşımı yerini sunucudaki PostgreSQL veritabanına bırakır. Çekirdek kod (`@arena/core`) aynen kullanılmaya devam eder.
- **Sohbet yok** kuralı korunuyor. Pazar ve lonca özelliklerinde serbest metin olmayacak; kehanet paylaşımı gibi şeyler hazır mesajlarla yapılacak.

`PRIVACY_NOTICE.md` ve `ARCHITECTURE.md` bu modele göre güncellenecek. Metinler sunucu ve kayıt akışı yazılırken birlikte değiştirilecek ki iddialar kodla aynı kalsın.

## 5. Görseller

Şimdilik yer tutucu kullanılıyor. İleride yükleme ekranları (orta çağ manzaraları + altta oyun ipucu), açılış ekranı ve oyun içi sahneler, Albion Online'a benzer old-school ama kaliteli bir tarzda hazırlanacak. Görseller sıfırdan, lisansı net kaynaklardan yapılmalı ve `ASSET_LICENSES.md` dosyasına kaydedilmeli; başka bir oyunun görselleri birebir taklit edilmemeli.

## 6. Sıradaki adımlar

1. §3 varsayımlarının onayı.
2. Savaş motorunu sınıf, yetenek ve takım savaşına göre genişletmek (Yarma, Koruyucu, Şifacı, İlk Vuruş, Gölgeye Karış…).
3. Sunucu: seferler ve Raporlar kutusu, v2 aydınlatma metni, gerçek e-posta sağlayıcısı. (Kayıt, giriş ve yönetici paneli hazır, bkz. §7.)
4. Arayüz: ana menü sekmeleri (Kafa Kazanı, Salı Pazarı, Envanter + karakter giydirme), yükleme ekranları.

## 7. Yönetici paneli

Oyun sunucusu paneli `/admin` adresinde sunar. API `/admin/api` altındadır.

**Güvenlik**
- Yönetici hesapları oyuncu hesaplarından tamamen ayrıdır. Bir oyuncu oturumu panel uçlarını açamaz.
- Her girişte şifre ve kimlik doğrulama uygulamasındaki 6 haneli kod (TOTP) istenir. Aynı kod iki kez kullanılamaz.
- Oturum 30 dakika işlem yapılmazsa, her durumda en geç 8 saat sonra kapanır. Oturum anahtarı yalnızca sayfanın belleğinde tutulur; sekme kapanınca çıkış yapılmış olur.
- Giriş denemeleri dakikada 10 ile sınırlı.
- Sıkı CSP (dış kaynak yok, nonce'lu tek betik) ve `X-Frame-Options: DENY` kullanılıyor. Oyuncu verisi sayfaya yalnızca düz metin olarak basılıyor, yani XSS'e karşı korumalı.
- `ADMIN_ALLOWED_IPS` ayarlanırsa `/admin` başka adreslerden 404 döner.

**Özellikler**
- Genel bakış: hesap ve dövüşçü sayıları, bugünkü kayıtlar, ana sınıf dağılımı, bildirimler.
- Oyuncu arama: takma ad, dövüşçü adı, hesap ID veya tam e-posta. E-posta ile arama kayda geçer.
- Oyuncu detayı: e-posta maskeli gösterilir (`k***@g****.com`). Tam adres yalnızca gerekçe yazılarak açılır ve bu kayda geçer.
- Yasaklama (1/7/30 gün veya kalıcı, gerekçe zorunlu). Oyuncunun açık oturumları anında kapanır ve oyuncu girişte gerekçeyi görür. Yasağı kaldırma da var.
- Dövüşçü adı değiştirme: oyuncuların yazdığı tek metin olduğu için moderasyon buradan yapılır.
- Hesap silme (gerekçe ve takma adı yazarak onay).
- İşlem kaydı: paneldeki her işlem silinemez şekilde tutulur.

**Bildirimler.** Yeni üye doğrulandığında ve yeni dövüşçü oluşturulduğunda panele bildirim düşer. `ADMIN_NOTIFY_EMAIL` ayarlıysa e-posta da gönderilir. Bildirimlerde oyuncunun e-postası yer almaz.

**Kurulum**
```bash
ADMIN_PASSWORD="en-az-14-karakter" npm run admin:create -w @arena/server -- siz@ornek.com
npm run dev -w @arena/server        # http://localhost:8787/admin
```
Betik, kimlik doğrulama uygulamanıza ekleyeceğiniz anahtarı bir kez gösterir.

**"Oyun içinde" panel.** Panel tarayıcıda çalışır ve telefon ekranına da uyumludur. Mobil uygulamaya ayrı bir sekme olarak eklemek mümkün: sekme yalnızca yönetici girişi yapıldığında görünür, aynı API'yi ve aynı TOTP korumasını kullanır. Güvenliği istemci değil sunucu sağlar.

**Henüz eksik:** Gerçek e-posta gönderimi (şu an geliştirme modunda kodlar terminale yazılıyor; sunucu üretim modunda bu yüzden başlamayı reddediyor). Ayrıca PostgreSQL'e geçiş, v2 aydınlatma metni ve kullanım koşulları metinleri.

## 8. Mobil uygulama (v2)

Uygulama artık sunucuya bağlı çalışıyor; cihazda yalnızca oturum anahtarı (Keychain/Keystore) tutuluyor.

- **Açılış:** Liman manzaralı yer tutucu yükleme ekranı ve dönen ipuçları.
- **Kayıt / giriş:** E-posta, şifre, iki zorunlu onay (Aydınlatma Metni, Kullanım Koşulları), ayrı ve isteğe bağlı pazarlama izni, 6 haneli doğrulama kodu. Yasaklı hesap gerekçeyi ve bitiş tarihini görür.
- **Ana karakter:** Üç sınıf, savaş tarzları ve ana sınıf avantajlarıyla birlikte gösterilir.
- **Sekmeler:** Güncel hali için §10'a bakın.
- **Zaman:** Bütün süreler sunucuda; uygulama geri sayımı sunucu saatine göre gösterir ve süre dolunca durumu yeniler.

**Test modu:** `npm run dev` süreleri 20 kat hızlandırır (`GAME_SPEED`). Üretimde her zaman 1'dir.

## 9. Sıradaki adımlar (güncel)

1. Gerçek e-posta servisi (AB bölgeli, veri işleme sözleşmeli) ve üretim ayarları.
2. ~~24 ay giriş yapmayan hesapların silinmesi~~ Yapıldı: saklama ve imha görevi, KVKK araçları ve başvuru takibi (`KVKK_COMPLIANCE.md`).
3. Envanter + karakter giydirme + demirci, Salı Pazarı (saatlik NPC stoğu), iksirler (Unutma İksiri ile ücretli respec).
4. Savaş motorunun sınıf ve yeteneklere göre genişletilmesi; Arena ve PvP saldırıları, casusluk.
5. Push bildirimleri (sefer dönüşü, saldırı uyarısı; ayarlardan kapatılabilir).
6. PostgreSQL'e geçiş ve canlı sunucu kurulumu.

## 10. Çete, ekipman, pazar, arena ve görsel tasarım (v3)

### Kale yok, çete var
Oyuncunun bir kalesi, köyü veya şehri yok. Ana karakter (reis) ve sonradan katılan dövüşçüler küçük bir **çete** oluşturur. "Kale boş kalacak" uyarısı kaldırıldı. Kale Savunucusu yeteneği **Çete Savunucusu** oldu. Gökbilim ve Müneccim pasifinde "kalede iken" şartı "seferde değilken" oldu.

### Ekipman ve çanta (`gear.ts`)
- **Giyim yuvaları:** baş, kolye, gövde, silah, yan el, eller, 2 yüzük, ayaklar.
- **Sınıfa bağlı eşyalar:** Silahlar ve yan eller sınıfa göre: Gözcü yay/hançer/sadak, Kılıç Ustası kılıç/balta/topuz/kalkan, Müneccim asa/değnek/kitap. Zırh ve takılar herkese.
- **Nadirlik:** Sıradan, Kaliteli, Nadir, Destansı, Efsanevi. Değerler eşya seviyesi, nadirlik ve demirci güçlendirmesiyle (+0…+10) büyür.
- **Adlar:** Eşya seviyesine göre malzeme önekiyle oluşur: Paslı/Eski → Demir → Çelik → Usta İşi.
- **Kullanım sınırı:** Dövüşçü en fazla 2 seviye üstündeki eşyayı giyebilir.
- **Çete çantası:** 48 yuva, ortak. Yiyecek, iksir ve malzemeler üst üste biner.
- **Başlangıç kiti:** Her yeni dövüşçü kendi sınıfının silahı, başlığı ve gövde zırhıyla gelir; çeteye 3 ekmek verilir.

### Savaş motoru (`battle.ts`)
- **Hesap:** Sınıf özellikleri, seviye, ekipman ve savaş yetenekleri birlikte hesaplanır.
  - Gözcü: kritik, kaçınma ve zırh delme.
  - Kılıç Ustası: can ve zırh.
  - Müneccim: büyü hasarı; zırh büyüyü yalnızca kısmen durdurur.
- **İşlenen yetenekler:** İlk Vuruş, Çift Ok, Avcının Sabrı, Öfke, Kararlılık, Kan Bağı, Şifacı, Zayıflık Laneti, Kör Yıldız, Kara Ay, Gece Gücü, Gölgeye Karış (kaçış) ve diğer sayısal bonuslar.
- **Denge:** Aynı seviye ve benzer ekipmanla sınıf eşleşmeleri %38–63 aralığında. Bir test bunu korur; ince ayar canlı verilerle yapılmalı.

### Salı Pazarı (`economy.ts`)
- **Tezgâhlar:** Her çeteye özel, her oyun saatinde yenilenir:
  - 8 ekipman (yarısı ana sınıfa uygun),
  - 4 yiyecek,
  - 4 iksir (Şifa, Hız, Şans, Unutma).
- **Satın alma:** Her mal saatte bir kez alınır.
- **Satış:** Çantadaki eşya, fiyatının %25'ine satılır.
- **Yiyecekler:** Canı %20–100 doldurur.
- **İksirler:**
  - Şifa İksiri yaralanmayı anında geçirir.
  - Hız İksiri yoldaki seferi %10 kısaltır (%40 tabanına uyarak).
  - Şans İksiri sefer gönderilirken kullanılır (+%15 nadir).
  - Unutma İksiri bekleme süresine uyarak yetenek puanlarını iade eder.

### Demirci
- **Güçlendirme:** Her eşya +10'a kadar güçlendirilir ve işlem her zaman başarılı olur.
- **Maliyet:** Kılıç Hakkı (ana sınıf) ve Demirci Dostu yeteneği maliyeti düşürür.

### Arena
- **Rakipler:** Her dövüşçü için 3 NPC gladyatör (seviye −1, aynı, +2) ve seviyesi yakın 3 başka oyuncu dövüşçüsü.
- **Sonuç:** Sunucu savaşı hesaplar; uygulama savaşı tur tur canlandırır.
- **Kazanırsan:** Altın, deneyim ve şöhret.
- **Kaybedersen:** Yalnızca %15 can kaybı. Yaralanma ve altın kaybı yok.
- **Sınırlar:** 10 dakikalık dinlenme süresi; canı %15'in altındaki dövüşçü savaşamaz.
- **Savunan oyuncu:** Hiçbir şey kaybetmez.
- **Şöhret sıralaması:** İlk 20 dövüşçü.

### Can, avcılık ve simya
- **Can yenilenmesi:** Yaralı olmayan dövüşçülerin canı saatte %10 yenilenir.
- **Avcılık:** Avcılık yeteneği olan Gözcüler rütbe başına saatte 1 kaynak (deri, kemik, av eti) toplar. Çanta doluysa üretim durur.
- **Simya:** Müneccimler İksir Yapımı rütbesine göre bu kaynaklardan iksir kaynatır. Usta Simyacı ile 2 adet çıkabilir.
- **Ganimet:** Seferlerden ödül kademesine göre ekipman ve yiyecek düşer. Çanta doluysa raporda belirtilir.

### Görsel tasarım
- **Tema:** "Taş ve parşömen": koyu taş mavisi-yeşili paneller, parşömen rengi yazılar, eskimiş altın kenarlar, serif başlıklar.
- **Sahneler:** Bütün görseller kodla çizilen SVG'lerdir (`apps/mobile/src/art/`):
  - Liman, Karanlık Orman, Sisli Bataklık, Terk Edilmiş Madenler, Kayıp Diyarlar,
  - Salı Pazarı, Arena, Kafa Kazanı, kamp ateşi.
- **Portreler ve ikonlar:**
  - 3 sınıf portresi,
  - 30'a yakın eşya ikonu (nadirlik renkli çerçeveyle),
  - menü ikonları.
- **Telif:** Hiçbiri başka bir oyundan alınmadı. Gerçek illüstrasyonlar geldiğinde aynı anahtarlarla değiştirilebilir (`Scene`, `ItemIcon`, `Portrait`).
- **Menü:** Altta Çete, Çanta, Sefer, Arena, Pazar ve Daha (Kafa Kazanı, Simya, Raporlar, Hesap).
- **Çanta ekranı:**
  - Gladiatus'taki gibi, giyim penceresi ve çanta aynı ekranda.
  - Bir eşyaya dokununca giyili eşyayla ▲▼ karşılaştırma açılır.
  - Aynı karttan giy, çıkar, ye/kullan, demirci ve sat işlemleri yapılır.

### Henüz yok
- Oyuncular arası ortak pazar (açık artırma).
- Oyuncu çetelerine saldırı ve yağma (kurallar `pvpRules.ts` içinde hazır, ekranı yok).
- Casusluk, lonca ve kehanet paylaşımı.
- Push bildirimleri.
