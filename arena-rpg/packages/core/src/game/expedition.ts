import { sha256 } from '@noble/hashes/sha2.js';
import { utf8 } from '../encoding';

/**
 * Sefer zones (rev4). The fights themselves live in `monsters.ts` (five creatures per zone,
 * instant results). Timed, slot-based expeditions were replaced by Keşif (`exploration.ts`).
 */
export interface Zone {
  id: string;
  name: string;
  minLevel: number;
}

export const ZONES: Record<string, Zone> = {
  dark_forest: { id: 'dark_forest', name: 'Karanlık Orman', minLevel: 1 },
  misty_marsh: { id: 'misty_marsh', name: 'Sisli Bataklık', minLevel: 13 },
  abandoned_mines: { id: 'abandoned_mines', name: 'Terk Edilmiş Madenler', minLevel: 33 },
  lost_lands: { id: 'lost_lands', name: 'Kayıp Diyarlar', minLevel: 58 },
};

/** Daily prophecy (Seer): deterministic per server day + secret; fights there pay extra gold. */
export function prophecyZone(dayKey: string, serverSecret: string): string {
  const ids = Object.keys(ZONES);
  const h = sha256(utf8.encode(`${serverSecret}:prophecy:${dayKey}`));
  return ids[h[0]! % ids.length]!;
}

export function highestScoutLevel(fighters: { class: string; level: number }[]): number {
  return fighters.filter((f) => f.class === 'scout').reduce((m, f) => Math.max(m, f.level), 0);
}
