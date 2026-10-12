# Gizlilik Bildirimi ve Aydınlatma Metni (Şablon)

> ⚠️ **Bu metin v1 (hesapsız) model içindir; e-posta ile üyelikte YANLIŞ olur, bu haliyle yayınlamayın.** v2 aydınlatma metni, kayıt akışı canlıya alınmadan önce [`DESIGN_V2.md`](DESIGN_V2.md) §4'e göre yeniden yazılacak.

> **Şablondur, hukuki tavsiye değildir.** `[KÖŞELİ PARANTEZ]` alanlarını doldurun ve yayından önce bir avukata kontrol ettirin. Reklam veya analitik eklerseniz bu metin artık doğru olmaz; mutlaka güncelleyin.

**Son güncelleme:** [GG.AA.YYYY]
**Uygulama:** [OYUN ADI] ("Uygulama")
**Geliştirici / Veri Sorumlusu:** [AD SOYAD / ŞİRKET UNVANI], [ADRES], iletişim: [destek@alanadi]

---

## 1. Kısaca

- **Hesap yoktur.** Adınızı, e-postanızı, telefon numaranızı, sosyal medya hesabınızı, konumunuzu, rehberinizi veya cihaz/reklam kimliğinizi **istemiyor ve toplamıyoruz.**
- **Oyun ilerlemeniz yalnızca cihazınızda**, şifrelenmiş olarak saklanır. Biz göremeyiz ve erişemeyiz.
- **Analitik, reklam takibi, profilleme veya çökme raporlama aracı kullanılmaz.**
- **Kullanıcılar arası sohbet veya mesajlaşma yoktur.**

## 2. Cihazınızda saklanan veriler

| Veri | Amaç | Konum |
|---|---|---|
| Karakter adı, seviye, statlar, eşyalar, altın, görev durumu | Oyunun çalışması | Cihazınızdaki uygulama veritabanı (şifreli) |
| Rastgele üretilmiş şifreleme anahtarı | Kaydı korumak | Cihazınızın güvenli anahtar deposu (Keychain/Keystore) |

Bu veriler sunucularımıza gönderilmez. Uygulamayı silerseniz ya da "Tüm Verilerimi Sil" seçeneğini kullanırsanız kalıcı olarak silinir. Android yedeklemesi kapalıdır. iOS cihaz yedeklerinde şifreli kayıt dosyası yer alabilir, ancak şifreleme anahtarı yalnızca bu cihazda tutulduğu (iCloud'a aktarılmadığı) için bu dosya yedekten okunamaz.

## 3. İsteğe bağlı çevrimiçi özellikler

Çevrimiçi özellikler (Arena PvP, sıralama, bulut transferi) **varsayılan olarak kapalıdır**. Siz açmadığınız sürece Uygulama internete bağlanmaz.

Açtığınızda işlenen veriler:

| Veri | Amaç | Saklama süresi |
|---|---|---|
| Karakterinizin savaş değerleri (seviye, köken, statlar, eşya türleri) | Eşleştirme ve savaşın hesaplanması | En fazla 24 saat |
| Cihazınızda rastgele üretilen anahtarın tek yönlü özeti (hash) | Sıralamada puanınızı tutmak | 30 gün işlem yapılmazsa ya da sezon sonunda otomatik silinir |
| Otomatik üretilmiş takma ad (ör. "Paslı Çakal #4821") | Sıralamada görünmek | Yukarıdakiyle aynı |
| IP adresi | Bağlantının kurulması ve kötüye kullanımın (aşırı istek) önlenmesi | Diske kaydedilmez, günlüklenmez. Yalnızca bellekte, tek yönlü ve 1 dakikada değişen anahtarla özetlenmiş halde ≤ 1 dakika tutulur. |

- Karakter adınız **gönderilmez**.
- Bu veriler sizin kimliğinizle, cihazınızla veya IP adresinizle **eşleştirilmez**. Sizi tanımlamamız mümkün değildir.
- **Hukuki dayanak:** Talep ettiğiniz hizmetin sunulması ve hizmet güvenliğine ilişkin meşru menfaat (KVKK md. 5/2-c ve 5/2-f; GDPR md. 6/1-b ve 6/1-f).
- **Silme:** "Gizlilik → Tüm Verilerimi Sil" sıralama kaydınızı sunucudan da hemen siler.

## 4. Transfer kodu (yedekleme)

İlerlemenizi başka bir cihaza taşımak için bir **transfer kodu** oluşturabilirsiniz.

- İlerlemeniz bu kodla **cihazınızda** şifrelenir (AES-256-GCM).
- Bulut seçeneğini kullanırsanız sunucuya yalnızca **okunamayan şifreli veri** yüklenir. Bu veri ilk indirildiğinde ya da en geç **72 saat** sonra otomatik silinir.
- Kod bizde **saklanmaz**. Kaybederseniz ilerlemenizi kurtaramayız.

## 5. Uygulama içi satın almalar

Ödemeler tamamen **Apple App Store** veya **Google Play** tarafından işlenir. Kart veya ödeme bilgilerinizi görmeyiz. Satın alma doğrulaması cihazınızda yapılır; satın alma kayıtlarınızı sunucumuzda tutmayız. Bu platformların veri işleme faaliyetleri kendi gizlilik politikalarına tabidir.

## 6. Üçüncü taraflar

- Sunucularımız [BARINDIRMA SAĞLAYICISI], [ÜLKE/BÖLGE] konumunda barındırılır.
- Apple ve Google, işletim sistemi düzeyinde (sizin onayınıza bağlı) çökme veya kullanım istatistikleri toplayabilir. Bu, kendi politikalarına tabidir.
- Başka hiçbir üçüncü tarafla veri paylaşmayız ve veri satmayız.

## 7. Çocuklar

Uygulama çocuklardan bilerek kişisel veri toplamaz; zaten kimseden kişisel veri istenmez. [YAŞ SINIRI / PEGI derecesi]

## 8. Haklarınız

KVKK md. 11 ve GDPR kapsamındaki haklarınız (bilgi talebi, düzeltme, silme, itiraz vb.) için [destek@alanadi] adresine yazabilirsiniz.

Hesap veya kimlik bilgisi tutmadığımız için talebinizi bir kişiyle **eşleştiremeyebiliriz**. Cihazınızdaki verileri doğrudan Uygulama içinden silebilir, sıralama kaydınızı "Tüm Verilerimi Sil" ile kaldırabilirsiniz. Kişisel Verileri Koruma Kurulu'na veya ilgili AB denetim makamına şikâyet hakkınız saklıdır.

## 9. Değişiklikler

Bu bildirimi güncellersek yeni sürümü Uygulama içinde ve [URL] adresinde yayınlarız. Veri işleme kapsamını genişleten değişikliklerde (ör. reklam eklenmesi) önceden bilgilendirme yapılır ve gerekiyorsa onayınız istenir.

---

# Privacy Notice (English summary)

- **No accounts.** We do not ask for or collect your name, email, phone, social profiles, location, contacts, device ID or advertising ID.
- **Your progress is stored only on your device**, encrypted. We cannot see or access it.
- **No analytics, ad tracking, profiling or crash-reporting SDKs. No player-to-player chat.**
- **Optional online features** (PvP, leaderboard, cloud transfer) are **off by default**. If you enable them, we process:
  - your character's combat build (≤ 24 h);
  - a one-way hash of a random token generated on your device (deleted after 30 days of inactivity or at season end);
  - an auto-generated nickname.
  - Your IP address is processed transiently to deliver the connection and prevent abuse. It is never logged or written to disk.
- **Transfer codes** encrypt your save on-device. The server only ever stores unreadable ciphertext, deleted on first download or after 72 h. We do not keep the code.
- **Purchases** are processed by Apple/Google. We never see payment details.
- **Contact / data requests:** [support@domain]. Controller: [NAME, ADDRESS]. Hosting: [PROVIDER, REGION].
