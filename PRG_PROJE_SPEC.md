# PRG — Programatik Reklam Platformu / Proje Spec'i

> Bu dosyayı Claude Code'a ya olduğu gibi yapıştır, ya da proje klasörüne
> `PRG_PROJE_SPEC.md` olarak koyup "bu spec'i oku ve P0'dan başla" de.
> İkinci yöntem daha iyi: Claude Code dosyayı referans alarak çalışır, context kaybolmaz.

---

## 0. BANA NE YAPTIRACAKSIN

Türkiye'deki dijital medya ve programatik reklam çalışanları için, programatik dünyanın
tamamını tek yerde toplayan bir web platformu kuruyoruz. Hedef kullanıcı: ajans tarafında
çalışan programatik uzmanı, medya planlayıcı, dijital medya müdürü, reklamveren tarafındaki
dijital pazarlama ekibi, ve sektöre yeni girenler.

Site Türkçe. Ton **ciddi ama eğlenceli** — sektörün kendi içinden konuşan, hafif iğneleyici,
sempatik bir dil. Kurumsal SaaS dili ("çözümlerimizle verimliliğinizi artırın") kesinlikle yok.
Örnek ton: "Frekans 14'e çıkmış. Kullanıcı artık seni rüyasında görüyor."

### ⛔ MUTLAK KURAL — ŞİRKET VERİSİ VE LİSANSI BU PROJEDE KULLANILMAZ

Bu proje sahibinin kişisel projesidir ve çalıştığı ajansla hiçbir bağı yoktur. Aşağıdakiler
**hiçbir koşulda, hiçbir biçimde, hiçbir aşamada** bu platforma girmez:

- Ajansın satın aldığı veya lisansladığı hiçbir veri kaynağı (Gemius, Similarweb, comScore,
  Nielsen, IAS/DoubleVerify raporları, SSP/yayıncı özel raporları dâhil)
- Ajansın veya müşterilerinin DSP hesaplarından çıkan hiçbir veri — ham, agregat,
  anonimleştirilmiş veya türetilmiş hiçbir hâli
- Ajansın BigQuery projesi, servis hesapları, API anahtarları, dahili dokümanları
- Müşteri adları, kampanya adları, bütçeleri, rate card'ları, deal ID'leri, CPM'leri
- Ajansın iç süreç dokümanlarından kopyalanmış şablonlar

Bu kural kalibrasyon, doğrulama, "sadece kendim bakacağım" veya "veritabanına yazmıyoruz"
gerekçeleriyle **esnetilmez.** Şirket bilgisinden türetilmiş bir sayı, saklanmasa bile
yayınlandığı an public bir figür hâline gelir.

Platformun kullanabileceği veri yalnızca üç kategoriden gelir:
1. **Bize ait olan** — kendi crawl'ımız (ads.txt, sellers.json), kendi hesaplama modellerimiz
2. **Ücretsiz ve açık** — Cloudflare Radar, Chrome UX Report (CrUX), public benchmark raporları
3. **Platformun kendi adına satın aldığı ve gösterim hakkı olan** — kişisel hesapla alınmış,
   lisansı sitede gösterime izin veren ücretli API'ler (§4.2c)

Bir veri parçasının bu üçünden hangisine girdiği belirsizse, **kullanılmaz.** `kaynak`
alanı bu üç kategoriden birini zorunlu olarak taşıyacak.

**Sosyal medya (Meta/TikTok) tarafı sonra eklenecek.** Veri modelini ve klasör yapısını
baştan `channel` / `platform` kavramı üzerine kur ki `programmatic` dışında `social` kanalı
eklendiğinde refactor gerekmesin.

---

## 1. TEMA — "BID TERMINAL" (karar verildi)

Koyu, yoğun, terminal/trading-masası estetiği. Bloomberg terminali ile bir DSP arayüzünün
çocuğu gibi. Mizah **görselde değil metinde** — arayüz ciddi görünür, yazdığı şey komiktir.
Bu sayede ajans Slack'inde veya müşteri toplantısında da açılabilir.

Tokenları `tailwind.config.ts` + `app/globals.css` içine CSS custom property olarak koy:

```
--bg:        #0A0C10      sayfa zemini
--bg-alt:    #0D1017      alternatif bant zemini
--panel:     #13161E      kart / panel
--border:    #232936      kart kenarlığı
--border-dim:#1C222D      bölüm ayırıcı
--text:      #E8ECF4      ana metin
--muted:     #9AA3B5      ikincil metin
--dim:       #5C6578      üçüncül / etiket
--accent:    #FFB224      amber — birincil aksiyon, vurgu
--up:        #3DF5A0      artış / pozitif
--down:      #FF5C6E      düşüş / negatif / uyarı
--info:      #5B9DFF      bilgi, JSON key rengi

font-display / mono:  'JetBrains Mono'   (başlık dışı her yerde: etiket, sayı, tablo, kod)
font-body:            'Inter'            (başlıklar ve paragraflar)
radius: 6px (kart 8px) · kenarlık 1px · gölge yok, derinlik kenarlıkla veriliyor
```

Tema karakteri:
- Sayılar **her zaman** monospace. Tablo ve ticker'da hizalama bozulmayacak.
- Etiketler `// BÖLÜM ADI` veya `01 / MODÜL ADI` formatında, uppercase, letter-spacing 0.1em.
- Artış/düşüş `▲ %2,1` / `▼ %0,8` şeklinde. Renk tek başına anlam taşımayacak — ok işareti
  her zaman eşlik edecek (renk körlüğü ve siyah-beyaz çıktı için).
- Hero'da ve araç sayfalarında `>` prompt'lu bir komut çubuğu var: kullanıcı `/cpm banner`
  yazıp doğrudan araca atlayabilir. Bu site kimliğinin imzası, P1'de gerçekten çalışacak.
- Sistem log'u tonunda alt satırlar: `sistem: viewability %38 görünüyor.` Bunlar statik
  süs değil — gerçekten o sayfadaki duruma göre üretilecek. Metinleri bir `lib/quips.ts`
  dosyasında topla, duruma göre seç (yüksek frekans, düşük viewability, pacing sapması...).

Ortak kurallar:
- Mobil öncelikli responsive. Tüm hesaplama araçları telefonda çalışacak — sektörde
  insanlar bunu metrobüste açıyor.
- Dark/light mode: Tema A zaten dark. B ve C için ikinci bir mod kur.
- Erişilebilirlik: gerçek `<button>` / `<a href>` / `<label>`, metin kontrastı min 4.5:1,
  dokunma hedefi min 44px, ikon-only butonlara `aria-label`.
- Emoji ikon kullanma, inline SVG kullan.
- Sayfa başına tek bir "işe yarar" aksiyon. Araç sayfaları forma odaklı, giriş ekranı yok.

---

## 1b. SEKME ADLARI VE ROUTE'LARI — AYNEN BUNLARI KULLAN

Sekme adları **fiil odaklı**. "Rapor" veya "Hedef Kitle" gibi ne yaptığı belirsiz
başlıklar kullanılmayacak; kullanıcı sekmeye bakınca o sayfada ne yapacağını anlayacak.

| Sekme adı (nav) | Route | Sayfa H1 | Ne yapıyor |
|---|---|---|---|
| Sözlük | `/sozluk` | Programatik Sözlük | Terim arama ve açıklama |
| Metrik Hesapla | `/hesapla` | Metrik Hesapla | CPM, CTR, viewability vb. hesap makineleri |
| Reach Tahminle | `/reach-tahmin` | Reach &amp; Frekans Tahmini | Bütçe ↔ tekil erişim ↔ frekans |
| Envanter Ara | `/envanter` | Envanter Ara | URL gir, hacim + kategori + açık envanter durumu |
| Hedef Kitle Çalış | `/hedef-kitle` | Hedef Kitle Çalışması | Brief gir, DSP seç, kitle Excel'i üret |
| Rapor Yorumla | `/rapor` | Rapor Yorumla | Rapor yükle, PDF performans yorumu al |
| Mecra &amp; Spec Bul | `/mecra` | Mecra &amp; Spec Rehberi | Hangi mecra, hangi DSP, hangi spec |

Notlar:
- Nav'da 7 sekme var; mobilde hamburger menüye düşecek. Masaüstünde tek satırda sığmazsa
  "Mecra &amp; Spec Bul"u kısalt: **"Spec Bul"**.
- Route'lar Türkçe ve sabit — SEO için sonradan değiştirmeyeceğiz. Eski bir isme link
  verilmişse `redirects` ile yönlendir.
- Sayfa `<title>` formatı: `Metrik Hesapla — PRG` · ana sayfa: `PRG — Programatik Masası`.
- Anasayfadaki modül kartlarının etiketleri nav adlarıyla **birebir aynı** olacak:
  `01 / SÖZLÜK`, `02 / METRİK HESAPLA`, `03 / REACH TAHMİNLE`, `04 / ENVANTER ARA`,
  `05 / HEDEF KİTLE ÇALIŞ`, `06 / RAPOR YORUMLA`. Kullanıcı nav'da gördüğü adı kartta
  da görecek, kafası karışmayacak.
- Her kartın başlığı bir **soru** olacak, alt metni cevabı. Örnek: "Bu siteye girebiliyor
  muyum?" / "Bu bütçe kaç kişi eder?" / "Raporu at, yorumu bekle". Sekme adı ne yaptığını,
  kart başlığı neden gerektiğini anlatıyor.

---

## 2. TEKNİK STACK

```
Framework      Next.js 15 (App Router) + TypeScript (strict)
Styling        Tailwind CSS v4 + CSS custom properties (tema tokenları)
DB             PostgreSQL — Supabase (auth + storage + postgres tek pakette)
ORM            Drizzle ORM (migration'ları repoda tut)
Auth           Supabase Auth — e-posta magic link. Çoğu araç GİRİŞSİZ çalışacak;
               auth sadece kaydedilen hesaplamalar, favoriler ve admin paneli için.
AI             Anthropic API (@anthropic-ai/sdk) — server-side only, API key asla client'a gitmez
Excel          exceljs (hücre rengi + çok sheet gerekiyor, xlsx paketi yetmez)
PDF            @react-pdf/renderer + gömülü Türkçe destekli font (Inter veya Noto Sans)
               DİKKAT: Türkçe karakterler (ğ ş ı İ ç ö ü) için fontu mutlaka embed et,
               varsayılan Helvetica ı/İ'de kırılır.
Grafik         Recharts
Cron           Vercel Cron (veya Supabase pg_cron) — günlük veri zenginleştirme
Deploy         Vercel
Analytics      Vercel Analytics + Google Analytics 4
Para kazanma   Google AdSense slotları (sözlük ve araç sayfalarında, içeriği boğmayacak
               şekilde: tek yan slot + tek alt slot. Hesaplama formunun içine reklam koymak yok.)
```

Klasör yapısı:
```
/app
  /(site)            → public sayfalar
    /sozluk/[slug]
    /hesapla/[arac]
    /reach-tahmin
    /mecra/[slug]
    /envanter
    /envanter/[domain]
    /hedef-kitle
    /rapor
  /admin             → korumalı: CPM tabloları, sezon katsayıları, mecra spec'leri, sözlük
  /api
    /cpm
    /domain
    /audience
    /report
/lib
  /calc              → SAF fonksiyonlar, hiç React yok, hepsi unit testli
  /cpm               → CPM modeli + sezonluk katsayı motoru
  /adstxt            → ads.txt / sellers.json parser
  /providers         → crux.ts, cloudflare-radar.ts, digitalrank.ts
                       (her dosya §4.2c lisans yorum bloğuyla başlar)
  /ai                → prompt'lar + şema doğrulama
/db
  schema.ts, migrations/
/content             → MDX: sözlük maddeleri, mecra spec'leri (git'te versiyonlu)
```

**Önemli mimari kuralı:** `lib/calc` içindeki tüm hesaplama fonksiyonları saf TypeScript,
React'tan bağımsız ve %100 unit test kapsamında olacak. Vitest kur. Bir medya planlayıcı
bu sitedeki sayıya güvenip müşteriye bütçe sunacak — yanlış formül kabul edilemez.
Her formülün yanında kaynağını ve varsayımlarını yaz.

---

## 3. MODÜLLER

### M1 — Terimler Sözlüğü
`/sozluk` ve `/sozluk/[slug]`

- Her terim kendi sayfasında (SEO için kritik — "SSP nedir", "VAST nedir" aramaları
  organik trafiğin ana kaynağı olacak).
- Veri kaynağı: `/content/sozluk/*.mdx`. Her dosyanın frontmatter'ı:
  ```yaml
  terim: "SSP"
  acik: "Supply Side Platform"
  kategori: ["ekosistem", "satin-alma"]
  seviye: "temel" | "orta" | "ileri"
  ilgili: ["DSP", "Ad Exchange", "Header Bidding"]
  ```
- Gövde: (1) tek cümle tanım, (2) "insan gibi anlat" paragrafı, (3) günlük işte nerede
  karşına çıkar, (4) sık yapılan karışıklık ("SSP ile Ad Exchange aynı şey değil çünkü...").
- Arama: fuse.js ile client-side fuzzy arama, Türkçe karakter normalizasyonu (ı→i, ş→s).
- Kategori + seviye filtresi. "Rastgele terim" butonu.
- Bir terim başka bir terimin açıklamasında geçiyorsa otomatik tooltip linki ver.
- **Başlangıç içeriği:** en az 150 terim ile başla, hedef 400+. İlk partide şunlar mutlaka
  olsun: DSP, SSP, Ad Exchange, Ad Server, DMP, CDP, CMP, RTB, OpenRTB, Header Bidding,
  Prebid, Waterfall, PMP, PG, Preferred Deal, Open Auction, First/Second Price Auction,
  Bid Shading, Floor Price, Deal ID, VAST, VPAID, VMAP, SIMID, MRAID, CTV, OTT, DOOH,
  Viewability, MRC standardı, IVT/GIVT/SIVT, Brand Safety, Brand Suitability, Ad Fraud,
  Domain Spoofing, ads.txt, app-ads.txt, sellers.json, SupplyChain Object, SPO, Made for
  Advertising (MFA), Cookie, Cookieless, Privacy Sandbox, Topics API, UID2, ID5, RampID,
  Consent Mode, GDPR, KVKK, Lookalike, Retargeting, Prospecting, Frequency Capping,
  Incremental Reach, Reach Curve, eCPM, CPCV, VTR, VCR, CTR, CPA, ROAS, Attribution,
  MTA, MMM, Incrementality, Lift Test, Brand Lift, MMP, Postback, S2S, Pixel, Clean Room,
  AMC, Data Clean Room, Curation, Retail Media, Commerce Media, Audio Programmatic.

### M2 — Metrik Hesapla
`/hesapla` (hub) + `/hesapla/[arac]`

Her araç ayrı sayfa (SEO), hub sayfası hepsini listeliyor. Her araçta: giriş alanları,
anlık sonuç, formülün açık hâli, "neden böyle" kutusu, ve "linki kopyala" (hesaplama
URL query string'inde saklanacak ki birine gönderilebilsin).

Araç listesi ve formüller:

| Araç | Formül |
|---|---|
| CPM | `(maliyet / impression) × 1000` |
| Impression (CPM'den) | `(bütçe / CPM) × 1000` |
| Bütçe (CPM'den) | `(impression / 1000) × CPM` |
| eCPM | `(toplam gelir veya maliyet / toplam impression) × 1000` |
| CPC | `maliyet / klik` |
| CTR | `klik / impression × 100` |
| CPV | `maliyet / izlenme` |
| CPCV | `maliyet / tamamlanan izlenme` |
| VTR / VCR | `izlenme (veya tamamlama) / impression × 100` |
| Viewability | `görülebilir impression / ölçülen impression × 100` |
| vCPM | `(maliyet / görülebilir impression) × 1000` |
| CPA | `maliyet / dönüşüm` |
| ROAS | `dönüşüm değeri / maliyet` |
| Dönüşüm oranı | `dönüşüm / klik × 100` (ve impression bazlı varyant) |
| SOV | `kendi impression / kategori toplam impression × 100` |
| Ajans/teknoloji fee düşümü | `net medya = brüt × (1 - fee%)` — zincirleme fee desteği |
| Data maliyeti etkisi | `efektif CPM = medya CPM + data CPM (+ fee)` |
| Pacing | `harcanması gereken = toplam bütçe × (geçen gün / toplam gün)` → sapma % |
| KDV'li/KDV'siz | TL tutarlarda %20 KDV çevirimi |
| Para birimi | USD/EUR → TL, kur manuel girilebilir + TCMB kuru otomatik çekilebilir |

**Ters hesaplama:** her araçta "hangi alanı bilmiyorum" seçimi olsun — kullanıcı 3 alandan
2'sini girsin, 3'üncüsü çıksın. Bu sektörde en çok ihtiyaç duyulan şey bu.

**Toplu mod:** CPM hesaplayıcıya CSV yapıştırıp satır satır hesaplama yapma seçeneği.

### M3 — Reach Tahminle
`/reach-tahmin`

İki yönlü çalışacak:
1. **Bütçeden reach'e:** bütçe + CPM + hedef kitle büyüklüğü (universe) + hedef frekans →
   impression, brüt gösterim, tahmini tekil reach, reach %.
2. **Reach'ten bütçeye:** hedeflenen tekil kişi + frekans → gereken impression ve bütçe.

Hesaplama mantığı:
```
impression        = (bütçe / CPM) × 1000
ortalama frekans  = impression / tekil reach
tekil reach       = impression / frekans            (basit yöntem)
```
Basit bölme gerçeği yansıtmaz; **reach eğrisi** modeli kur. Bağımsız maruz kalma varsayımıyla
sönümlü (diminishing returns) model:
```
reach = universe × (1 - e^(-impression / universe))      → "erişilebilir tekil kişi"
efektif reach(n+) = Poisson kuyruğu ile hesapla:
  λ = impression / universe
  P(k) = (λ^k × e^-λ) / k!
  reach(n+) = universe × (1 - Σ P(k) for k=0..n-1)
```
Bu bir **tahmin modeli**, DSP forecast'i değil. Sayfada bunu açıkça yaz ve DSP'nin kendi
forecast'inin her zaman daha doğru olduğunu belirt. Model parametrelerini (sönümleme
katsayısı, kanal bazlı frekans dağılımı düzeltmesi) admin panelden ayarlanabilir yap.

Çıktılar:
- Frekans 1+, 2+, 3+, 5+, 10+ için reach tablosu
- Bütçe → reach eğrisi grafiği (Recharts), üzerinde "doyma noktası" işareti
- "Frekans 3 yerine 6 ile gidersen X TL fazla harcayıp Y kişi daha az görürsün" tarzı
  otomatik yorum cümlesi — sitenin tonuna uygun, hafif alaycı
- Çoklu kanal senaryosu: display + video + CTV bütçe dağılımı → birleşik reach
  (çakışma oranı kullanıcıdan alınacak varsayım)
- **Türkiye universe hazır değerleri:** admin panelde tutulacak referans tablo
  (toplam internet kullanıcısı, mobil, CTV erişimi, yaş/cinsiyet kırılımı). Her değerin
  yanında kaynağı ve tarihi görünecek — TÜİK, We Are Social/Meltwater, IAB Türkiye.
  Uydurma sayı yazma: admin tablo boşken araç "universe değerini sen gir" moduna düşsün.

### M4 — Mecra & Spec Bul
`/mecra` + `/mecra/[slug]`

"Twitch'e nereden girilir, hangi spec'le?" sorusunun cevabı. Bu modül sitenin en çok
paylaşılacak kısmı olacak çünkü sektörde bu bilgi dağınık PDF'lerde duruyor.

Veri: `/content/mecra/*.mdx`. Frontmatter:
```yaml
mecra: "Twitch"
slug: "twitch"
kanal: ["ctv", "mobil", "desktop"]
tur: "canli-yayin"
dspler:
  - dsp: "Amazon DSP"
    satin_alma: ["PG", "PMP"]
    oncelik: 1
    notlar: "Türkiye envanteri PG üzerinden daha stabil"
formatlar:
  - ad: "In-stream video"
    oran: "16:9"
    sure: [15, 30]
    dosya: "MP4 / H.264"
    bitrate: "8 Mbps"
    max_boyut: "..."
    tiklanabilir: false
tahmini_cpm_bandi: { min: 350, max: 480, para: "TRY" }
min_butce: ...
olcumleme: ["IAS", "DoubleVerify"]
```

Gövde: nasıl satın alınır, dikkat edilecekler, sık yapılan hatalar, kreatif teslim süresi.

Kapsanacak mecralar (ilk parti): Twitch, YouTube (DV360), Spotify, Netflix, Disney+, Prime
Video, Exxen, blu TV, TOD, Tabii, Samsung TV Plus, LG Channels, Pluto TV, Teads, Outbrain,
Taboola, Seedtag, Hepsiburada Ad Network, Trendyol Ads, Getir Ads, Yemeksepeti, Sahibinden,
Dolap, n11, Migros, A101 (retail media), Google Ad Manager envanteri, Criteo, RTB House,
Admatic, Reklamstore, Netmera (push), Spotify Audio, Podcast envanteri, DOOH (JCDecaux,
Ströer dijital ekranlar).

Filtreler: kanal, DSP, satın alma tipi, bütçe aralığı, format. Karşılaştırma modu:
2-3 mecrayı yan yana koy.

**Kaynak gösterimi zorunlu.** Her spec kartında "son doğrulama tarihi" ve kaynak linki
(platformun resmî spec dokümanı) olacak. 6 aydan eski kayıtlar otomatik "doğrulanmalı"
etiketi alacak. Bilinmeyen alanı boş bırak — tahmini sayı yazma.

### M5 — Envanter Ara
`/envanter` + `/envanter/[domain]`

Kullanıcı `nefisyemektarifleri.com` yazacak, şunları görecek:
- **Büyüklük kovası** — "Türkiye'de ilk 10.000" + planlama kademesi, aylar arası kova
  değişimi (CrUX, §4.2a). Mutlak ziyaret sayısı yok; neden yok, §4.2'de.
- **İkinci sıralama sinyali** — Cloudflare Radar rank kovası
- Kategori (Türkçe: yemek, spor, haber, finans/döviz, teknoloji, otomotiv, sağlık,
  anne-bebek, moda, oyun, emlak, e-ticaret, eğitim, seyahat, magazin, hukuk)
- IAB Content Taxonomy eşlemesi (DSP'de hedefleme yaparken gerekiyor)
- **Programatik olarak alınabilir mi?** → `ads.txt` analizi: hangi SSP'ler, DIRECT mi
  RESELLER mı, kaç seat, `sellers.json` doğrulaması
- Alt alan adları ve kendi kovaları (alt alan adı ayrı envanter olabiliyor)
- Varsa deal/PMP bilgisi (admin tarafından girilen)
- "Bu kategoride en büyük siteler" listesi

Kategori sayfaları: `/envanter/kategori/yemek` → o kategorideki siteler hacme göre sıralı.
Bu sayfalar medya planlamada doğrudan kullanılacak, CSV export şart.

**VERİ KAYNAĞI (detay §4.2):** ads.txt crawl'ı + CrUX Türkiye kovaları + Cloudflare Radar.
Üçü de ücretsiz, üçü de lisans sorunsuz. Mimariyi **provider pattern** ile kur:
`lib/providers/*` altında her kaynak aynı arayüzü implement etsin, biri kapanınca
diğerine geçilebilsin, sonradan yeni kaynak eklenebilsin.

```ts
interface SizeProvider {
  name: string;
  getDomain(domain: string): Promise<DomainSize | null>;
  licenseLevel: 'own' | 'public' | 'display';
}
```

Cache zorunlu: her kaynak `domain_snapshots` tablosuna yazar, site her zaman Postgres'ten
okur. CrUX aylık cron ile, ads.txt günlük/haftalık cron ile, Cloudflare istek anında
(cache'te 30 günden yeni kayıt yoksa). Her sayının yanında `kaynak` ve `tarih` görünür.

**CSV export:** kategori sayfalarından CSV indirilebilir — kova, sıralama, kategori,
SSP listesi, DIRECT/RESELLER dağılımı. Üç kaynağın hepsi ücretsiz/bizim olduğu için
export'ta kısıt yok (ileride ücretli kaynak eklenirse §4.2c kuralı devreye girer).

### M6 — Hedef Kitle Çalış
`/hedef-kitle`

Akış: brief gir → DSP seç → segment kaynağını belirle → çıktıyı Excel olarak indir.

**Giriş:**
- Brief metni (serbest metin, yapıştırılabilir veya dosya yüklenebilir)
- DSP seçimi: Adform / Amazon DSP / DV360 (çoklu seçim)
- Pazar: Türkiye (varsayılan)
- Kampanya tipi: marka bilinirliği / performans / retargeting performans yayını
- Bütçe ve dönem (opsiyonel, reach tahmini için)

**ÖNEMLİ — segment kaynağı:** DSP'lerin segment taksonomileri platform verisidir, siteye
gömülü bir kopya tutmak hem güncellikten düşer hem sorunlu olur. Bunun yerine:
1. **Varsayılan yol:** kullanıcı kendi DSP'sinden segment export'unu (CSV/XLSX) yükler,
   sistem brief'e göre o listeden eşleştirme yapar. Yüklenen dosya kullanıcının
   hesabında saklanır, yeniden kullanılır.
2. **Admin kütüphanesi:** sağlayıcı bazlı (Digiseg TR, Belogic TR, Adform Audience Hub)
   kürasyonlu bir segment kütüphanesi admin panelden yönetilir, "son güncelleme" tarihi
   görünür.
3. Hiçbiri yoksa sistem segment adı uydurmaz — "segment listesi yükle" der ve sadece
   keyword listesi + hedefleme stratejisi üretir.

**Çıktı formatı — bunlar sabit kural, uyulacak:**

*Keyword listesi:*
- Excel, **tek kolon**, her hücrede bir keyword, dikey sıralı
- Gruplama veya açıklama açıkça istenmedikçe sadece Excel dosyası, başka hiçbir şey yok

*3P hedef kitle çalışması:*
- **Tek Excel dosyası, iki sheet**: `Adform` ve `Amazon`
- Gruplar renk kodlu (exceljs ile hücre dolgusu)
- Kolonlar, bu sırayla:
  `Grup | Kitle Adı | Sağlayıcı/Kategori | CPM-Fee (TL) | UID/Reach | Audience Id (yalnız Amazon sheet'inde) | Seçim Nedeni`
- `Seçim Nedeni` **son kolon** ve **tek cümle** olacak
- Sayfanın en altına not satırı: OR/AND mantığının nasıl kurulacağı + ortalama data maliyeti

*Sağlayıcı öncelik sırası (Adform):* Digiseg TR → Belogic TR → Adform Audience Hub.
Hedef CPM bandı **8-15 TL**. Brief'e çok yüksek alakası olan segmentler bu bandın
üstünde de eklenebilir, ama gerekçesi `Seçim Nedeni`'nde belirtilir.

*Amazon DSP kuralları:* Türkçe etiketli in-market segmentler Türkiye'ye özgü kabul edilir
ve önceliklidir. In-market segmentler hem İngilizce hem Türkçe adlarla derinlemesine
taranır — önemli segment atlanmaz.

*"Retargeting performans yayını" işaretliyse* çıktı ayrıca prospecting/retargeting ayrımı
içerecek:
- Retargeting = mevcut 1P kitleler (app event'leri + site pixel kitleleri)
- Prospecting = 3P hedefleme + bu 1P kitlelerin exclusion'ı

**Uygulama notu:** LLM çağrısı server-side, çıktı **zod şeması ile doğrulanacak**. Model
serbest metin döndürmeyecek, yapılandırılmış JSON döndürecek, Excel o JSON'dan üretilecek.
Şema doğrulamadan geçmezse tekrar denenecek — bozuk Excel kullanıcıya gitmeyecek.

### M7 — Rapor Yorumla
`/rapor`

Akış: rapor yükle → kolon eşleştir → analiz → PDF indir.

1. **Yükleme:** XLSX / CSV. Adform, Amazon DSP, DV360, CM360 için hazır şablon tanıma
   (kolon başlıklarından otomatik tespit). Tanınmazsa manuel kolon eşleştirme ekranı.
2. **Normalizasyon:** tarih, impression, klik, harcama, görülebilir impression, video
   tamamlama, dönüşüm, frekans, tekil reach alanlarını standart şemaya çevir.
   - **Adform sayı düzeltmesi:** Adform export'unda bozuk gelen para sütunları
     `10^15`'e bölünerek düzeltilir (örn. `₺4.718.371.200.958.550` → `4,72 TL`).
     Bu kuralı otomatik tespit edip uygula, kullanıcıya "düzeltme uygulandı" bildir.
3. **Hesaplama katmanı (deterministik, LLM'siz):** tüm metrikler `lib/calc` ile hesaplanır.
   CPM, CTR, viewability, vCPM, VTR, CPCV, CPA, pacing sapması, gün/hafta trendi, en iyi
   ve en kötü performans gösteren satır (placement/mecra/kreatif/kitle kırılımında),
   frekans dağılımı, bütçe tükenme projeksiyonu.
4. **Yorum katmanı (LLM):** hesaplanan metrikler + benchmark tablosu modele verilir,
   model **sadece yorum yazar, sayı üretmez**. Prompt'ta açıkça: "verilen sayıların dışına
   çıkma, yeni sayı türetme". Yorum başlıkları:
   - Özet (3 madde, en kritik bulgu başta)
   - Neyi iyi yapıyoruz
   - Nerede para kaçıyor
   - Benchmark karşılaştırması (hangi metrik sektör ortalamasının altında/üstünde)
   - Önümüzdeki hafta için 3 aksiyon maddesi
   - "Patron bunu soracak" bölümü — raporda gözüne çarpacak şeylerin önden cevabı
5. **PDF:** @react-pdf/renderer ile tek dosya. Kapak (kampanya adı, dönem, hazırlayan),
   metrik özet tablosu, 2-3 grafik, yorum bölümleri. Site temasının tipografisini kullan.
   Türkçe font embed'i unutma.

**GİZLİLİK — bu kısmı atlamayın:** Yüklenen raporlar müşteri verisidir.
- Dosyalar varsayılan olarak **diske yazılmaz**, bellekte işlenir, istek bitince silinir.
- Kullanıcı açıkça "kaydet" demedikçe hiçbir rapor saklanmaz.
- Yükleme ekranında net bir bilgilendirme: verinin nereye gittiği, LLM'e ne gönderildiği,
  ne kadar tutulduğu.
- Loglara satır verisi yazma — sadece satır sayısı ve kolon adları.
- KVKK uyumu için aydınlatma metni ve gizlilik politikası sayfası şart.

---

## 4. VERİ KAYNAKLARI — GERÇEKÇİ DURUM

Bu bölüm kritik. İki istek (canlı CPM ve site hacimleri) "bir API'ye bağlan bitsin"
şeklinde çözülemiyor. Aşağıdaki katmanlı yapıyı kur.

### 4.1 CPM verisi

**Net gerçek: herkese açık, ücretsiz, canlı, Türkiye kırılımlı bir CPM API'si yok.**
Döviz kuru gibi tek bir yayından akan bir veri değil bu — CPM her DSP'de, her envanterde,
her hedeflemede farklı. "Borsa tabelası" görünümü yapılabilir, ama arkasını biz besleyeceğiz.

**KARAR:** Public benchmark + Türkiye düzeltme katsayısı (Katman A) ile başlıyoruz.
Tutarlılık yeterli değilse anonim topluluk girdilerine (Katman B) geçeceğiz.

**Kendi/ajans DSP verisi bu projede hiç kullanılmıyor** — §0'daki mutlak kural gereği,
kalibrasyon amacıyla bile. Bu bilinçli bir karar ve bir bedeli var: elimizde sayıları
doğrulayacak sert bir çapa yok. Bedelini şöyle ödüyoruz — tek sayı değil **geniş bant**
yayınlıyoruz, her değeri "tahmin" olarak etiketliyoruz, ve güvenmediğimiz hücreyi
boş bırakıyoruz. Doğru çapa topluluk verisi birikince gelecek.

İki katman:

**[KALDIRILDI] Kendi/ajans DSP verisi.**
Bu katman projeden çıkarıldı. Adform/Amazon DSP hesaplarından, ajans BigQuery projesinden
veya herhangi bir müşteri raporundan **hiçbir veri bu platforma girmeyecek.** Ne public
sayfaya, ne admin paneline, ne veritabanına, ne de geçici bir hesaplama formuna.
Bu kodda da zorlanacak: `cpm_benchmarks.kaynak` alanı yalnızca `public_benchmark`,
`topluluk` veya `editoryel_tahmin` değerlerini kabul eden bir CHECK constraint taşıyacak.

**Katman B — Topluluk verisi (uzun vadede asıl kaynak).**
Kullanıcılar kendi gördükleri CPM'i anonim olarak girer: format, DSP, mecra, satın alma
tipi, ay, hedefleme tipi, CPM. Site medyan + P25/P75 yayınlar. Bir hücrede minimum 5 kayıt
olmadan gösterme. Spam/uç değer filtresi (IQR dışı değerleri işaretle). Katkı veren
kullanıcıya detaylı kırılım erişimi ver — bu, veri toplamanın motoru olur.
**Sektör sitesi için asıl değer burada.** Türkiye'de kimsenin yapmadığı şey bu.

**Katman A — Public benchmark (admin girişi). ◀ P0'DA AKTİF OLAN KATMAN BU.**
Aylık olarak elle veya yarı otomatik girilen referans tablo. Kullanılabilir kaynaklar:
- Burt Intelligence aylık "Open Auction Benchmarks" (display/video CPM, MoM/YoY değişim)
- Statista / Guttmann programatik veri seti (format bazlı CPM)
- Basis Technologies DSP benchmark'ları
- IAB Türkiye dijital reklam yatırım raporları (TL bazlı, Türkiye'ye özel)
- Google Ad Manager / Admatic / yerel SSP'lerin yayınladığı raporlar
Bunlar çoğunlukla **ABD/global ve USD bazlı**. Aşağıdaki üç kural bu katmanın işe yarayıp
yaramamasını belirliyor, hiçbirini atlama:

**Kural 1 — Para birimini kaynağında sakla, gösterirken çevir.**
`cpm_benchmarks` tablosuna değeri **kaynak para biriminde** (çoğunlukla USD) yaz. Ayrı
kolonlarda: `kur_degeri`, `kur_tarihi`, `kur_kaynagi` (TCMB efektif satış). TL değeri
hiçbir zaman tabloda saklanmayacak, gösterim anında hesaplanacak.

Sebebi şu: TL bazında bir CPM değişimi gördüğünde bunun gerçek CPM artışı mı yoksa sadece
kur hareketi mi olduğunu ayırt edemezsen tablo yanıltıcı olur. Türkiye'de kur oynaklığı
çoğu dönemde gerçek CPM sinyalinden büyük. Bu yüzden arayüzde **iki ayrı değişim** göster:
```
CTV   ₺415,00   TL bazında ▲ %5,6   ·   USD bazında ▲ %0,4
                (kur: 1 USD = 00,00 TL · TCMB · 18.11.2026)
```
Ticker'da yer yoksa TL değişimini göster, hover'da/detayda USD değişimini ver. Ama ikisi
de veride olacak.

**Kural 2 — Düzeltme katsayısı editöryel bir tahmindir, öyle etiketlenecek.**
ABD benchmark'ını Türkiye'ye çeviren katsayının arkasında public bir veri yok. Bu yüzden:
- Katsayı admin panelden girilir ve yanında **zorunlu bir `metot_notu` alanı** vardır:
  bu katsayıya neye dayanarak karar verildiği 2-3 cümleyle yazılır.
- Sitede her CPM değerinin detayında bu not görünür. Kaynak satırı şöyle okunur:
  `Kaynak: [benchmark adı], [dönem] · Türkiye düzeltmesi: ×0,00 (editöryel tahmin) · Metot: ...`
- Katsayıyı **kendi DSP verinden hesaplayıp yayınlamıyoruz.** Müşteri verisinden türetilmiş
  bir sayı, agregat olsa da public bir figür hâline gelir. Katsayı; IAB Türkiye yatırım
  raporları, yayıncı rate card'ları, yerel SSP'lerin açıkladığı rakamlar ve sektör
  tecrübesine dayanan açıkça etiketlenmiş bir tahmin olacak.
- Arayüzde hiçbir yerde "gerçek zamanlı" veya "canlı CPM" ifadesi kullanma. Doğru ifade:
  **"tahmini CPM bandı"** ve **"son güncelleme: [tarih]"**.

**Kural 3 — Az ama güvendiğin formatla başla.**
P0'da 20 format yayınlamaya çalışma. Dört-beş hücre yeter: **banner (display), in-stream
video, CTV, native**. Her birinde tek sayı değil **bant** göster (min-max veya P25-P75).
Güvenmediğin hücreyi boş bırak, "veri yok" yaz. Boş hücre, yanlış sayıdan iyidir ve
sektörde sitenin itibarını belirleyecek olan tam olarak bu.

**Katman B'ye geçiş tetiği — şimdiden kurala bağla, sonra karar verme:**
Bir hücre (format × kanal × satın alma tipi) için son 90 günde **en az 8 girdi** ve
**en az 5 farklı kullanıcı** birikmişse, o hücrede topluluk medyanı birincil değer olur,
benchmark ikincil referansa düşer. Arayüzde ikisi birlikte görünür:
```
BANNER   ₺00,00   topluluk medyanı · 12 girdi · 7 katkıcı
         ₺00,00   benchmark tahmini (karşılaştırma)
```
Bu eşik `cpm_settings` tablosunda tutulacak, admin panelden ayarlanabilir olacak.

### 4.1b Tutarlılık kontrolü (şirket verisi kullanmadan)

Tahminin tutup tutmadığını üç public sinyalle ölçeceğiz. `/admin/tutarlilik` sayfası
bunları yan yana gösterir:

1. **Kaynaklar arası tutarlılık** — aynı format için iki ayrı public benchmark'ı
   (örn. Burt + Statista) Türkiye katsayısından geçirip karşılaştır. Aralarındaki sapma
   %40'ı aşıyorsa o hücre yayına uygun değil, "veri yok"a düşür.
2. **Topluluk sapması** — girdi birikmeye başlayınca, topluluk medyanı ile benchmark
   tahmini arasındaki farkı izle. Sistematik ve tek yönlü bir sapma varsa düzeltme
   katsayısı yanlış demektir; katsayıyı o yöne çek ve `metot_notu`'nu güncelle.
3. **Zaman içi mantık kontrolü** — sezon katsayısı uygulandıktan sonra çıkan eğri
   beklenen davranışı gösteriyor mu (kasım yükseliyor, temmuz-ağustos düşüyor).
   Göstermiyorsa katsayı tablosu hatalı.

Bu sayfa sadece platformun kendi verisini okur. Dışarıdan hiçbir girdi almaz, hiçbir
input alanı yoktur.

### 4.2 Site trafik verisi

| Kaynak | Ne verir | Maliyet | Gösterim hakkı | Durum |
|---|---|---|---|---|
| **ads.txt / sellers.json crawl** | Site programatik satıyor mu, hangi SSP, DIRECT/RESELLER, seat ID | Ücretsiz | Tamamen bizim | ✅ P2 çekirdek |
| **Chrome UX Report (CrUX) / BigQuery** | **Türkiye'ye özel** popülerlik sıralaması (top 1K / 10K / 100K / 1M kovaları), origin bazında, aylık | Ücretsiz (BigQuery free tier) | Google'ın public dataset'i | ✅ P2 çekirdek |
| **Cloudflare Radar API** | Domain rank, rank trendi, kategori. Top 100 dışı için kova | Ücretsiz (CF API token) | Public | ✅ P2 çekirdek |
| **Similarweb DigitalRank API** | Global ranking | Ücretsiz | Public | ✅ Ekle |
| **DataForSEO Labs / Domain Analytics** | Organik arama kaynaklı trafik tahmini, domain metrikleri | Kullandıkça öde, $50 min bakiye. Labs: $0,012/task + $0,00012/item; bulk ~$0,025/1000 | Ürün içinde gösterim serbest, ham feed/dump yasak (§4.2c) | ⏸ **Şimdilik kapsam dışı.** İhtiyaç görülürse sonra eklenir (§4.2d) |
| **Semrush API + .Trends** | Similarweb tarzı toplam ziyaret, trafik kaynakları | API Advanced/Business planı $500-549/ay + ayrıca satılan unit'ler, .Trends eklentisi +$200/ay | Plana bağlı, kontrol gerekir | ❌ Aylık $700+, yan proje için uygun değil |
| **Similarweb resmî API** | Toplam ziyaret, trafik kaynakları, demografi | Teklif bazlı/kurumsal; self-serve planlarda API yok | Redistribution ayrı sözleşme | ❌ Uygun değil |
| **Apify Similarweb scraper'ları** | Tahmini aylık ziyaret | ~$0,005/domain | Scraper — kaynağın ToS'u ihlal ediliyor | ❌ **KULLANMA.** Temiz olmadığı için projeden çıkarıldı |
| **Gemius (IAB Türkiye resmî ölçümleme)** | Türkiye için otorite tekil kullanıcı verisi | Ücretli abonelik | Abonenin kendi iş kullanımına lisanslı, yeniden yayın yok | ❌ Platform kullanmıyor. Yalnızca §4.2b kullanıcı akışı |
| **Google Ad Manager / SSP raporları** | Gerçek envanter hacmi | — | Yayıncıya ait | ❌ Platform kullanmıyor |

**KARAR — ücretsiz üçlü ile gidiyoruz. Ücretli trafik verisi almıyoruz.**

Üçü birlikte "bu siteye programatik girebilir miyim ve ne kadar büyük" sorusunu yeterince
cevaplıyor. Üçü de §0'ın ilk iki kategorisinde (bize ait / ücretsiz ve açık), yani lisans
sorunu yok.

1. **ads.txt + sellers.json crawl** — tamamen bizim. Sitenin programatik satıp satmadığı,
   hangi SSP'lerden, DIRECT mi RESELLER mı, seat ID'leri. Bu kısım platformun özgün değeri;
   Türkiye'de tek yerde toplanmış hâli yok.
2. **CrUX / BigQuery** — Türkiye'ye özel büyüklük sıralaması. Ana hacim sinyali bu (§4.2a).
3. **Cloudflare Radar** — ikinci bağımsız sıralama sinyali. CrUX'u doğrulamak ve CrUX'ta
   olmayan domain'leri yakalamak için.

**Mutlak ziyaret sayısı (aylık/günlük tekil) yayınlamıyoruz.** Elimizdeki ücretsiz
kaynaklar kova ve sıralama veriyor, mutlak sayı vermiyor. Uydurmak yerine olmadığını
söylüyoruz — arayüz "büyüklük kovası" ve "sıralama" üzerine kurulu olacak, mutlak sayı
alanı hiç bulunmayacak. Bir medya planlayıcı için "Türkiye'de ilk 10 binde, kategorisinde
7. sırada, 4 SSP'de açık envanteri var" bilgisi zaten "aylık 2,3M ziyaret (tahmini)"
bilgisinden daha işe yarar ve daha dürüst.

### 4.2a CrUX entegrasyonu — ana hacim sinyali

Sorgu kaynağı: `chrome-ux-report.country_tr.YYYYMM` tablosunda
`experimental.popularity.rank` alanı. Değerler mertebe kovası olarak gelir: 1000, 10000,
100000, 1000000.

```sql
SELECT
  origin,
  experimental.popularity.rank AS rank_bucket
FROM `chrome-ux-report.country_tr.202610`
WHERE experimental.popularity.rank <= 1000000
GROUP BY origin, rank_bucket
```

**Mimari — her istekte BigQuery'ye gitme.** Ayda bir cron:
1. O ayın `country_tr` tablosunu sorgula, Türkiye'de top 1M içindeki origin'leri çek.
2. `domain_snapshots` tablosuna yaz (`kaynak = 'crux'`, `rank_bucket`, `yyyymm`).
3. Site her zaman Postgres'ten okur. BigQuery sadece aylık ingest için kullanılır —
   free tier'da rahat kalırsın.

CrUX verisi **takip eden ayın ikinci Salı günü** yayınlanır. Cron'u ayın 15'ine kur,
tablo yoksa bir hafta sonra tekrar dene, yoksa önceki ayın verisiyle devam et ve
`yyyymm` alanında hangi ayın verisi olduğunu göster.

**Dikkat edilecek üç şey:**

1. **CrUX origin bazlı, domain bazlı değil.** `https://www.ornek.com` ve
   `https://ornek.com` iki ayrı origin olarak gelir, `http://` ayrı bir üçüncüsü olabilir.
   Bir domain'in gerçek büyüklüğünü görmek için origin'leri **normalize edip birleştir**:
   şemayı at, `www.` prefix'ini at, eTLD+1'e indir, çıkan kovaların **en iyisini** (en
   küçük sayıyı) o domain'in kovası kabul et. Alt alan adlarını (`spor.ornek.com`)
   ayrı tut ama domain sayfasında birlikte listele — medya planlamada alt alan adı
   ayrı envanter olabiliyor.
2. **Kapsama sınırı.** CrUX'ta yalnızca yeterli Chrome trafiği olan origin'ler var.
   Küçük siteler hiç görünmez. "CrUX'ta yok" ≠ "trafiği yok" — arayüzde bunu
   "CrUX kapsamında değil (Türkiye'de ilk 1M dışında)" diye yaz, boş bırakma.
3. **Chrome-only ve navigasyon bazlı.** Safari/iOS ağırlıklı kitlesi olan siteler
   görece düşük görünebilir. Sayfada bir satır açıklama bulunsun.

**Kullanıcıya nasıl gösterilecek:** kova sayısını ham hâlde göstermek anlamsız. Türkçe
etikete çevir ve yanına planlama için kullanılabilir bir kademe koy:

| CrUX kovası | Arayüz etiketi | Planlama kademesi |
|---|---|---|
| 1.000 | Türkiye'de ilk 1.000 | Çok büyük — ana mecra |
| 10.000 | Türkiye'de ilk 10.000 | Büyük — planın gövdesi |
| 100.000 | Türkiye'de ilk 100.000 | Orta — niş/destek |
| 1.000.000 | Türkiye'de ilk 1.000.000 | Küçük — uzun kuyruk |
| (yok) | CrUX kapsamında değil | Ölçülemiyor |

Domain sayfasında üç sinyal yan yana:
```
ornek.com
Büyüklük    Türkiye'de ilk 10.000  ·  CrUX, Ekim 2026
Sıralama    Cloudflare: top 100K kovası
Envanter    4 SSP · 2 DIRECT, 2 RESELLER  ·  ads.txt, 18.11.2026
Kategori    Yemek  (IAB: Food & Drink)
```

Kategori sayfalarında sıralama CrUX kovası + Cloudflare rank bileşimiyle yapılır;
aynı kovadaki siteler kategori içi alfabetik sıralanır (yapay bir kesinlik üretmemek için).

### 4.2b Kullanıcı kendi lisanslı verisini getirir (opsiyonel özellik, P2 sonu)

Platform lisanslı ölçümleme verisinin **yayıncısı değil, işleyicisi** olur. Bu, kendi
Gemius/Similarweb aboneliği olan ajanslar için gerçek bir ihtiyaç: veriye erişimleri var,
dertleri onu hızlı kullanılabilir hâle getirmek.

- Platformda **hiçbir lisanslı üçüncü taraf verisi saklanmaz.** Veritabanında böyle bir
  satır olmaz.
- Kullanıcı kendi export'unu (CSV/XLSX) yükler. Dosya **bellekte** işlenir, o oturumda
  araçları besler, istek bitince silinir (§M7 gizlilik kuralları aynen geçerli).
- Kullanıcı o oturumda kendi hacimlerini sitedeki kategori ve ads.txt verisiyle
  birleştirip medya planı tablosu çıkarabilir, indirebilir.
- Yükleme ekranında net uyarı: "Yüklediğiniz veri saklanmaz ve başka kullanıcılara
  gösterilmez. Lisanslı veriyi yükleme yetkiniz olduğundan emin olun."
- Public domain sayfalarında bu veri **asla** görünmez. Orada sadece ads.txt + CrUX +
  Cloudflare Radar (+ varsa DataForSEO) olur.

**§0 kuralı burada da geçerli:** proje sahibi bu özelliği ajansının lisanslı verisiyle
kullanmaz. Özellik diğer kullanıcılar için var.

### 4.2c Lisans seviyeleri — bir API satın almak yayınlama hakkı vermez

Şu an ücretli veri kullanmıyoruz, ama ileride bir kaynak eklenirse bakılacak şey fiyat
değil, **hangi kullanım hakkının verildiği.** Bu bölüm o karar için duruyor. Üç seviye var
ve sözleşmeler bunları ayırır:

| Seviye | Ne demek | Bizim için |
|---|---|---|
| **Internal use** | Veriyi sadece kendi içinde kullanabilirsin | ❌ Yetmez, site public |
| **Display / embedded** | Veriyi işleyip kendi ürününün arayüzünde kullanıcılarına gösterebilirsin | ✅ İhtiyacımız olan bu |
| **Redistribution / resale** | Ham veriyi feed, dump veya API olarak başkasına geçebilirsin | Gerekmiyor, pahalı |

DataForSEO'nun standart şartları **display seviyesinde**: API çıktısını analiz, rapor,
dashboard veya skora dönüştürüp kendi ürününde kullanıcılarına göstermek kısıtlanmamış,
kullanıcı sayısı sınırı yok, ürünün ücretli/ücretsiz olması fark etmiyor ve atıf/branding
zorunluluğu getirilmemiş. Ama **resale, sublicense veya redistribution hakkı verilmiyor** —
veriyi işlenmemiş bir feed, veritabanı dump'ı, public endpoint veya ham API servisi olarak
dışarıya geçmek ayrı yazılı anlaşma gerektiriyor.

**Mimariye somut etkileri:**
1. `/envanter/[domain]` ve kategori sayfalarında işlenmiş veriyi göstermek sorun değil.
2. **CSV export'a dikkat.** Kategori sayfalarındaki "CSV indir" özelliği, sağlayıcının
   sayılarını ham hâlde dışarı veren bir dump'a dönüşmemeli. Export'ta şunlar olur:
   bizim crawl verimiz (ads.txt/SSP listesi), bizim kategorizasyonumuz, bizim hesapladığımız
   türetilmiş kolonlar, ve kova/sıralama bilgisi. Sağlayıcıdan gelen ham sayıyı toplu
   indirmeye açma — tek domain sayfasında göster, bulk export'ta türetilmiş hâlini ver.
3. Sözleşme değişir. **Entegrasyonu yazmadan önce o anın şartlarını oku**, ve şartları
   okuduğun tarihi `/lib/providers/<ad>.ts` dosyasının başına yorum olarak yaz.

Her provider dosyası şu yorum bloğuyla başlayacak:
```ts
/**
 * Kaynak: Chrome UX Report (CrUX) — chrome-ux-report.country_tr.*
 * Lisans seviyesi: public dataset (Google BigQuery public data)
 * Şartların okunduğu tarih: YYYY-MM-DD
 * Public sayfada gösterilebilir: evet
 * Bulk CSV export'a dahil: evet
 */
```

**Kategorizasyon:** Cloudflare Radar kategorileri + IAB Content Taxonomy eşlemesi temel
alınır, üzerine kendi Türkçe kategorilerimizi yaz. İlk sınıflandırmayı LLM yapar
(domain + ana sayfa `<title>`/meta açıklama ile), admin panelde düzeltilir. Admin
düzeltmesi LLM çıktısını her zaman ezer, `category_source` alanında hangisi olduğu tutulur.

**Crawl etiği:** ads.txt çekerken `User-Agent` içinde site adı ve iletişim URL'i olsun,
`robots.txt`'e uy, domain başına günde bir istekten fazlasını yapma, rate limit koy.
Bu bir ajans aracı — yayıncıları rahatsız eden bir bot olarak tanınmak istemiyoruz.

### 4.2d Sonra eklenebilecek ücretli katman (şimdi yapılmayacak)

İhtiyaç görülürse **DataForSEO** eklenebilir — kullandıkça öde, abonelik yok, bakiye
süresiz, bulk endpoint'lerle binlerce domain ayda birkaç dolar, ve standart şartları
ürün içinde gösterime izin veriyor (§4.2c). Ama trafik tahmini **organik arama kaynaklı**;
Türkiye'nin büyük haber ve e-ticaret sitelerinde direct/uygulama trafiği yüksek olduğu
için bu siteleri ciddi şekilde düşük gösterir. Eklenirse sayı "aylık ziyaret" değil
**"organik arama kaynaklı tahmini trafik"** olarak etiketlenir ve CrUX kovası birincil
sinyal olarak kalır.

**Şimdi yapılmayacak. P2'de bunun için kod yazma, provider dosyası oluşturma, `.env`'e
alan ekleme.** Bu bölüm sadece ileride karar verilirse diye duruyor.

### 4.3 Veri modeli (ana tablolar)

```
terms                  (slug, terim, acik, kategori[], seviye, govde_mdx, ilgili[])
channels               (slug, ad, tur, kanal[], aktif)
channel_specs          (channel_id, dsp, satin_alma[], format, oran, sure[], dosya,
                        bitrate, tiklanabilir, cpm_min, cpm_max, kaynak_url,
                        son_dogrulama)
cpm_benchmarks         (format, kanal, dsp, satin_alma, deger_tl, p25, p75,
                        ornek_sayisi, katman, kaynak, donem, created_at)
cpm_seasonality        (ay, ozel_donem, format, katsayi, kaynak, not)
cpm_submissions        (user_id, format, dsp, mecra, satin_alma, hedefleme, ay,
                        cpm_tl, onaylandi, ip_hash)
domains                (domain, kategori, iab_kategori, kategori_kaynagi, ilk_gorulme)
domain_snapshots       (domain, origin, yyyymm, tarih, rank_bucket, rank, kaynak,
                        kapsam_disi bool)   -- mutlak ziyaret kolonu YOK, §4.2
domain_origins         (domain, origin, rank_bucket, alt_alan_adi bool)
domain_adstxt          (domain, ssp, seller_id, iliski (DIRECT/RESELLER),
                        tag_id, sellers_json_dogrulandi, cekilme_tarihi)
universe_refs          (hedef_kitle_tanimi, buyukluk, kaynak, tarih)
audience_libraries     (user_id | null, dsp, saglayici, segment_adi, kategori,
                        cpm_tl, reach, audience_id, kaynak, yuklenme_tarihi)
calc_presets           (user_id, arac, girdiler_json, ad)
reports                (user_id, ad, donem, metrikler_json, olusturma)   -- opsiyonel kayıt
```

Her veri tablosunda `kaynak` ve `tarih` alanı **zorunlu**. Kaynağı olmayan sayı siteye
girmiyor. Bu kuralı DB seviyesinde NOT NULL ile zorla.

---

## 5. YAPIM SIRASI

Her fazı bitirince dur, bana göster, onay al, sonra devam et. Hepsini tek seferde yazma.

**P0 — İskelet + içerik temeli**
- Next.js + TS + Tailwind + Drizzle + Supabase kurulumu, Bid Terminal tema tokenları
- Nav ve route'lar §1b tablosundaki adlarla birebir
- Layout: header, nav, footer, CPM ticker bileşeni (başta admin tablosundan, veri yoksa
  "veri bekleniyor")
- Sözlük: 150 terim ile çalışan arama + terim sayfaları
- Metrik Hesapla: CPM, eCPM, CTR, CPC, CPV, CPCV, VTR, viewability, vCPM, CPA, pacing
- `lib/calc` + Vitest testleri
- Admin paneli iskeleti (CPM tabloları, sezon katsayıları, sözlük)
- SEO temeli: metadata, sitemap, OG görselleri, structured data (DefinedTerm)

**P1 — Reach Tahminle + Mecra & Spec Bul**
- Reach eğrisi modeli + Poisson frekans dağılımı + grafikler
- Universe referans tablosu ve admin yönetimi
- Mecra & Spec: 20 mecra ile başla, filtre + karşılaştırma
- Hero komut çubuğu gerçekten çalışsın (`/cpm`, `/reach`, `/sozluk <terim>`)

**P2 — Envanter Ara**
- ads.txt / sellers.json crawler + parser + cron
- CrUX provider: ayrı/kişisel GCP projesi + aylık ingest cron'u (§4.2a)
- Origin → domain normalizasyonu ve kova birleştirme (§4.2a, madde 1)
- Cloudflare Radar provider
- Domain sayfası, kategori sayfaları, CSV export (§4.2c kuralına uygun)
- "Kendi lisanslı verini getir" yükleme ekranı (§4.2b — sunucuda saklama yok)

**P3 — Hedef Kitle Çalış**
- Brief girişi, segment kütüphanesi yükleme, zod şemalı LLM çıktısı
- exceljs ile renk kodlu iki sheet'li Excel üretimi (§M6 kurallarına harfiyen uy)

**P4 — Rapor Yorumla**
- Yükleme + kolon eşleştirme + DSP şablon tanıma + Adform 10^15 düzeltmesi
- Deterministik metrik hesaplama katmanı
- LLM yorum katmanı (sayı üretmeyen prompt)
- PDF üretimi, Türkçe font embed

**P5 — Topluluk + büyüme**
- CPM katkı formu, moderasyon, agregasyon
- Kullanıcı hesapları, kaydedilen hesaplamalar, favoriler
- AdSense yerleşimi
- Sosyal medya (Meta/TikTok) kanalı için veri modeli genişletmesi

---

## 6. UYMAN GEREKEN KURALLAR

1. **Sayı uydurma.** Benchmark, CPM, trafik, reach — hiçbir sayıyı modelden üretme.
   Veri yoksa arayüz "veri yok / sen gir" der. Her gösterilen sayının yanında kaynağı
   ve tarihi olacak. Seed dosyalarına örnek veri koyacaksan dosya adında `ornek_` prefix'i
   ve kayıtta `kaynak: "ORNEK VERI"` olacak ki prod'a kaçmasın.
2. **Hesaplamalar test edilecek.** `lib/calc` altındaki her fonksiyonun unit testi olacak.
   Test yoksa o araç yayına çıkmaz.
3. **API key'ler server-side.** Anthropic, Cloudflare, GCP servis hesabı, Supabase service key —
   hiçbiri client bundle'a girmeyecek. `.env.example` dosyası hazırla, gerçek `.env`
   git'e girmesin.
4. **Müşteri verisi kalıcı tutulmaz.** Yüklenen raporlar ve segment listeleri için
   §M7'deki gizlilik kuralları geçerli.
5. **Türkçe doğru olacak.** Arayüz metinlerinde Türkçe karakterler, doğru çekim ekleri,
   doğru sayı formatı (binlik `.`, ondalık `,` — `₺1.234,56`). `Intl.NumberFormat('tr-TR')`
   kullan, elle formatlama yapma.
6. **Mobilde çalışacak.** Her hesaplama aracı 375px genişlikte kullanılabilir olacak.
7. **Tek seferde her şeyi yazma.** Faz faz git, her fazda çalışan bir şey teslim et.
8. Kendi sitemize de `ads.txt` koy — AdSense için gerekecek ve sektör sitesinin ads.txt'i
   olmaması komik olur.
9. **§0'daki mutlak kural her şeyin üstünde.** Ajansın lisansı, aboneliği, API anahtarı,
   BigQuery projesi, müşteri verisi veya dahili dokümanı bu platforma hiçbir biçimde
   girmez — kalibrasyon, doğrulama veya "saklamıyoruz" gerekçesiyle bile. Bu projeye ait
   her şey kişisel hesaplarla kurulur: kendi GCP projesi, kendi API anahtarları, kendi
   kredi kartı.
10. **Her veri kaynağının gösterim hakkı doğrulanmış olacak.** `lib/providers/*` altındaki
   her dosya §4.2c'deki lisans yorum bloğuyla başlayacak. Bloğu olmayan provider
   production'a çıkmaz.
11. **Bulk export'ta sağlayıcının ham sayısı olmaz** (§4.2c) — sadece bizim crawl verimiz,
   kategorizasyonumuz ve türetilmiş kolonlarımız.
12. **Lisanslı üçüncü taraf verisi sunucuda tutulmaz.** Kullanıcı kendi verisini kendi
   oturumunda kullanır (§4.2b), veritabanına yazılmaz.

---

## 7. İLK ADIM

Projeyi kur, P0'ı yap. Başlamadan önce bana şunları sor:
- Supabase projesi var mı, yoksa kurulum adımlarını yazayım mı
- Domain ne olacak (deploy ayarı için)
- Sözlük ilk partisini (150 terim) sen mi yazayım, ben mi içerik vereyim
- Bu proje için ayrı/kişisel GCP projesi açıldı mı (CrUX sorguları için gerekecek)
- CrUX ingest'ini P0'da mı kuralım yoksa P2'ye mi bırakalım

Sonra `README.md` ve `.env.example` ile başla.
