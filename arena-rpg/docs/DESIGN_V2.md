# Tasarım v2: Sınıflar, Yetenekler, Seferler ve Hesap Modeli

Bu not, `gld.docx` tasarım belgesinin koda nasıl döküldüğünü, yapılan varsayımları ve açık kararları kaydeder.

## 1. Kodda olanlar (`packages/core/src/game/`)

| Dosya | İçerik | Belgedeki bölüm |
|---|---|---|
| `config.ts` | Parametre tablosunun tamamı (`fighter.*`, `skill.*`, `expedition.*`, `combat.*`, `plunder.*`, `seer.*`) | §8 |
| `classes.ts` | Gözcü / Kılıç Ustası / Müneccim; dal rolleri (savaş, imza, hibrit); temel stat çarpanları | §1 |
| `skills.json` | 9 dal × 6 yetenek = 54 yetenek. Alanlar: `id`, `class`, `branch`, `tier`, `max_rank`, `value_per_rank` veya `values_by_rank`, `effect` | §3–5 |
| `skills.ts` | YP hesabı, rütbe maliyeti, kademe kilidi, `rankUp`, sunucu tarafı `validateAllocation`, respec (Unutma İksiri) | §2 |
| `fighters.ts` | Dövüşçü durumu (kalede / seferde / arenada / yaralı), dövüşçü açılma seviyeleri, +%50 yetişme deneyimi | Genel, §8 |
| `expedition.ts` | Bölgeler, slot formülü, süre (%40 taban), göreli nadir şansı + üst sınır, olay ve yaralanma zarları, geri çağırma, Zaman Büküm, günlük kehanet | §6 |
| `pvpRules.ts` | Yağma (korunan %25), seviye farkı koruması, arena can kaybı, sunucu saatine göre gece | §4–5 |

Rastgelelik her zaman dışarıdan verilir (`rng`). Sunucu her sefer için bir `seed` üretip kayda yazar; aynı seed ile sonuç birebir yeniden üretilebilir. Belgedeki "loglanabilir RNG" şartı böyle karşılanıyor.

## 2. Denge kontrolünün bulduğu iki sorun

`npm test` çıktısındaki denge raporuna göre (`rank_costs = [1,1,2,2,3]`):

| Sınıf | Dal | Dalı doldurma maliyeti | Ustalık öncesi harcanabilen | Ustalık (30 YP) açılır mı? |
|---|---|---|---|---|
| Gözcü | Keşif | 36 | 35 | Evet |
| Gözcü | Gölge | 28 | 27 | **Hayır** |
| Gözcü | Avcı | 41 | 40 | Evet |
| Kılıç Ustası | Kılıç | 36 | 35 | Evet |
| Kılıç Ustası | Kalkan | 28 | 27 | **Hayır** |
| Kılıç Ustası | Savaş Ağası | 36 | 35 | Evet |
| Müneccim | Yıldızlar | 26 | 25 | **Hayır** |
| Müneccim | Lanet | 36 | 35 | Evet |
| Müneccim | Simya | 31 | 30 | Evet |

1. **Üç dal birden doluyor.** Seviye 100'de 109 YP var. Bir sınıfın üç dalının toplamı 93–105 YP. Yani "en fazla 2 dal dolar" hedefi tutmuyor; 100. seviyede herkes her şeyi alıyor.
2. **Üç ustalık hiç açılmıyor.** Gölge, Kalkan ve Yıldızlar dallarında ustalık öncesine harcanabilecek puan 30'dan az. Bu yüzden Gölge Saldırısı, Sarsılmaz ve Tutulma hiçbir zaman alınamıyor.

**Önerim:** `rank_costs = [1,2,2,3,4]`. Bu değerle dallar 33–54 YP tutar, her ustalık açılabilir ve sınıf toplamı 120–137 olur (109 YP'yi aşar, yani seçim zorunlu hale gelir). Tek satırlık bir config değişikliği; onayınızla uygularım. Daha dengeli dallar için Gölge, Kalkan ve Yıldızlar'a birer yetenek eklenmesi ya da maks. rütbelerin artırılması da düşünülebilir.

## 3. Varsayımlar (onayınızı bekleyenler)

- **Hesap seviyesi**, hesaptaki en yüksek dövüşçünün seviyesidir. Belge bunu ayrıca tanımlamıyor.
- **Yetişme deneyimi**, dövüşçü en yüksek dövüşçüden 5 seviyeden fazla gerideyken uygulanır. Belgede "yaklaşana kadar" yazıyor.
- **Sefer slotları** §6.1'e göre hesaplanır: araştırma + her 25 Gözcü seviyesi için +1. Belgenin başındaki "10. seviyede 2 slot" ifadesi bununla çelişiyor; §6.1 esas alındı.
- **Gözcü'nün "daha hızlı / %30 daha iyi ödül" avantajı**, sınıf pasifi değil, Keşif dalı yetenekleriyle geliyor (§3.1). Tam doldurulmuş Keşif dalı: süre −%20, nadir şansı +%15 (göreli).
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

1. Rütbe maliyeti kararı (§2) ve §3 varsayımlarının onayı.
2. Savaş motorunu sınıf, yetenek ve takım savaşına göre genişletmek (Yarma, Koruyucu, Şifacı, İlk Vuruş, Gölgeye Karış…).
3. Sunucu: PostgreSQL şeması, e-posta ile kayıt ve giriş, seferler ve Raporlar kutusu, yönetici paneli.
4. Arayüz: ana menü sekmeleri (Kafa Kazanı, Salı Pazarı, Envanter + karakter giydirme), yükleme ekranları.
