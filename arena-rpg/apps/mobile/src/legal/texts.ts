import { game } from '@arena/core';

const R = game.RETENTION;
const months = (days: number) => Math.round(days / 30.4);

/**
 * In-app legal texts. TEMPLATE – fill the [brackets] and have a lawyer review before release.
 * Retention periods are read from game.RETENTION, the same constants the server's
 * retention job enforces, so the text cannot promise something the code does not do.
 * docs/PRIVACY_NOTICE.md and docs/TERMS.md are generated from this file (npm run legal:docs).
 */
export const LEGAL = {
  versions: game.LEGAL_VERSIONS,
  privacy: {
    title: 'Aydınlatma Metni',
    body: `Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) md. 10 ve AB Genel Veri Koruma Tüzüğü (GDPR) md. 13 uyarınca hazırlanmıştır.

Veri sorumlusu
• [AD SOYAD / ŞİRKET UNVANI], [ADRES], [MERSİS / VERGİ NO], e-posta: [kvkk@alanadi]

Hangi kişisel verileri işliyoruz?
• Kimlik / iletişim: e-posta adresin.
• Hesap güvenliği: şifren (geri döndürülemez özet olarak, scrypt), oturum anahtarlarının özeti, son etkinlik zamanı.
• Oyun verileri: oyun içi takma adın (otomatik üretilir), dövüşçü adların, seviye, yetenek, altın, sefer ve rapor kayıtların.
• Onay kayıtları: hangi metin sürümünü, yaş beyanını ve pazarlama iznini ne zaman verdiğin veya geri aldığın.
• Başvurular: bize yaptığın KVKK başvuruları ve yanıtları.
• IP adresi: yalnızca bağlantı kurmak ve aşırı istekleri engellemek için bellekte anlık işlenir; diske yazılmaz, günlüğe kaydedilmez.
• Doğum tarihi, ad-soyad, telefon, konum, rehber, reklam kimliği veya cihaz kimliği toplamıyoruz. Analitik, reklam veya takip aracı kullanmıyoruz.

Hangi amaçla ve hangi hukuki sebeple?
• Hesabının açılması, oyunun sunulması, doğrulama ve hesap güvenliği: sözleşmenin kurulması ve ifası (KVKK md. 5/2-c, GDPR md. 6/1-b).
• Hile ve kötüye kullanımın önlenmesi, uygunsuz dövüşçü adlarının denetlenmesi, yönetici işlemlerinin kayıt altına alınması: meşru menfaat (KVKK md. 5/2-f, GDPR md. 6/1-f).
• Onay ve başvuru kayıtlarının saklanması: hukuki yükümlülük ve bir hakkın tesisi, kullanılması veya korunması (KVKK md. 5/2-ç ve 5/2-e).
• Yenilik ve etkinlik e-postaları: yalnızca ayrıca verdiğin açık rıza ile (KVKK md. 5/1). İznini istediğin an Hesap sekmesinden geri alabilirsin; oyunu oynamak için gerekli değildir.
• Otomatik karar alma veya profil çıkarma yapılmaz.

Nasıl topluyoruz?
• Uygulamadaki kayıt formu ve oyun içi işlemlerin aracılığıyla, elektronik ortamda.

Kimlere aktarıyoruz?
• Barındırma sağlayıcısı: [SAĞLAYICI], sunucular [ÜLKE / BÖLGE].
• E-posta gönderim hizmeti: [SAĞLAYICI], [ÜLKE / BÖLGE].
• Bu firmalar yalnızca talimatımızla, veri işleyen sözleşmesiyle çalışır. Sunucu veya e-posta hizmeti yurt dışındaysa aktarım KVKK md. 9 kapsamında [standart sözleşme / yeterlilik kararı] ile yapılır.
• Yetkili kamu kurumlarına yalnızca kanunen zorunlu olduğunda.
• Verini satmayız; reklam veya pazarlama amacıyla üçüncü kişilerle paylaşmayız.

Ne kadar saklıyoruz? (Saklama ve İmha Politikası)
• Hesap verileri: hesabın açık olduğu sürece. Hesabını uygulamadan sildiğinde hemen silinir.
• E-postasını doğrulamamış kayıtlar: ${R.pendingAccountDays} gün.
• Hareketsiz hesaplar: yaklaşık ${months(R.inactiveWarnDays)} ay giriş yapılmazsa e-postayla uyarılır; uyarıdan sonra en az ${R.warnGraceDays} gün içinde giriş yapılmazsa ve hareketsizlik ${months(R.inactiveDeleteDays)} ayı bulmuşsa hesap silinir.
• Sefer ve araştırma raporları: ${R.reportsDays} gün.
• Yönetici işlem kayıtları: ${months(R.auditDays)} ay.
• KVKK başvuruları: yanıtlandıktan sonra ${months(R.dataRequestsDays)} ay (başvurunun usulüne uygun yanıtlandığını ispat için).
• Süresi dolan veriler sunucuda 6 saatte bir çalışan otomatik görevle silinir.

Güvenlik
• Bağlantılar şifrelidir (HTTPS). Şifreler ve oturum anahtarları yalnızca özet olarak saklanır. Yönetici erişimi iki adımlı doğrulamaya bağlıdır ve her erişim kayıt altına alınır; e-posta adresin yöneticiye maskeli gösterilir.

Hakların (KVKK md. 11, GDPR md. 15-22)
• Verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, amacını öğrenme, aktarıldığı kişileri bilme.
• Eksik veya yanlış işlenmişse düzeltilmesini, KVKK md. 7 şartlarıyla silinmesini isteme ve bunun aktarılan kişilere bildirilmesini isteme.
• Otomatik sistemlerle aleyhine bir sonuç çıkmasına itiraz etme; kanuna aykırı işleme nedeniyle zararının giderilmesini isteme.
• Uygulama içinden hemen kullanabileceklerin: Hesap > Verilerimi indir (tüm verilerinin kopyası), e-posta ve şifre değiştirme, pazarlama iznini geri alma, hesabımı sil.
• Diğer talepler için: Hesap > KVKK başvurusu yap, ya da [kvkk@alanadi] / [KEP ADRESİ] / [POSTA ADRESİ]. Başvurunu en geç ${R.dataRequestAnswerDays} gün içinde ücretsiz yanıtlarız.
• Yanıtımızı yeterli bulmazsan Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsin (AB'de yaşıyorsan bulunduğun ülkenin denetim makamına da başvurabilirsin).

Çocuklar
• Oyuna kayıt için en az ${game.MIN_AGE} yaşında olmak gerekir. Bu yaşın altında olduğunu öğrendiğimiz hesaplar silinir.

Sohbet yok
• Oyunda oyuncular arası mesajlaşma yoktur. Başkalarına görünen tek oyuncu metni dövüşçü adlarıdır; yönetim uygunsuz adları değiştirebilir.

Değişiklikler
• Bu metin değişirse uygulamayı açtığında güncel sürümü okuyup onaylaman istenir.`,
  },
  terms: {
    title: 'Kullanım Koşulları',
    body: `Taraflar
• Bu koşullar [ŞİRKET UNVANI] ("biz") ile Aegis oyununu kullanan oyuncu ("sen") arasındadır.

Hesap
• Kayıt için en az ${game.MIN_AGE} yaşında olmalısın.
• Hesabın kişiseldir; paylaşma, satma, devretme. Şifreni gizli tut; hesabında yapılan işlemlerden sen sorumlusun.
• Hesabını istediğin an uygulama içinden silebilirsin.

Kurallar
• Hile, otomasyon (bot), açık istismarı, sunucuya zarar verecek kullanım yasaktır.
• Hakaret içeren, nefret söylemi barındıran, başkasının kimliğine bürünen veya marka/telif hakkı ihlal eden dövüşçü adları yasaktır.
• Kurallara aykırılıkta hesap geçici veya kalıcı olarak yasaklanabilir; yasak gerekçesi ve süresi girişte gösterilir.

Oyun içi değerler
• Altın, eşya ve dövüşçüler oyunun lisanslı içeriğidir; gerçek para değeri taşımaz, hesap dışına aktarılamaz veya satılamaz.
• Oyun dengesi, sezonlar ve içerik zaman içinde değişebilir.
• Uygulama içi satın almalar Apple App Store veya Google Play üzerinden yapılır; iade ve cayma hakkı bu mağazaların koşullarına ve Mesafeli Sözleşmeler Yönetmeliği'ne tabidir.

Sorumluluk
• Oyun "olduğu gibi" sunulur; kesintisiz veya hatasız olacağı garanti edilmez. Kanunen sınırlanamayan haller saklıdır.
• Bakım, güvenlik veya hukuki zorunluluk nedeniyle hizmeti geçici olarak durdurabilir ya da sona erdirebiliriz; mümkünse önceden duyururuz.

Fikri mülkiyet
• Oyunun adı, metinleri, görselleri ve kodu bize veya lisans verenlerimize aittir.

Değişiklik ve uygulanacak hukuk
• Bu koşullar değişirse uygulamada yeniden onayın istenir.
• Türk hukuku uygulanır; tüketici işlemlerinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.

İletişim
• [ŞİRKET], [ADRES], [destek@alanadi]`,
  },
};
