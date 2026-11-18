/**
 * Metrik Hesapla araç tanımları (§M2). Saf veri — React yok.
 * Her oran aracı  x = (a / b) × k  biçimindedir ve ratio.ts ile her yöne çözülür.
 * Her tanım formülünü, kaynağını ve varsayımlarını açıkça taşır.
 */

export type FieldKind = "para" | "adet" | "yuzde";
export type FieldDef = { label: string; kind: FieldKind; kisa: string; ipucu?: string };

export type RatioTool = {
  tip: "oran";
  slug: string;
  ad: string; // kısa ad: "CPM"
  baslik: string; // H1
  soru: string; // kart başlığı (soru biçiminde)
  ozet: string; // kart alt metni / meta description
  k: number;
  a: FieldDef;
  b: FieldDef;
  x: FieldDef;
  formul: string;
  neden: string;
  varsayimlar: string[];
  kaynak: string;
  terimler: string[]; // sözlük slug'ları
};

export type PacingTool = {
  tip: "pacing";
  slug: "pacing";
  ad: string;
  baslik: string;
  soru: string;
  ozet: string;
  formul: string;
  neden: string;
  varsayimlar: string[];
  kaynak: string;
  terimler: string[];
};

export type CalcTool = RatioTool | PacingTool;

const IAB = "IAB / MRC standart metrik tanımları";
const MALIYET: FieldDef = { label: "Maliyet", kind: "para", kisa: "maliyet", ipucu: "Harcanan toplam tutar" };
const IMP: FieldDef = { label: "Impression", kind: "adet", kisa: "impression", ipucu: "Toplam gösterim sayısı" };

export const TOOLS: CalcTool[] = [
  {
    tip: "oran",
    slug: "cpm",
    ad: "CPM",
    baslik: "CPM Hesapla",
    soru: "Bin gösterim kaça geldi?",
    ozet: "Maliyet, impression ve CPM — ikisini gir, üçüncüsü çıksın. Bütçeden impression, impression'dan bütçe.",
    k: 1000,
    a: { ...MALIYET, label: "Maliyet / Bütçe" },
    b: IMP,
    x: { label: "CPM", kind: "para", kisa: "CPM", ipucu: "Bin gösterim başına maliyet" },
    formul: "CPM = (maliyet / impression) × 1000",
    neden:
      "CPM, farklı büyüklükteki kampanyaları aynı cetvelle ölçmenin yolu. Bin gösterim başına fiyat olduğu için 10 bin TL'lik test ile 2 milyon TL'lik flight'ı yan yana koyabilirsin. Ters yönde de çalışır: bütçe ve CPM'i bilen impression'ı, impression ve CPM'i bilen bütçeyi bulur.",
    varsayimlar: [
      "Maliyet net mi brüt mü, sen ne girdiysen o. Ajans/teknoloji fee'si dahilse CPM de fee'li çıkar.",
      "Impression = sunulan (served) gösterim. Görülebilir gösterim üzerinden fiyat için vCPM aracını kullan.",
    ],
    kaynak: IAB,
    terimler: ["ecpm", "vcpm", "impression"],
  },
  {
    tip: "oran",
    slug: "ecpm",
    ad: "eCPM",
    baslik: "eCPM Hesapla",
    soru: "Farklı modelleri aynı cetvelle nasıl ölçerim?",
    ozet: "CPC, CPA, flat fee — ne ile aldıysan, toplam tutarı bin gösterime indir.",
    k: 1000,
    a: { label: "Toplam gelir veya maliyet", kind: "para", kisa: "tutar", ipucu: "Satın alma modelinden bağımsız toplam" },
    b: IMP,
    x: { label: "eCPM", kind: "para", kisa: "eCPM", ipucu: "Efektif bin gösterim maliyeti/geliri" },
    formul: "eCPM = (toplam gelir veya maliyet / toplam impression) × 1000",
    neden:
      "eCPM (efektif CPM), CPC ya da CPA ile satın alınmış bir kampanyanın 'CPM ile alsaydım kaça gelirdi' karşılığıdır. Yayıncı tarafında aynı formül gelirle çalışır: hangi demand kaynağı bin gösterim başına daha çok kazandırıyor?",
    varsayimlar: [
      "Formül CPM ile aynı; fark, girilen tutarın hangi satın alma modelinden geldiği.",
      "Yayıncı tarafında tutar = gelir, alıcı tarafında tutar = maliyet.",
    ],
    kaynak: IAB,
    terimler: ["ecpm", "cpm"],
  },
  {
    tip: "oran",
    slug: "ctr",
    ad: "CTR",
    baslik: "CTR Hesapla",
    soru: "Gösterilenlerin kaçı tıkladı?",
    ozet: "Klik ve impression'dan tıklama oranı. Hedef CTR'den gereken klik ya da impression.",
    k: 100,
    a: { label: "Klik", kind: "adet", kisa: "klik" },
    b: IMP,
    x: { label: "CTR", kind: "yuzde", kisa: "CTR" },
    formul: "CTR = klik / impression × 100",
    neden:
      "CTR kreatifin ve hedeflemenin ilk sinyalidir ama tek başına başarı ölçütü değil: düşük CTR'li bir branding kampanyası işini yapıyor olabilir, yüksek CTR'li bir display kampanyası yanlış tıklamalarla şişmiş olabilir.",
    varsayimlar: [
      "Klik = DSP / ad server'ın saydığı klik. Site analitiğindeki oturumla birebir tutmaz, tutması da beklenmez.",
    ],
    kaynak: IAB,
    terimler: ["ctr", "cpc"],
  },
  {
    tip: "oran",
    slug: "cpc",
    ad: "CPC",
    baslik: "CPC Hesapla",
    soru: "Bir tık kaça geldi?",
    ozet: "Maliyet ve klikten tık başı maliyet. Hedef CPC'den gereken bütçe.",
    k: 1,
    a: MALIYET,
    b: { label: "Klik", kind: "adet", kisa: "klik" },
    x: { label: "CPC", kind: "para", kisa: "CPC", ipucu: "Tık başına maliyet" },
    formul: "CPC = maliyet / klik",
    neden:
      "CPM ile satın alınan bir kampanyada CPC dolaylı bir sonuçtur: CPC = CPM / (CTR × 10). Yani CPC'yi düşürmenin iki yolu var — daha ucuza gösterim almak ya da daha çok tıklatmak.",
    varsayimlar: ["Maliyet içinde fee varsa CPC de fee'li çıkar."],
    kaynak: IAB,
    terimler: ["cpc", "ctr", "cpm"],
  },
  {
    tip: "oran",
    slug: "cpv",
    ad: "CPV",
    baslik: "CPV Hesapla",
    soru: "Bir izlenme kaça geldi?",
    ozet: "Video kampanyasında maliyet ve izlenmeden izlenme başı maliyet.",
    k: 1,
    a: MALIYET,
    b: { label: "İzlenme", kind: "adet", kisa: "izlenme", ipucu: "Platformun 'view' tanımına göre" },
    x: { label: "CPV", kind: "para", kisa: "CPV" },
    formul: "CPV = maliyet / izlenme",
    neden:
      "CPV'nin anlamı 'izlenme'yi kimin nasıl tanımladığına bağlı: YouTube'da 30 saniye (veya daha kısaysa tamamı) ya da etkileşim, başka platformlarda 2 ya da 3 saniye olabilir. Platformlar arası CPV karşılaştırırken önce tanımı karşılaştır.",
    varsayimlar: ["İzlenme tanımı platforma göre değişir; tek bir sektör standardı yoktur."],
    kaynak: IAB,
    terimler: ["cpcv", "vtr"],
  },
  {
    tip: "oran",
    slug: "cpcv",
    ad: "CPCV",
    baslik: "CPCV Hesapla",
    soru: "Sonuna kadar izlenen video kaça geldi?",
    ozet: "Maliyet ve tamamlanan izlenmeden tamamlanmış izlenme başı maliyet.",
    k: 1,
    a: MALIYET,
    b: { label: "Tamamlanan izlenme", kind: "adet", kisa: "tamamlanan", ipucu: "VAST 'complete' olayı" },
    x: { label: "CPCV", kind: "para", kisa: "CPCV" },
    formul: "CPCV = maliyet / tamamlanan izlenme",
    neden:
      "CPCV, video kampanyasında 'mesaj sonuna kadar ulaştı mı' sorusunun para karşılığıdır. CPM ile alınmış bir kampanyada CPCV = CPM / (VCR × 10); yani tamamlanma oranı düştükçe aynı CPM'le CPCV yükselir.",
    varsayimlar: ["Tamamlanma = VAST 'complete' olayı (%100 izlenme)."],
    kaynak: IAB,
    terimler: ["cpcv", "vcr", "vast"],
  },
  {
    tip: "oran",
    slug: "vtr",
    ad: "VTR / VCR",
    baslik: "VTR / VCR Hesapla",
    soru: "Videoyu izleyen oldu mu?",
    ozet: "İzlenme (VTR) ya da tamamlanma (VCR) oranı — impression'a oranla.",
    k: 100,
    a: { label: "İzlenme veya tamamlanan izlenme", kind: "adet", kisa: "izlenme" },
    b: IMP,
    x: { label: "VTR / VCR", kind: "yuzde", kisa: "oran" },
    formul: "VTR = izlenme / impression × 100   ·   VCR = tamamlanan izlenme / impression × 100",
    neden:
      "İzlenme sayısını girersen VTR, tamamlanan izlenme sayısını girersen VCR çıkar. Formül aynı, pay farklı. Skip edilebilir formatlarda VTR, skip edilemeyenlerde VCR daha anlamlıdır — zorla izletilen videonun tamamlanma oranı yüksek olur, bu bir başarı değil bir özelliktir.",
    varsayimlar: [
      "Payda impression (başlatılan video değil). Bazı DSP'ler 'video start' bazlı oran verir; o zaman sonuç farklı çıkar.",
    ],
    kaynak: IAB,
    terimler: ["vtr", "vcr"],
  },
  {
    tip: "oran",
    slug: "viewability",
    ad: "Viewability",
    baslik: "Viewability Hesapla",
    soru: "Gösterdiğin reklamı gören oldu mu?",
    ozet: "Görülebilir ve ölçülen impression'dan görülebilirlik oranı.",
    k: 100,
    a: { label: "Görülebilir impression", kind: "adet", kisa: "görülebilir" },
    b: { label: "Ölçülen impression", kind: "adet", kisa: "ölçülen", ipucu: "Ölçüm tag'inin çalıştığı impression" },
    x: { label: "Viewability", kind: "yuzde", kisa: "viewability" },
    formul: "Viewability = görülebilir impression / ölçülen impression × 100",
    neden:
      "MRC standardına göre display'de reklamın piksellerinin en az %50'si en az 1 saniye, videoda %50'si en az 2 saniye ekranda olmalı. Payda tüm impression değil, ölçülebilen impression'dır — ölçülemeyen kısım ayrıca 'measurability' olarak takip edilir.",
    varsayimlar: [
      "MRC eşikleri: display %50 piksel / 1 sn · video %50 piksel / 2 sn · büyük formatlar (≥242.500 piksel) %30 piksel / 1 sn.",
      "Payda ölçülen impression; ölçülemeyen impression hesaba girmez.",
    ],
    kaynak: "MRC Viewable Ad Impression Measurement Guidelines",
    terimler: ["viewability", "mrc-standardi", "vcpm"],
  },
  {
    tip: "oran",
    slug: "vcpm",
    ad: "vCPM",
    baslik: "vCPM Hesapla",
    soru: "Görülen bin gösterim kaça geldi?",
    ozet: "Maliyet ve görülebilir impression'dan görülebilir bin gösterim maliyeti.",
    k: 1000,
    a: MALIYET,
    b: { label: "Görülebilir impression", kind: "adet", kisa: "görülebilir" },
    x: { label: "vCPM", kind: "para", kisa: "vCPM" },
    formul: "vCPM = (maliyet / görülebilir impression) × 1000",
    neden:
      "Ucuz CPM'in bir kısmı kimsenin görmediği gösterimlerden gelir. vCPM bunu ortaya çıkarır: CPM = vCPM × viewability. %40 viewability ile 20 TL CPM, aslında 50 TL vCPM demek.",
    varsayimlar: ["Görülebilirlik MRC standardına göre ölçülmüş kabul edilir."],
    kaynak: IAB,
    terimler: ["vcpm", "viewability", "cpm"],
  },
  {
    tip: "oran",
    slug: "cpa",
    ad: "CPA",
    baslik: "CPA Hesapla",
    soru: "Bir dönüşüm kaça mal oldu?",
    ozet: "Maliyet ve dönüşümden edinme başı maliyet. Hedef CPA'dan karşılanabilir bütçe.",
    k: 1,
    a: MALIYET,
    b: { label: "Dönüşüm", kind: "adet", kisa: "dönüşüm" },
    x: { label: "CPA", kind: "para", kisa: "CPA" },
    formul: "CPA = maliyet / dönüşüm",
    neden:
      "CPA'nın değeri, dönüşümün nasıl sayıldığına bağlı: post-click mi post-view mi, hangi attribution penceresi, hangi model. Aynı kampanya iki farklı ayarla iki farklı CPA verir; raporda pencereyi yazmadan CPA paylaşmak eksik bilgidir.",
    varsayimlar: ["Dönüşüm sayısı attribution ayarlarına (pencere, post-view dahil mi) bağlıdır."],
    kaynak: IAB,
    terimler: ["cpa", "attribution", "roas"],
  },
  {
    tip: "pacing",
    slug: "pacing",
    ad: "Pacing",
    baslik: "Pacing Hesapla",
    soru: "Bütçe zamanında biter mi?",
    ozet: "Toplam bütçe, gün sayısı ve harcamadan pacing sapması, kalan günlük harcama ve dönem sonu projeksiyonu.",
    formul: "harcanması gereken = toplam bütçe × (geçen gün / toplam gün)  →  sapma % = (harcanan / harcanması gereken − 1) × 100",
    neden:
      "Pacing, flight'ın ortasında 'bu gidişle bütçe biter mi, artar mı' sorusunun cevabı. Geride kalan kampanya son hafta envanter kalitesinden ödün vererek yetişmeye çalışır; önde giden kampanya flight bitmeden kurur.",
    varsayimlar: [
      "Doğrusal dağıtım: her gün eşit harcama beklenir.",
      "±%5 sapma 'yolunda' kabul edilir.",
      "Projeksiyon, bugüne kadarki ortalama günlük hızın aynen süreceğini varsayar.",
    ],
    kaynak: "Doğrusal pacing — DSP'lerde 'even' dağıtım ayarının karşılığı",
    terimler: ["pacing", "flight"],
  },
];

export function getTool(slug: string): CalcTool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
