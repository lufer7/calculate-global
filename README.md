# PRGTURK — Programatik Masası

Türkiye'deki programatik reklam ve dijital medya çalışanları için tek yerde: sözlük,
metrik hesaplayıcılar, reach tahmini, envanter arama, hedef kitle çalışması ve rapor yorumu.

> Frekans 14'e çıkmış. Kullanıcı artık seni rüyasında görüyor.

Tam ürün tanımı: [`PRG_PROJE_SPEC.md`](./PRG_PROJE_SPEC.md). Bu README kurulum ve mimariyi anlatır.

## ⛔ Mutlak kural

Bu kişisel bir projedir. Hiçbir ajans/işveren verisi, lisansı, API anahtarı, BigQuery projesi,
müşteri adı, kampanya bilgisi, rate card'ı veya CPM'i bu repoya, veritabanına veya
arayüze girmez — kalibrasyon ya da "sadece bakacağım" gerekçesiyle bile.
Platformdaki her sayı üç kategoriden birinden gelir: **bize ait**, **ücretsiz ve açık**,
**platformun kendi adına gösterim hakkıyla aldığı**. `kaynak` alanı DB seviyesinde zorunludur.

## Stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Stil | Tailwind CSS v4 + CSS custom property tema tokenları (`app/globals.css`, `tailwind.config.ts`) |
| DB | PostgreSQL (Supabase) + Drizzle ORM, migration'lar `db/migrations` |
| Auth | Supabase Auth, e-posta magic link (yalnızca admin + ileride kayıtlı hesaplamalar) |
| Test | Vitest — `lib/calc` ve `lib/cpm` %100 kapsam eşiğiyle |
| İçerik | MDX (`content/sozluk/*.mdx`), git'te versiyonlu |

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

Site veritabanı olmadan da açılır: sözlük ve hesaplayıcılar statik çalışır, CPM ticker'ı
"veri bekleniyor" der, admin paneli "Supabase yapılandırılmadı" uyarısı gösterir.

### Supabase kurulumu (kişisel hesapla)

1. [supabase.com](https://supabase.com) üzerinde **kişisel** hesapla yeni proje aç
   (bölge: `eu-central-1` Frankfurt — KVKK açısından AB içinde kalır).
2. **Project Settings → API**: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`,
   `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
   (server-only, asla `NEXT_PUBLIC_` önekiyle değil).
3. **Project Settings → Database → Connection string → Transaction pooler** (port 6543)
   → `DATABASE_URL`.
4. **Authentication → URL Configuration**: Site URL = `http://localhost:3000` (prod'da
   `https://prgturk.com`), Redirect URLs'e `http://localhost:3000/auth/callback` ve
   `https://prgturk.com/auth/callback` ekle.
5. **Authentication → Providers → Email**: açık, "Confirm email" açık kalabilir.
6. **Authentication → Users → Invite user** ile kendi e-postanı ekle. Giriş formu yeni kullanıcı
   oluşturmaz (`shouldCreateUser: false`) — yalnızca davet edilmiş hesaplar magic link alabilir.
7. `ADMIN_EMAILS` içine aynı e-postayı yaz.
8. Şemayı kur:
   ```bash
   npm run db:migrate
   ```
9. `/giris` sayfasından magic link ile giriş yap, `/admin`'e git.

Migration'lar tüm tablolarda **RLS'i açar ve politika tanımlamaz**: Supabase'in anon anahtarıyla
PostgREST üzerinden hiçbir tabloya erişilemez. Uygulama DB'ye yalnızca server-side `DATABASE_URL` ile bağlanır.

### Komutlar

```bash
npm run dev            # geliştirme sunucusu
npm run build          # production build
npm test               # unit testler
npm run test:coverage  # kapsam raporu (lib/calc, lib/cpm %100 eşik)
npm run typecheck      # tsc --noEmit
npm run db:generate    # schema.ts değişince yeni migration üret
npm run db:migrate     # migration'ları DB'ye uygula
```

## Mimari

```
app/
  (site)/              public sayfalar (sözlük, hesapla, reach-tahmin, envanter, ...)
  admin/               korumalı panel (CPM benchmark, sezon katsayıları, sözlük)
  api/                 route handler'lar (cpm, ...)
components/            UI bileşenleri (React)
lib/
  calc/                SAF hesaplama fonksiyonları — React yok, %100 test
  cpm/                 CPM bant modeli, kur ayrıştırma, topluluk eşiği
  sozluk/              MDX yükleyici, Türkçe arama normalizasyonu, otomatik terim linki
  quips.ts             duruma göre seçilen "sistem:" satırları
  db/, supabase/       bağlantılar (server-only)
db/
  schema.ts            Drizzle şeması
  migrations/          üretilmiş SQL
content/sozluk/        sözlük maddeleri (MDX)
```

### Veri kuralları (kodla zorlanan)

- `cpm_benchmarks.kaynak` → CHECK: yalnızca `public_benchmark`, `topluluk`, `editoryel_tahmin`.
- CPM değerleri **kaynak para biriminde** saklanır; TL hiçbir zaman tabloda tutulmaz,
  gösterimde `kur_degeri` ile hesaplanır. Arayüz TL ve kaynak para birimi değişimini ayrı gösterir.
- Türkiye düzeltme katsayısı `cpm_adjustments` tablosunda, zorunlu `metot_notu` ile.
- Her veri tablosunda `kaynak` ve tarih NOT NULL.
- Arayüzde "canlı CPM" / "gerçek zamanlı" ifadesi yok: **"tahmini CPM bandı"**.
- Örnek veri koyulacaksa dosya `ornek_` önekli, kayıt `kaynak: "ORNEK VERI"`.
- `platform` kolonu (`programmatic` | `social`): sosyal kanal eklendiğinde refactor gerekmesin diye.

## Fazlar

> Not: repodaki `project-bolt-sb1-bdwyjmd3/` eski bir Vite prototipi; yeni uygulamayla ilgisi yok,
> build ve typecheck dışında tutuluyor. İstenirse silinebilir.

- **P0** — iskelet, tema, nav, ticker, sözlük (150+ terim), Metrik Hesapla, admin iskeleti, SEO ← *şu an*
- P1 — Reach Tahminle, Mecra & Spec Bul, komut çubuğu
- P2 — Envanter Ara (ads.txt, CrUX, Cloudflare Radar)
- P3 — Hedef Kitle Çalış
- P4 — Rapor Yorumla
- P5 — Topluluk CPM'i, hesaplar, AdSense, sosyal kanal

## Deploy (Vercel)

1. Repo'yu Vercel'e bağla, framework otomatik algılanır.
2. Environment Variables'a `.env.example`'daki alanları gir
   (`NEXT_PUBLIC_SITE_URL=https://prgturk.com`).
3. Domain alındığında Vercel → Domains'e `prgturk.com` ekle, DNS kayıtlarını gir.
