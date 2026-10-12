import type { CombatantSetup } from './combat';
import { ITEM_CATALOG, SLOTS } from './items';
import type { Slot } from './items';
import { createRng } from './random';
import { BASE_STAT, CREATION_POINTS, POINTS_PER_LEVEL, STAT_KEYS, emptyStats } from './stats';

/** Procedural PvE opponent / PvP "ghost" when nobody else is in the pool. */
export function generateOpponent(level: number, seed: number): CombatantSetup {
  const rng = createRng(seed);
  const stats = emptyStats(BASE_STAT);
  const points = CREATION_POINTS + 3 + (level - 1) * POINTS_PER_LEVEL;
  for (let i = 0; i < points; i++) {
    const k = STAT_KEYS[Math.floor(rng() * STAT_KEYS.length)]!;
    stats[k] += 1;
  }
  const equipment: CombatantSetup['equipment'] = {};
  for (const slot of SLOTS) {
    const options = Object.values(ITEM_CATALOG).filter((t) => t.slot === slot && !t.cosmetic && t.requiredLevel <= level);
    if (options.length === 0 || rng() < 0.3) continue;
    const t = options[Math.floor(rng() * options.length)]!;
    equipment[slot as Slot] = { templateId: t.id, upgradeLevel: Math.min(10, Math.floor(rng() * (level / 3))) };
  }
  return { level, stats, equipment };
}
