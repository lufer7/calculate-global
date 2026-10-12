import type { game } from '@arena/core';

export const tr = {
  classes: {
    scout: { name: 'Gözcü', tagline: 'Keşif ve bilgi', blurb: 'Hızlı, kritik vuran, kaçan. Karanlık ormanların yollarını en iyi o bilir.' },
    swordmaster: { name: 'Kılıç Ustası', tagline: 'Savaş ve yağma', blurb: 'Ağır zırh, yüksek hasar. Çetenin kalkanı, arenanın gözdesi.' },
    seer: { name: 'Müneccim', tagline: 'Zaman, kehanet ve büyü', blurb: 'Yıldızları okur, lanet eder, iksir kaynatır. Zamanı bükmeyi bilir.' },
  } satisfies Record<game.ClassId, { name: string; tagline: string; blurb: string }>,
  status: { idle: 'Hazır', expedition: 'Seferde', injured: 'Yaralı', arena: 'Arenada' } as Record<string, string>,
  tiers: { nothing: 'Eli boş', common: 'Sıradan', rare: 'Nadir', epic: 'Destansı', legendary: 'Efsanevi' } as Record<string, string>,
  events: {
    none: 'Yol sakin geçti.',
    ambush: 'Pusuya düşürüldüler!',
    trap: 'Bir tuzağa yakalandılar.',
    cursed_chest: 'Lanetli bir sandık açtılar; ganimetin yarısı kül oldu.',
    merchant: 'Gezgin bir tüccarla iyi bir pazarlık yaptılar.',
    lost_treasure: 'Kayıp bir hazine buldular!',
  } as Record<string, string>,
  errors: {
    network: 'Sunucuya ulaşılamadı. Sunucunun açık ve telefonla aynı ağda olduğundan emin ol.',
    invalid_email: 'Geçerli bir e-posta adresi gir.',
    weak_password: 'Şifre en az 10 karakter olmalı.',
    legal_acceptance_required: 'Devam etmek için iki onay kutusunu da işaretlemelisin.',
    outdated_legal_version: 'Metinler güncellenmiş. Uygulamayı yeniden başlat.',
    invalid_code: 'Kod hatalı veya süresi dolmuş.',
    invalid_credentials: 'E-posta veya şifre hatalı.',
    not_verified: 'Önce e-postana gelen kodla hesabını doğrula.',
    banned: 'Hesabın yasaklandı.',
    rate_limited: 'Çok fazla deneme yaptın. Bir dakika bekle.',
    invalid_name: 'Ad 3-16 karakter olmalı; harf, rakam ve tek boşluk kullanabilirsin.',
    invalid_class: 'Bir sınıf seç.',
    no_fighter_slot: 'Yeni dövüşçü hakkın yok. Hesap seviyen 10, 25, 45 ve 70 olduğunda yeni hak açılır.',
    not_enough_points: 'Yeterli yetenek puanın yok.',
    tier_locked: 'Bu kademe henüz kilitli. Önce bu dala daha fazla puan harca.',
    max_rank: 'Bu yetenek en yüksek rütbede.',
    wrong_class: 'Bu yetenek başka bir sınıfa ait.',
    cooldown: 'Puan sıfırlama için 24 saat beklemelisin.',
    potion_required: 'Puan sıfırlamak için Unutma İksiri gerekiyor.',
    fighter_busy: 'Seçilen dövüşçülerden biri meşgul.',
    no_free_slot: 'Boş sefer slotun yok.',
    hidden_zone: 'Bu bölgeye yalnızca Kayıp Diyarlar ustalığına sahip bir Gözcü girebilir.',
    empty_party: 'En az bir dövüşçü seç.',
    busy: 'Kafa Kazanı şu an meşgul.',
    max_level: 'En yüksek seviyeye ulaşıldı.',
    not_enough_gold: 'Yeterli altının yok.',
    unauthorized: 'Oturumun sona erdi, tekrar giriş yap.',
    inventory_full: 'Çanta dolu. Bir şeyler sat ya da kullan.',
    sold_out: 'Bu tezgâh boşaldı. Bir sonraki saati bekle.',
    level_too_low: 'Bu eşya için seviyen yetersiz.',
    not_equipment: 'Bu bir ekipman değil.',
    wrong_slot: 'Bu eşya o yuvaya takılmaz.',
    equipped: 'Önce eşyayı çıkar.',
    max_upgrade: 'Eşya en yüksek güçlendirmede.',
    hp_full: 'Canı zaten dolu.',
    not_injured: 'Bu dövüşçü yaralı değil.',
    no_active_expedition: 'Yolda bir sefer yok.',
    use_when_sending: 'Şans İksiri sefer gönderirken kullanılır.',
    not_usable: 'Bu eşya kullanılamaz.',
    arena_cooldown: 'Dövüşçü dinleniyor; biraz sonra tekrar dene.',
    too_weak: 'Dövüşçünün canı çok düşük. Önce bir şeyler yesin.',
    rank_too_low: 'Bu tarif için İksir Yapımı rütben yetersiz.',
    missing_resources: 'Malzemeler eksik.',
    no_luck_potion: 'Şans İksirin yok.',
    age_confirmation_required: 'Kayıt için yaş onayı gerekiyor.',
    email_taken: 'Bu e-posta başka bir hesapta kullanılıyor.',
    message_required: 'Başvurunu birkaç kelimeyle açıkla.',
    too_many_open_requests: 'Yanıt bekleyen 3 başvurun var. Önce onların yanıtlanmasını bekle.',
  } as Record<string, string>,
  tips: [
    'Gözcüler seferlerden daha hızlı döner. Ana sınıfın Gözcü ise bu avantaj bütün dövüşçülerine geçer.',
    'Bir dövüşçü aynı anda tek işte olabilir: hazır, seferde ya da yaralı.',
    'Arenada kaybeden dövüşçünün canı azalır. Salı Pazarı\'ndan yiyecek alıp canını doldurabilirsin.',
    'Pazarın tezgâhları her saat yenilenir; kaçırdığın bir eşya bir sonraki saatte gelmeyebilir.',
    'Demirci her eşyayı +10\'a kadar güçlendirir. Kılıç Ustası ana sınıfı bu işi ucuzlatır.',
    'Avcılık bilen Gözcüler deri, kemik ve av eti toplar; Müneccimler bunlardan iksir kaynatır.',
    'Yetenek puanların kısıtlı. 100. seviyede bile en fazla iki dalı doldurabilirsin.',
    'Müneccimler her gün şanslı bölgeyi görür. Oraya giden seferler daha fazla ganimetle döner.',
    'Seferi geri çağırırsan dövüşçüler geldikleri kadar yol yürür ve eli boş döner.',
    'Kafa Kazanı\'nda Keşif Lojistiği araştırarak aynı anda daha çok sefer gönderebilirsin.',
    'Hesap seviyen 10, 25, 45 ve 70 olduğunda yeni dövüşçü hakkı açılır.',
    'Geride kalan dövüşçüler, takımın en güçlüsüne yaklaşana dek %50 fazla deneyim kazanır.',
  ],
  error(code: string): string {
    return this.errors[code] ?? 'Bir şeyler ters gitti. Tekrar dene.';
  },
};

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk ${sec} sn`;
  return `${sec} sn`;
}
