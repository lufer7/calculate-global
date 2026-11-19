import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ConsentReset } from "@/components/consent/ConsentBanner";

export const metadata: Metadata = {
  title: "Gizlilik & KVKK",
  description: "PRGTURK hangi veriyi işler, hangisini işlemez.",
  alternates: { canonical: "/gizlilik" },
};

export default function Page() {
  return (
    <>
      <PageHeader etiket="// GİZLİLİK" baslik="Gizlilik & KVKK aydınlatma metni" sistem="toplamadığımız veriyi sızdıramayız.">
        <p>Bu metin sitenin şu anki hâlini anlatır. Yeni bir özellik veri işlemeye başladığında, o özellik yayına çıkmadan önce güncellenir.</p>
      </PageHeader>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-[15px] leading-relaxed text-text">
        <section>
          <h2 className="label">// şu an ne işleniyor</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Hesaplayıcılar ve reach tahmini:</strong> girdiğin sayılar yalnızca tarayıcında hesaplanır, sunucuya gönderilmez. Paylaşılabilir
              link için sayılar adres çubuğundaki URL&apos;de durur; linki kime gönderirsen o görür.
            </li>
            <li>
              <strong>Sözlük araması:</strong> tamamen tarayıcında çalışır.
            </li>
            <li>
              <strong>Giriş:</strong> magic link ile giriş için e-posta adresi ve oturum çerezi (Supabase Auth) işlenir; giriş isteğe bağlıdır.
            </li>
            <li>
              <strong>Vercel Analytics:</strong> çerez kullanmayan, toplu sayfa görüntüleme istatistiği. Kişiyi tanımlamaz.
            </li>
            <li>
              <strong>Google Analytics 4 ve Google AdSense:</strong> yalnızca çerez penceresinde &ldquo;kabul et&rdquo; dersen yüklenir. Reddedersen
              hiçbiri yüklenmez ve araçlar aynen çalışır. IP anonimleştirme açıktır.
              <ConsentReset />
            </li>
            <li>
              <strong>Hesap:</strong> giriş yaparsan e-posta adresin, kaydettiğin hesaplamalar, favorilerin ve CPM katkıların (anonim gösterilir) saklanır.
              Hesabını silmek için iletişim kanalından yazabilirsin.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="label">// rapor yorumla</h2>
          <ul className="mt-3 space-y-2">
            <li>Yüklenen rapor dosyası <strong>tarayıcında</strong> okunur ve hesaplanır; ham satırlar sunucumuza gönderilmez, diske yazılmaz.</li>
            <li>
              &ldquo;Yorum üret&rdquo; seçilirse yalnızca toplu metrikler (toplamlar, oranlar, en iyi/en kötü satır adları) yorum için Anthropic API&apos;ye
              iletilir. PDF bellekte üretilip sana döner, saklanmaz.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="label">// hedef kitle çalış</h2>
          <ul className="mt-3 space-y-2">
            <li>Segment export dosyan tarayıcında okunur; sunucuya yalnızca kitle adı, sağlayıcı, CPM, reach ve id kolonları gider.</li>
            <li>Brief ve bu liste, kitle seçimi için Anthropic API&apos;ye iletilir; istek bitince sunucuda tutulmaz, veritabanına ve loglara yazılmaz.</li>
            <li>&ldquo;Bu tarayıcıda hatırla&rdquo; seçilirse segment listesi yalnızca senin tarayıcının yerel depolamasında tutulur.</li>
          </ul>
        </section>
        <section>
          <h2 className="label">// envanter ara</h2>
          <ul className="mt-3 space-y-2">
            <li>Aranan alan adları tarama listesine eklenebilir (alan adı kişisel veri değildir).</li>
            <li>&ldquo;Kendi verini getir&rdquo; ekranında dosyan tarayıcında işlenir; sunucuya yalnızca domain listesi gider.</li>
          </ul>
        </section>
        <section>
          <h2 className="label">// kötüye kullanım koruması</h2>
          <p className="mt-3">
            Yapay zekâ kullanan araçlar için IP adresinin salt&apos;lı tek yönlü özeti (hash) kısa süreli kota sayacında tutulur; IP adresinin kendisi
            saklanmaz.
          </p>
        </section>
        <section>
          <h2 className="label">// haklar</h2>
          <p className="mt-3">
            6698 sayılı KVKK&apos;nın 11. maddesi kapsamındaki haklarını (bilgi talep etme, düzeltme, silme vb.) kullanmak için iletişim adresi
            yayına çıkmadan önce bu sayfaya eklenecektir.
          </p>
        </section>
      </div>
    </>
  );
}
