export const CLASS_IDS = ['scout', 'swordmaster', 'seer'] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export const BRANCH_IDS = {
  scout: ['exploration', 'shadow', 'hunter'],
  swordmaster: ['blade', 'shield', 'warlord'],
  seer: ['stars', 'curse', 'alchemy'],
} as const satisfies Record<ClassId, readonly string[]>;
export type BranchId = (typeof BRANCH_IDS)[ClassId][number];

export type BranchRole = 'combat' | 'signature' | 'hybrid';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  combatStyle: string;
  /** Multipliers for hp/armor/speed/magic/damage; evasion, crit and pierce (armour ignored) are flat ratios. */
  baseModifiers: { hp: number; armor: number; speed: number; evasion: number; magic: number; damage: number; crit: number; pierce: number };
  branches: Record<BranchRole, BranchId>;
}

/** Design doc §1. No class hard-counters another; identity comes from how they win. */
export const CLASSES: Record<ClassId, ClassDefinition> = {
  scout: {
    id: 'scout',
    name: 'Gözcü',
    combatStyle: 'Hız, kritik vuruş, kaçınma',
    baseModifiers: { hp: 1, armor: 0.9, speed: 1.25, evasion: 0.14, magic: 0.9, damage: 1.2, crit: 0.09, pierce: 0.4 },
    branches: { signature: 'exploration', hybrid: 'shadow', combat: 'hunter' },
  },
  swordmaster: {
    id: 'swordmaster',
    name: 'Kılıç Ustası',
    combatStyle: 'Yüksek hasar, zırh, dayanıklılık',
    baseModifiers: { hp: 1.3, armor: 1.15, speed: 0.85, evasion: 0.04, magic: 0.8, damage: 1, crit: 0.05, pierce: 0 },
    branches: { signature: 'warlord', hybrid: 'shield', combat: 'blade' },
  },
  seer: {
    id: 'seer',
    name: 'Müneccim',
    combatStyle: 'Lanet, büyü hasarı, iyileştirme',
    baseModifiers: { hp: 1.02, armor: 0.85, speed: 1, evasion: 0.06, magic: 1.05, damage: 1, crit: 0.05, pierce: 0 },
    branches: { signature: 'stars', hybrid: 'alchemy', combat: 'curse' },
  },
};

export const BRANCH_NAMES: Record<BranchId, string> = {
  exploration: 'Keşif',
  shadow: 'Gölge',
  hunter: 'Avcı',
  blade: 'Kılıç',
  shield: 'Kalkan',
  warlord: 'Savaş Ağası',
  stars: 'Yıldızlar',
  curse: 'Lanet',
  alchemy: 'Simya',
};

export function isClassId(v: unknown): v is ClassId {
  return typeof v === 'string' && (CLASS_IDS as readonly string[]).includes(v);
}

export function classOfBranch(branch: BranchId): ClassId {
  return CLASS_IDS.find((c) => (BRANCH_IDS[c] as readonly string[]).includes(branch))!;
}
