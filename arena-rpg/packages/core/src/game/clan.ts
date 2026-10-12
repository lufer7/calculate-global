import type { BattlerInput } from './battle';
import { fight } from './battle';
import type { Rarity } from './gear';
import { ZERO_STATS } from './gear';

/**
 * Sancak: player clans. Deliberately WITHOUT chat or free text beyond a moderated
 * name and tag. Players cooperate through mechanics: a shared boss raid, helping each
 * other's research/expeditions/keşif, donations that level the banner up.
 */
export const CLAN = {
  createCost: 500,
  nameMin: 3,
  nameMax: 20,
  baseMembers: 10,
  membersPerLevel: 2,
  maxMembers: 30,
  maxLevel: 10,
  /** After leaving, joining another banner waits this long (stops boss-reward hopping). */
  rejoinCooldownMs: 60 * 60_000,
  helpCut: 0.05,
  maxHelpsPerTarget: 10,
  helpXp: 2,
  donationGoldPerXp: 10,
  raidDurationMs: 24 * 60 * 60_000,
  raidCooldownMs: 60 * 60_000,
  raidMinHp: 0.15,
  raidRounds: 12,
} as const;

export const EMBLEM_COLORS = ['#8c2f2a', '#2c4f7c', '#2f6b3d', '#6b4a8c', '#a3762a', '#3c3c44', '#7c2c5a', '#2a6b6b'];
export const EMBLEM_SYMBOLS = ['sword', 'shield', 'star', 'wolf', 'tower', 'crown', 'moon', 'axe'] as const;
export const JOIN_POLICIES = ['open', 'request'] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];
export type ClanRole = 'leader' | 'officer' | 'member';

/** Cumulative clan XP needed for level 1..10. */
const LEVEL_XP = [0, 100, 300, 700, 1400, 2500, 4200, 6800, 10500, 16000];

export function clanLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  return Math.min(CLAN.maxLevel, level);
}

export function clanXpForLevel(level: number): number {
  return LEVEL_XP[Math.min(CLAN.maxLevel, Math.max(1, level)) - 1]!;
}

export function clanMaxMembers(level: number): number {
  return Math.min(CLAN.maxMembers, CLAN.baseMembers + (level - 1) * CLAN.membersPerLevel);
}

/** Banner bonus: +1% gold from expeditions and keşif per clan level. */
export const clanGoldBonus = (level: number) => Math.min(CLAN.maxLevel, level) * 0.01;

// ------------------------------------------------------------------ names (moderated user content)

const BLOCKED = [
  'amk', 'aq', 'orospu', 'oç', 'piç', 'sik', 'yarrak', 'göt', 'pezevenk', 'kahpe', 'ibne', 'gavat', 'şerefsiz', 'ananı', 'anan',
  'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'nazi', 'hitler', 'isis', 'pkk', 'feto', 'fetö', 'admin', 'moderator', 'yönetici', 'aegis',
];

const fold = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]/g, '')
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');

export type ClanNameError = 'name_length' | 'name_chars' | 'name_blocked' | 'tag_invalid' | 'tag_blocked';

export function normalizeClanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Key used for uniqueness: case/space/diacritic-insensitive. */
export const clanNameKey = (name: string) => fold(name);

export function validateClanName(name: string): ClanNameError | null {
  if (name.length < CLAN.nameMin || name.length > CLAN.nameMax) return 'name_length';
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+$/.test(name)) return 'name_chars';
  const f = fold(name);
  if (BLOCKED.some((w) => (w.length <= 3 ? f === w || name.toLocaleLowerCase('tr-TR').split(' ').includes(w) : f.includes(fold(w))))) return 'name_blocked';
  return null;
}

export function validateClanTag(tag: string): ClanNameError | null {
  if (!/^[A-ZÇĞİÖŞÜ]{2,4}$/.test(tag)) return 'tag_invalid';
  const f = fold(tag);
  if (BLOCKED.some((w) => fold(w) === f)) return 'tag_blocked';
  return null;
}

// ------------------------------------------------------------------ boss raid

export interface RaidBoss {
  id: string;
  name: string;
  /** Clan level needed to summon it. */
  clanLevel: number;
  level: number;
  hp: number;
  gold: number;
  clanXp: number;
  rarity: Record<Rarity, number>;
}

export const RAID_BOSSES: RaidBoss[] = [
  { id: 'wolf_king', name: 'Kurtların Kralı', clanLevel: 1, level: 8, hp: 3_000, gold: 400, clanXp: 80, rarity: { common: 0, uncommon: 60, rare: 32, epic: 7, legendary: 1 } },
  { id: 'marsh_witch', name: 'Sis Cadısı', clanLevel: 3, level: 22, hp: 14_000, gold: 1_200, clanXp: 200, rarity: { common: 0, uncommon: 45, rare: 38, epic: 14, legendary: 3 } },
  { id: 'stone_golem', name: 'Taş Golem', clanLevel: 5, level: 40, hp: 45_000, gold: 3_000, clanXp: 450, rarity: { common: 0, uncommon: 30, rare: 42, epic: 22, legendary: 6 } },
  { id: 'bone_drake', name: 'Kemik Ejder', clanLevel: 7, level: 60, hp: 120_000, gold: 7_000, clanXp: 900, rarity: { common: 0, uncommon: 15, rare: 45, epic: 30, legendary: 10 } },
  { id: 'warden', name: 'Diyarın Bekçisi', clanLevel: 9, level: 80, hp: 300_000, gold: 15_000, clanXp: 1_800, rarity: { common: 0, uncommon: 0, rare: 45, epic: 40, legendary: 15 } },
];

export const RAID_BOSSES_BY_ID = new Map(RAID_BOSSES.map((b) => [b.id, b]));

/** The boss as a battler: it never falls in one skirmish, so we measure how much damage it takes. */
export function bossBattler(boss: RaidBoss): BattlerInput {
  return { name: boss.name, class: 'swordmaster', level: boss.level, skills: {}, gear: { ...ZERO_STATS, hp: 1_000_000, armor: boss.level * 1.5, damage: boss.level * 0.6 } };
}

export interface RaidHit {
  damage: number;
  /** Attacker health afterwards (0..1). */
  hpRatio: number;
  rounds: number;
}

/** One skirmish against the boss (deterministic per seed). */
export function raidHit(attacker: BattlerInput, boss: RaidBoss, seed: number): RaidHit {
  const o = fight(attacker, bossBattler(boss), seed, { maxRounds: CLAN.raidRounds });
  return {
    damage: Math.max(1, o.startHp.b - o.hp.b),
    hpRatio: Math.max(0.05, o.hp.a / o.maxHp.a),
    rounds: o.rounds,
  };
}

/** Each participant: a fixed share plus a share by damage. */
export function raidGold(boss: RaidBoss, damage: number, totalDamage: number, participants: number): number {
  const share = totalDamage > 0 ? damage / totalDamage : 0;
  return Math.round((boss.gold * 0.4) / Math.max(1, participants) + boss.gold * 0.6 * share + boss.gold * 0.1);
}
