import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

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
              <strong>Hesaplayıcılar:</strong> girdiğin sayılar yalnızca tarayıcında hesaplanır, sunucuya gönderilmez. Paylaşılabilir
              link için sayılar adres çubuğundaki URL&apos;de durur; linki kime gönderirsen o görür.
            </li>
            <li>
              <strong>Sözlük araması:</strong> tamamen tarayıcında çalışır.
            </li>
            <li>
              <strong>Yönetici girişi:</strong> yalnızca yönetici paneli için e-posta adresi ve oturum çerezi (Supabase Auth) işlenir.
            </li>
            <li>
              <strong>Analitik ve reklam:</strong> şu an yok. Eklendiğinde (Vercel Analytics, Google Analytics 4, AdSense) bu metin ve çerez
              tercihleri önceden güncellenecek.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="label">// rapor ve segment yüklemeleri (gelecek modüller)</h2>
          <p className="mt-3">
            Rapor Yorumla ve Hedef Kitle Çalış modüllerinde yüklenen dosyalar varsayılan olarak diske yazılmayacak, bellekte işlenip istek
            bitince silinecek. Kullanıcı açıkça &ldquo;kaydet&rdquo; demedikçe hiçbir rapor saklanmayacak. Loglara satır verisi yazılmayacak.
            Bu modüller yayına çıkmadan önce bu bölüm ayrıntılı aydınlatma metniyle güncellenecek.
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
