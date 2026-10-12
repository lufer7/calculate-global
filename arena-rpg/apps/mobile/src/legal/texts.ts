import { game } from '@arena/core';

/**
 * In-app legal texts. TEMPLATE – fill the [brackets] and have a lawyer review before release.
 * Full versions: docs/PRIVACY_NOTICE.md and docs/TERMS.md (publish both at public URLs for the stores).
 */
export const LEGAL = {
  versions: game.LEGAL_VERSIONS,
  privacy: {
    title: 'Aydınlatma Metni',
    body: `Veri sorumlusu: [AD SOYAD / ŞİRKET], [ADRES], [destek@alanadi]

Hangi verileri işliyoruz?
• E-posta adresin ve şifren (şifre geri döndürülemez şekilde, özetlenerek saklanır).
• Oyun verilerin: dövüşçülerin, adları, seviyeleri, yetenekleri, altının, seferlerin ve raporların.
• Teknik veriler: oturum anahtarı (özetlenmiş), son giriş zamanı. IP adresin bağlantı ve kötüye kullanımı önleme için anlık işlenir; kaydedilmez.
• Onay kayıtların: hangi metin sürümünü ne zaman onayladığın.

Neden ve hangi hukuki sebeple?
• Hesabını açmak, oyunu sunmak ve güvenliğini sağlamak: sözleşmenin kurulması ve ifası (KVKK md. 5/2-c, GDPR md. 6/1-b).
• Hile ve kötüye kullanımı önlemek: meşru menfaat (KVKK md. 5/2-f).
• Pazarlama e-postaları: yalnızca ayrıca açık rıza verirsen (istediğin zaman geri alabilirsin).

Kimlerle paylaşıyoruz?
• Barındırma sağlayıcımız [SAĞLAYICI, ÜLKE] ve e-posta gönderim hizmetimiz [SAĞLAYICI, ÜLKE]. Verini satmayız; reklam veya analitik amaçla paylaşmayız.

Ne kadar saklıyoruz?
• Hesabın açık olduğu sürece. Hesabını uygulama içinden sildiğinde verilerin hemen silinir. 24 ay giriş yapılmayan hesaplar uyarıdan sonra silinir.

Hakların
• KVKK md. 11 ve GDPR kapsamında bilgi isteme, düzeltme, silme, itiraz ve şikâyet haklarına sahipsin. [destek@alanadi] adresine yazabilirsin.

Sohbet yok
• Oyunda oyuncular arası mesajlaşma yoktur. Dövüşçü adları yönetici tarafından denetlenebilir.`,
  },
  terms: {
    title: 'Kullanım Koşulları',
    body: `• Oyunu kullanmak için en az [13/16] yaşında olmalısın.
• Hesabın kişiseldir; paylaşma, satma veya devretme.
• Hile, otomasyon, açık istismarı ve başkalarını rahatsız eden dövüşçü adları yasaktır. Bu durumlarda hesap geçici veya kalıcı olarak yasaklanabilir.
• Oyun içi altın ve eşyalar gerçek para değeri taşımaz ve hesabın dışına aktarılamaz.
• Oyun dengesi, sezonlar ve içerik zaman içinde değişebilir.
• Hizmet "olduğu gibi" sunulur; kesintisiz olacağı garanti edilmez.
• Bu koşullar değişirse uygulama içinde yeniden onayın istenir.
[ŞİRKET], [ADRES], [destek@alanadi]`,
  },
};
