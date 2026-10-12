# Aydınlatma Metni

> Şablondur, hukuki tavsiye değildir. [Köşeli parantez] alanlarını doldurup bir avukata kontrol ettirin.
> Bu dosya `apps/mobile/src/legal/texts.ts` dosyasından üretilir (`npm run legal:docs`); doğrudan düzenlemeyin.

**Sürüm:** 2026-10-14

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) md. 10 ve AB Genel Veri Koruma Tüzüğü (GDPR) md. 13 uyarınca hazırlanmıştır.

## Veri sorumlusu

- [AD SOYAD / ŞİRKET UNVANI], [ADRES], [MERSİS / VERGİ NO], e-posta: [kvkk@alanadi]

## Hangi kişisel verileri işliyoruz?

- Kimlik / iletişim: e-posta adresin.
- Hesap güvenliği: şifren (geri döndürülemez özet olarak, scrypt), oturum anahtarlarının özeti, son etkinlik zamanı.
- Oyun verileri: oyun içi takma adın (otomatik üretilir), dövüşçü adların, seviye, yetenek, altın, sefer, keşif ve rapor kayıtların.
- Sancak verileri: katıldığın sancak, rolün, katılım tarihin, katkı puanın, av hasarların ve yaptığın yardımlar. Sancak üyeleri takma adını, rolünü ve en güçlü dövüşçünü görür.
- Onay kayıtları: hangi metin sürümünü, yaş beyanını ve pazarlama iznini ne zaman verdiğin veya geri aldığın.
- Başvurular: bize yaptığın KVKK başvuruları ve yanıtları.
- IP adresi: yalnızca bağlantı kurmak ve aşırı istekleri engellemek için bellekte anlık işlenir; diske yazılmaz, günlüğe kaydedilmez.
- Doğum tarihi, ad-soyad, telefon, konum, rehber, reklam kimliği veya cihaz kimliği toplamıyoruz. Analitik, reklam veya takip aracı kullanmıyoruz.

## Hangi amaçla ve hangi hukuki sebeple?

- Hesabının açılması, oyunun sunulması, doğrulama ve hesap güvenliği: sözleşmenin kurulması ve ifası (KVKK md. 5/2-c, GDPR md. 6/1-b).
- Hile ve kötüye kullanımın önlenmesi, uygunsuz dövüşçü ve sancak adlarının denetlenmesi, yönetici işlemlerinin kayıt altına alınması: meşru menfaat (KVKK md. 5/2-f, GDPR md. 6/1-f).
- Onay ve başvuru kayıtlarının saklanması: hukuki yükümlülük ve bir hakkın tesisi, kullanılması veya korunması (KVKK md. 5/2-ç ve 5/2-e).
- Yenilik ve etkinlik e-postaları: yalnızca ayrıca verdiğin açık rıza ile (KVKK md. 5/1). İznini istediğin an Hesap sekmesinden geri alabilirsin; oyunu oynamak için gerekli değildir.
- Otomatik karar alma veya profil çıkarma yapılmaz.

## Nasıl topluyoruz?

- Uygulamadaki kayıt formu ve oyun içi işlemlerin aracılığıyla, elektronik ortamda.

## Kimlere aktarıyoruz?

- Barındırma sağlayıcısı: [SAĞLAYICI], sunucular [ÜLKE / BÖLGE].
- E-posta gönderim hizmeti: [SAĞLAYICI], [ÜLKE / BÖLGE].
- Bu firmalar yalnızca talimatımızla, veri işleyen sözleşmesiyle çalışır. Sunucu veya e-posta hizmeti yurt dışındaysa aktarım KVKK md. 9 kapsamında [standart sözleşme / yeterlilik kararı] ile yapılır.
- Yetkili kamu kurumlarına yalnızca kanunen zorunlu olduğunda.
- Verini satmayız; reklam veya pazarlama amacıyla üçüncü kişilerle paylaşmayız.

## Ne kadar saklıyoruz? (Saklama ve İmha Politikası)

- Hesap verileri: hesabın açık olduğu sürece. Hesabını uygulamadan sildiğinde hemen silinir.
- E-postasını doğrulamamış kayıtlar: 7 gün.
- Hareketsiz hesaplar: yaklaşık 23 ay giriş yapılmazsa e-postayla uyarılır; uyarıdan sonra en az 30 gün içinde giriş yapılmazsa ve hareketsizlik 24 ayı bulmuşsa hesap silinir.
- Sefer, keşif ve araştırma raporları; sancak etkinlik kaydı, yardım ve av kayıtları: 90 gün. Sancak üyeliğin, sancaktan ayrıldığında ya da hesabın silindiğinde hemen silinir.
- Yönetici işlem kayıtları: 24 ay.
- KVKK başvuruları: yanıtlandıktan sonra 24 ay (başvurunun usulüne uygun yanıtlandığını ispat için).
- Süresi dolan veriler sunucuda 6 saatte bir çalışan otomatik görevle silinir.

## Güvenlik

- Bağlantılar şifrelidir (HTTPS). Şifreler ve oturum anahtarları yalnızca özet olarak saklanır. Yönetici erişimi iki adımlı doğrulamaya bağlıdır ve her erişim kayıt altına alınır; e-posta adresin yöneticiye maskeli gösterilir.

## Hakların (KVKK md. 11, GDPR md. 15-22)

- Verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, amacını öğrenme, aktarıldığı kişileri bilme.
- Eksik veya yanlış işlenmişse düzeltilmesini, KVKK md. 7 şartlarıyla silinmesini isteme ve bunun aktarılan kişilere bildirilmesini isteme.
- Otomatik sistemlerle aleyhine bir sonuç çıkmasına itiraz etme; kanuna aykırı işleme nedeniyle zararının giderilmesini isteme.
- Uygulama içinden hemen kullanabileceklerin: Hesap > Verilerimi indir (tüm verilerinin kopyası), e-posta ve şifre değiştirme, pazarlama iznini geri alma, hesabımı sil.
- Diğer talepler için: Hesap > KVKK başvurusu yap, ya da [kvkk@alanadi] / [KEP ADRESİ] / [POSTA ADRESİ]. Başvurunu en geç 30 gün içinde ücretsiz yanıtlarız.
- Yanıtımızı yeterli bulmazsan Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsin (AB'de yaşıyorsan bulunduğun ülkenin denetim makamına da başvurabilirsin).

## Çocuklar

- Oyuna kayıt için en az 16 yaşında olmak gerekir. Bu yaşın altında olduğunu öğrendiğimiz hesaplar silinir.

## Sohbet yok

- Oyunda oyuncular arası mesajlaşma yoktur; sancaklarda da sohbet bulunmaz. Başkalarına görünen oyuncu metinleri yalnızca dövüşçü adları ile sancak adı ve kısaltmasıdır; yönetim uygunsuz adları değiştirebilir, uygunsuz sancakları dağıtabilir.

## Değişiklikler

- Bu metin değişirse uygulamayı açtığında güncel sürümü okuyup onaylaman istenir.
