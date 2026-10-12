# KVKK / GDPR Uyum Belgesi

> Bu belge bir mühendislik dokümanıdır, hukuki görüş değildir. Yayından önce bir KVKK avukatına kontrol ettirin. "Sizin yapmanız gerekenler" bölümündeki adımlar kodla çözülemez; veri sorumlusu olarak sizin sorumluluğunuzdadır.

## 1. Kodda karşılananlar

| Yükümlülük | Dayanak | Kodda nerede |
|---|---|---|
| Aydınlatma, veri toplanırken yapılır | KVKK md. 10, GDPR md. 13 | Kayıt ekranı: Aydınlatma Metni bağlantısı ve "okudum" kutusu zorunlu (`AuthScreen.tsx`, `/v1/auth/register`) |
| Açık rıza yalnızca gerektiğinde ve ayrı alınır | KVKK md. 5/1, Kurul ilke kararları | Hesap için rıza istenmez (sözleşmenin ifası). Pazarlama izni ayrı, işaretsiz, istenildiği an geri alınabilir (`/v1/me/marketing`) |
| Onayların ispatı | KVKK md. 5, ispat yükü | Değiştirilemez `consent_log` tablosu: koşullar, aydınlatma, yaş, pazarlama (sürüm ve zamanıyla) |
| Metin değişince yeniden onay | Şeffaflık | `LEGAL_VERSIONS` değişince uygulama yeniden onay ekranı açar (`ReacceptScreen.tsx`) |
| Veri minimizasyonu | KVKK md. 4 | Yalnızca e-posta istenir. Takma ad otomatik üretilir. Doğum tarihi yerine yaş beyanı kutusu. IP diske yazılmaz. Analitik, reklam veya takip SDK'sı yok |
| Saklama ve imha | KVKK md. 7, Silme/Yok Etme Yönetmeliği | `RETENTION` sabitleri + `runRetention` (açılışta ve 6 saatte bir). Her çalışma `retention_runs` tablosuna sayı olarak yazılır. Panelde "Saklama ve imha" sekmesi |
| Hareketsiz hesapların silinmesi | KVKK md. 7 | ~23 ay → uyarı e-postası, ~24 ay ve en az 30 gün sonra → silme. Giriş yapan oyuncunun uyarısı iptal olur |
| Bilgi ve erişim hakkı, taşınabilirlik | KVKK md. 11, GDPR md. 15/20 | Oyuncu "Verilerimi indir" ile her şeyi JSON olarak alır (`/v1/me/export`). Panelden de dışa aktarılır (kayda geçer) |
| Düzeltme hakkı | KVKK md. 11/d | E-posta değiştirme (yeni adres doğrulanır, eski adrese bildirim gider), şifre değiştirme |
| Silme hakkı | KVKK md. 11/e, Apple/Google kuralı | Uygulama içinden şifreyle hesap silme; bütün bağlı veriler zincirleme silinir (`deleteAccount`) |
| Başvuruya 30 günde yanıt | KVKK md. 13 | Uygulama içi KVKK başvurusu. Panelde son tarih ve gecikme uyarısıyla liste, yanıt oyuncuya e-postayla bildirilir |
| Veri güvenliği (teknik tedbirler) | KVKK md. 12 | scrypt ile şifre özeti, oturum anahtarları özetli, hız sınırı, e-posta doğrulama, yönetici için şifre + TOTP, 30 dk hareketsizlikte oturum kapanması, sıkı CSP, IP izin listesi seçeneği, istek günlüğü tutulmaması |
| Yetkili erişiminin kaydı | KVKK md. 12, hesap verebilirlik | Paneldeki her işlem `admin_audit` tablosunda. E-postalar maskeli; tam adres gerekçe yazılarak açılır ve kayda geçer |
| Çocuklar | GDPR md. 8, mağaza kuralları | Kayıtta "16 yaşından büyüğüm" beyanı zorunlu (`MIN_AGE`) |
| Kullanıcı içeriği ve sorumluluk | 5651 sayılı Kanun | Sohbet yok. Tek oyuncu metni dövüşçü adı: doğrulama + panelden değiştirme |
| Bildirimlerde veri sızmaması | Minimizasyon | Yöneticiye giden yeni üye bildirimlerinde oyuncunun e-postası yer almaz |

- **Sancak (rev3):** Sohbet yoktur. Oyuncuların yazabildiği tek metin sancak adı ve kısaltmasıdır; kayıt sırasında küfür/nefret/siyasi ve "Aegis/yönetici" gibi taklit içeren adlar engellenir (`packages/core/src/game/clan.ts`). Yönetici panelindeki "Sancaklar" sekmesinden ad sıfırlanır ya da sancak dağıtılır; her işlem işlem kaydına yazılır. Sancak verileri veri dışa aktarımında yer alır, hesap silinince üyelik silinir ve liderlik en eski üyeye geçer.

## 2. Kişisel veri envanteri (özet)

| Veri kategorisi | Veri | Amaç | Hukuki sebep | Saklama | Aktarım |
|---|---|---|---|---|---|
| İletişim | E-posta | Hesap, doğrulama, güvenlik bildirimleri | md. 5/2-c | Hesap süresince | E-posta sağlayıcısı |
| İşlem güvenliği | Şifre özeti, oturum özetleri, son etkinlik, anlık IP | Hesap güvenliği, kötüye kullanımın önlenmesi | md. 5/2-c, 5/2-f | Hesap süresince; oturumlar en fazla 30 gün; IP saklanmaz | Barındırma |
| Müşteri işlem | Dövüşçüler, oyun ilerlemesi, seferler, keşifler, raporlar | Oyunun sunulması | md. 5/2-c | Hesap süresince; raporlar ve biten keşifler 90 gün | Barındırma |
| Müşteri işlem (topluluk) | Sancak üyeliği, rol, katkı, av hasarları, yardım kayıtları; sancak adı/kısaltması (herkese açık oyuncu metni) | Sancak özelliğinin sunulması, uygunsuz adların denetimi | md. 5/2-c, 5/2-f | Üyelik ayrılınca/hesap silinince hemen; etkinlik, yardım ve av kayıtları 90 gün | Barındırma |
| Hukuki işlem | Onay kayıtları, KVKK başvuruları | İspat, yükümlülük | md. 5/2-ç, 5/2-e | Hesapla birlikte; başvurular yanıttan sonra 2 yıl | Barındırma |
| Pazarlama | Pazarlama izni | Bülten | md. 5/1 (açık rıza) | Geri alınana kadar | E-posta sağlayıcısı |

Bu tabloyu VERBİS kaydına ve "Kişisel Veri İşleme Envanteri"ne esas alabilirsiniz.

## 3. Sizin yapmanız gerekenler (kod dışı)

- [ ] **Veri sorumlusu bilgileri:** `apps/mobile/src/legal/texts.ts` içindeki [köşeli parantez] alanlarını doldurun, sonra `npm run legal:docs` çalıştırın. Ardından `docs/PRIVACY_NOTICE.md` ve `docs/TERMS.md` dosyalarını herkese açık bir web adresinde yayınlayın; mağazalar bu adresi ister.
- [ ] **VERBİS:** Yurt içinde yerleşik ve yıllık çalışan sayısı ile mali bilanço eşiklerinin altındaysanız ve ana faaliyetiniz özel nitelikli veri işlemek değilse kayıt muafiyeti olabilir. Eşikler değişebildiği için kvkk.gov.tr'den güncel Kurul kararını kontrol edin. Yurt dışında yerleşikseniz ve Türkiye'deki oyunculara hizmet veriyorsanız kayıt yükümlülüğü doğar.
- [ ] **Saklama ve İmha Politikası:** VERBİS'e kayıt yükümlülüğünüz varsa yazılı politika zorunludur. Bu belgedeki §2 tablosu ve `RETENTION` süreleri taslak olarak kullanılabilir. Periyodik imha en geç 6 ayda bir yapılmalı; sunucu bunu 6 saatte bir yapıyor.
- [ ] **Veri işleyen sözleşmeleri:** Barındırma ve e-posta sağlayıcılarıyla imzalayın (KVKK md. 12/2).
- [ ] **Yurt dışına aktarım (KVKK md. 9):** Sunucu veya e-posta sağlayıcısı yurt dışındaysa Kurul'un standart sözleşmesini imzalayın ve imzadan sonra 5 iş günü içinde Kurul'a bildirin. En kolayı, Türkiye'de barındırma ve Türkiye'de e-posta sağlayıcısı seçmektir.
- [ ] **Veri ihlali prosedürü:** Bir ihlal fark ettiğinizde:
  1. Erişimi kesin; yönetici şifrelerini ve TOTP anahtarlarını yenileyin (`npm run admin:create` tekrar çalıştırılınca eski yönetici oturumları da kapanır).
  2. Etkilenen veri ve kişi sayısını panel kayıtlarından ve işlem kaydından çıkarın.
  3. Kurul'a **72 saat** içinde ihlal bildirim formuyla bildirin.
  4. Etkilenen oyunculara makul en kısa sürede e-postayla bildirin.
  5. Olayı ve aldığınız önlemleri yazılı olarak saklayın.
- [ ] **Yedekler:** Veritabanı yedeklerini şifreli tutun ve saklama sürelerine uyun. Silinen bir hesap, en geç yedeğin saklama süresi dolunca yedekten de kaybolmalıdır (öneri: 30 gün).
- [ ] **Sunucu günlükleri:** Ters proxy'de (Caddy/Nginx) erişim günlüğünü kapatın. Barındırma panelinde istek günlüğü varsa kapatın. Aydınlatma metni "IP kaydedilmez" diyor.
- [ ] **HTTPS:** Canlı sunucu yalnızca HTTPS ile çalışmalı (`docs/ADMIN_SETUP.md` §5).
- [ ] **Mağaza beyanları:** Apple "App Privacy" bölümünde *Contact Info → Email* ve *User Content → Gameplay* verileri "Linked to You", "Not used for tracking" olarak işaretlenmeli. Google Play "Data safety" formu da aynı şekilde. Hesap silme bağlantısı için de bir web sayfası gerekir.
- [ ] **Başvuru kanalları:** Aydınlatma metnindeki e-posta ve KEP/posta adresleri gerçekten izlenen adresler olmalı. Uygulama dışından gelen başvuruları panele elle kaydetmek için bir alan henüz yok; şimdilik e-posta kutunuzda takip edin.

## 4. Bilinçli sınırlar

- **Reklam ve analitik yok.** Eklenirse aydınlatma metni, açık rıza ve mağaza beyanları değişir. Bu yüzden ayrı bir karar ve kod değişikliği gerektirir.
- **Push bildirimi henüz yok.** Eklendiğinde cihaz anahtarı kişisel veri sayılır; metne ve envantere eklenmeli.
- **Yaş doğrulaması bir beyandır.** Doğum tarihi toplamamak bilinçli bir veri minimizasyonu kararıdır.
