# PRGTURK — Programatik Masası

Türkiye'deki programatik reklam ve dijital medya çalışanları için tek yerde: sözlük, metrik
hesaplayıcılar, reach tahmini, mecra & spec rehberi, envanter arama, hedef kitle çalışması,
rapor yorumu ve topluluk CPM'i.

> Frekans 14'e çıkmış. Kullanıcı artık seni rüyasında görüyor.

Tam ürün tanımı: [`PRG_PROJE_SPEC.md`](./PRG_PROJE_SPEC.md). Bu README kurulumu, mimariyi ve
**yayına çıkmadan önce yapılması gerekenleri** anlatır.

## ⛔ Mutlak kural

Bu kişisel bir projedir. Hiçbir ajans/işveren verisi, lisansı, API anahtarı, BigQuery projesi,
müşteri adı, kampanya bilgisi, rate card'ı veya CPM'i bu repoya, veritabanına veya
arayüze girmez — kalibrasyon ya da "sadece bakacağım" gerekçesiyle bile.
Platformdaki her sayı üç kategoriden birinden gelir: **bize ait**, **ücretsiz ve açık**,
**platformun kendi adına gösterim hakkıyla aldığı**. `kaynak` alanı DB seviyesinde zorunludur.

## Durum (fazlar)

| Faz | Kapsam | Durum |
|---|---|---|
| P0 | İskelet, Bid Terminal tema, nav, CPM ticker, sözlük (164 terim), Metrik Hesapla (11 araç), admin iskeleti, SEO | ✅ |
| P1 | Reach Tahminle (Poisson/NBD, eğri, doyma, çoklu kanal), universe tablosu, Mecra & Spec (20 kayıt), komut çubuğu | ✅ |
| P2 | Envanter Ara: ads.txt/sellers.json crawler, CrUX & Cloudflare provider'ları (lisans onayına kadar kapalı), kategori sayfaları, CSV, "kendi verini getir" | ✅ |
| P3 | Hedef Kitle Çalış: segment listesinden seçim, zod şemalı LLM, Adform/Amazon Excel'i, keyword Excel'i | ✅ |
| P4 | Rapor Yorumla: tarayıcıda deterministik metrikler, Adform 10^15 düzeltmesi, sayı uydurmayan yorum, Türkçe PDF | ✅ |
| P5 | Topluluk CPM'i + moderasyon, hesaplar (magic link), kayıtlı hesaplamalar, favoriler, AdSense/GA (rızaya bağlı), sosyal kanal veri modeli | ✅ |

## ☀️ Yayına çıkmadan önce yapılacaklar

Bunlar bilinçli olarak açık bırakıldı; kod tarafı hazır, karar/veri senin.

1. **Veri kaynağı lisansları (en önemlisi).** Kodu yazan oturumun internet erişimi yoktu, şartlar okunamadı.
   - `lib/providers/crux.ts` → CrUX lisans/atıf şartlarını oku, `LISANS.sartlarOkunduTarihi` ve `lisansAdi`'nı doldur.
   - `lib/providers/cloudflare-radar.ts` → **Dikkat:** Radar verisinin *NonCommercial* (CC BY-NC) lisanslı olduğu bilgisi var, doğrulanmadı. AdSense'li bir sitede ticari kullanım sayılabilir. Ticari kullanım serbest değilse provider'ı açma.
   - Tarih doldurulana kadar bu iki provider **production'da kapalıdır** (`providerEnabled`), arayüz "kaynak kapalı" der, CSV'ye kolonları girmez.
2. **Mecra & Spec kayıtları** (`content/mecra/*.mdx`) taslaktır: hepsi "doğrulanmalı" etiketli, sayısal spec/CPM alanları bilerek boş. Resmî spec belgesinden doğrulayıp `son_dogrulama` ve `kaynak_url` ekle; Türkiye'deki erişilebilirliği (FAST kanalları, retail media ürünleri) teyit et.
3. **Sözlük** (`content/sozluk/*.mdx`, 164 terim) yapay zekâyla yazıldı; özellikle hızlı değişen konulara (Privacy Sandbox, KVKK, SKAdNetwork, Chrome cookie durumu) bir göz at.
4. **CPM Katman A verisi**: Admin → CPM tabloları. Public benchmark değerlerini kaynak para biriminde, Türkiye katsayısını metot notuyla gir. Boşken ticker "veri bekleniyor" der.
5. **Universe referansları**: Admin → Reach & universe. TÜİK / IAB Türkiye gibi kaynaklardan, tarihli. Boşken reach aracı "sen gir" modunda.
6. **KVKK**: `/gizlilik` sayfasına veri sorumlusu ve başvuru iletişim adresini ekle.
7. Ortam değişkenleri (aşağıda) ve Supabase kurulumu.

### Bilinçli olarak yapılmayanlar / sonraya kalanlar

- **Admin segment kütüphanesi (§M6 yol 2)** yapılmadı: DSP segment export'larının platforma kalıcı yazılması §0 açısından riskli (ajans hesabından alınmış export'lar). Kullanıcı kendi listesini yükler; liste tarayıcıda kalır.
- Similarweb DigitalRank provider'ı eklenmedi (şartlar okunamadı). DataForSEO §4.2d gereği hiç eklenmedi.
- CPM hesaplayıcıda CSV toplu mod, TCMB kurunun otomatik çekilmesi, `/admin/tutarlilik` sayfası, rapor "kaydet" seçeneği, brief için .docx okuma, self-servis hesap silme.
- DV360 seçilirse 3P Excel'ine ek bir "DV360" sheet'i eklenir (spec iki sheet diyor; DV360 seçilmezse tam olarak Adform + Amazon).

## Stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict (5.9 — TS 7 Next 15 ile uyumsuz) |
| Stil | Tailwind CSS v4 + CSS custom property tema tokenları |
| DB | PostgreSQL (Supabase) + Drizzle ORM, migration'lar `db/migrations` |
| Auth | Supabase Auth, e-posta magic link (araçlar girişsiz çalışır) |
| AI | Anthropic API (`claude-opus-5-5`), server-side, zod şemalı yapılandırılmış çıktı, refusal fallback |
| Excel / PDF | exceljs · @react-pdf/renderer + gömülü Inter/JetBrains Mono TTF |
| Grafik | Recharts |
| Test | Vitest — saf modüllerde %100 kapsam eşiği, migration'lar PGlite ile test |

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

Site veritabanı ve anahtarlar olmadan da açılır: sözlük, hesaplayıcılar, reach, mecra ve rapor
metrikleri çalışır; DB/AI gerektiren yerler bunu açıkça söyler.

### Supabase (kişisel hesapla)

1. [supabase.com](https://supabase.com)'da **kişisel** hesapla proje aç (bölge: Frankfurt).
2. **Project Settings → API**: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (server-only).
3. **Database → Connection string → Transaction pooler** (port 6543) → `DATABASE_URL`.
4. **Authentication → URL Configuration**: Site URL ve Redirect URL'lere `https://prgturk.com/auth/callback` (ve yerelde `http://localhost:3000/auth/callback`).
5. `ADMIN_EMAILS` içine kendi e-postanı yaz; `/giris`'ten magic link ile giriş yap, `/admin`'e git.
6. Şemayı kur: `npm run db:migrate`

Migration'lar tüm tablolarda **RLS'i açar ve politika tanımlamaz**: anon anahtarla PostgREST
üzerinden hiçbir tabloya erişilemez. Uygulama DB'ye yalnızca server-side `DATABASE_URL` ile bağlanır.

### Ortam değişkenleri (özet — tamamı `.env.example`'da)

| Değişken | Ne için |
|---|---|
| `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, `ADMIN_EMAILS` | DB, giriş, admin |
| `ANTHROPIC_API_KEY` | Hedef Kitle Çalış, rapor yorumu, envanter kategori önerisi |
| `AI_HOURLY_LIMIT`, `AI_DAILY_LIMIT`, `RATE_LIMIT_SALT` | yapay zekâ kötüye kullanım koruması |
| `CRON_SECRET` | Vercel Cron (ads.txt günlük, CrUX aylık) |
| `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON` | CrUX ingest — **kişisel** GCP projesi |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Radar (lisans onayından sonra) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADSENSE_*` | yalnızca kullanıcı rızasıyla yüklenir; AdSense kimliği `/ads.txt`'e eklenir |

### Komutlar

```bash
npm run dev            # geliştirme
npm run build          # production build
npm test               # unit + migration testleri
npm run test:coverage  # kapsam (saf modüller %100 eşik)
npm run typecheck
npm run db:generate    # schema.ts değişince migration üret
npm run db:migrate
```

## Mimari

```
app/(site)/            public sayfalar (sozluk, hesapla, reach-tahmin, mecra, envanter, hedef-kitle, rapor, topluluk, hesabim)
app/admin/             korumalı panel (CPM, sezon, reach & universe, envanter, topluluk moderasyonu, sözlük)
app/api/               cpm, audience, report/{yorum,pdf}, domain/batch, topluluk/cpm, presets, favorites, cron/*
lib/calc/              SAF hesaplama fonksiyonları (metrikler, ters hesap, pacing, reach) — %100 test
lib/cpm/               CPM bant modeli (kur ayrıştırma, katsayı), topluluk istatistiği (Katman B)
lib/adstxt/            ads.txt / sellers.json / robots.txt ayrıştırıcı + etik crawler
lib/providers/         SizeProvider'lar — her dosya §4.2c lisans bloğuyla başlar
lib/audience/          segment listesi, prompt, LLM şeması + çözümleme, Excel
lib/report/            kolon eşleme, sayı/tarih ayrıştırma, metrikler, yorum denetimi, PDF
lib/ai/                Anthropic istemcisi (server-only)
content/sozluk, content/mecra   MDX içerik (git'te versiyonlu)
db/                    Drizzle şeması, migration'lar, migration testleri
```

### Kodla zorlanan kurallar

- `cpm_benchmarks.kaynak` → CHECK: yalnızca `public_benchmark`, `topluluk`, `editoryel_tahmin`.
- CPM **kaynak para biriminde** saklanır; TL hiçbir zaman tabloda tutulmaz. TL ve kaynak para birimi değişimi ayrı gösterilir.
- Türkiye katsayısı ve reach parametreleri zorunlu metot notuyla (≥20 karakter, DB CHECK).
- Kaynaklar arası sapma eşiği (%40) aşılırsa hücre "veri yok"a düşer.
- Topluluk hücresi 5 kayıttan azsa gösterilmez; 8 girdi + 5 katkıcı birikince benchmark'ın önüne geçer (eşikler `cpm_settings`, admin'den ayarlanır).
- Hedef kitle: model yalnızca yüklenen listeden segment **kimliği** seçer; CPM/reach/id listeden kopyalanır, listede olmayan kimlik → yeniden deneme.
- Rapor yorumu: modelin yazdığı her sayı olgularla karşılaştırılır; uymayan madde atılır.
- Ham rapor satırları ve "kendi verin" dosyaları tarayıcıdan çıkmaz.
- Provider lisans bloğu doğrulanmadan production'da çalışmaz (§6.10); bulk CSV'ye sağlayıcı ham sayısı girmez (§4.2c).
- Crawler: UA'da iletişim URL'i, robots.txt (RFC 9309), host başına günde 1 istek, SSRF koruması.
- `platform` (`programmatic` | `social`) + `alt_platform` (`meta` | `tiktok`): sosyal kanal refactor'suz eklenir.

## Deploy (Vercel)

1. Repo'yu Vercel'e bağla; Environment Variables'a `.env.example`'daki alanları gir.
2. `vercel.json` cron'ları otomatik kurulur (ads.txt her gece, CrUX ayın 15'i ve 22'si). `CRON_SECRET` tanımlı olmalı.
3. Domain alınınca Vercel → Domains'e `prgturk.com` ekle.
