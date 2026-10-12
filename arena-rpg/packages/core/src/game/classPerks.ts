import type { ClassId } from './classes';

/**
 * Account-wide perks granted by the class of the account's FIRST fighter ("ana karakter").
 * They never come from research or skill points, and stay for the life of the account
 * even if that fighter later changes class. Values are relative bonuses (0.2 = 20%).
 */
export interface AccountPerks {
  expeditionDurationReduction: number;
  expeditionRareChanceRelative: number;
  plunderBonus: number;
  defenseGoldLossReduction: number;
  smithCostReduction: number;
  researchDurationReduction: number;
  prophecyBaseBonus: number;
  injuryDurationReduction: number;
}

const NONE: AccountPerks = {
  expeditionDurationReduction: 0,
  expeditionRareChanceRelative: 0,
  plunderBonus: 0,
  defenseGoldLossReduction: 0,
  smithCostReduction: 0,
  researchDurationReduction: 0,
  prophecyBaseBonus: 0,
  injuryDurationReduction: 0,
};

export interface MainClassPerk {
  title: string;
  lines: string[];
  perks: AccountPerks;
}

export const MAIN_CLASS_PERKS: Record<ClassId, MainClassPerk> = {
  scout: {
    title: 'Kâşifler Yolu',
    lines: ['Tüm seferler %20 daha kısa sürer', 'Seferlerde nadir ve üstü ödül şansı %30 daha yüksek (göreli)'],
    perks: { ...NONE, expeditionDurationReduction: 0.2, expeditionRareChanceRelative: 0.3 },
  },
  swordmaster: {
    title: 'Kılıç Hakkı',
    lines: [
      'Kazanılan saldırılarda %25 daha fazla altın taşınır',
      'Çetene saldırıldığında kaybedilen altın %25 azalır',
      'Demircide onarım ve güçlendirme %15 ucuz',
    ],
    perks: { ...NONE, plunderBonus: 0.25, defenseGoldLossReduction: 0.25, smithCostReduction: 0.15 },
  },
  seer: {
    title: 'Yıldız Okuru',
    lines: [
      'Kafa Kazanı araştırmaları %20 daha kısa sürer',
      'Günün kehanet bölgesi her zaman görünür; oraya giden seferlere +%10 ödül',
      'Tüm dövüşçülerin yaralanma süresi %20 kısalır',
    ],
    perks: { ...NONE, researchDurationReduction: 0.2, prophecyBaseBonus: 0.1, injuryDurationReduction: 0.2 },
  },
};

export function accountPerks(mainClass: ClassId | null | undefined): AccountPerks {
  return mainClass ? MAIN_CLASS_PERKS[mainClass].perks : NONE;
}
