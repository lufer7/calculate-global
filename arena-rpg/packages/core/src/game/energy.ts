/**
 * Fighter energy (rev4): every fighter has its own bar so actions cannot be repeated forever.
 * 20 max, +1 every 7 minutes (a full bar in ~2 h 20 min). Rasathane research raises both.
 */
export const ENERGY = {
  max: 20,
  regenMs: 7 * 60_000,
  /** Sefer creature fight, arena fight (NPC or player), sancak raid hit. */
  fightCost: 1,
} as const;

export interface EnergyStore {
  energy: number;
  /** When `energy` was last written (server time). */
  at: number;
}

/** Lazily regenerated energy at `now` (fractional; the UI floors it). `speed` is the dev time multiplier. */
export function currentEnergy(e: EnergyStore, now: number, max: number = ENERGY.max, regenMs: number = ENERGY.regenMs, speed = 1): number {
  if (e.energy >= max) return e.energy;
  return Math.min(max, e.energy + (Math.max(0, now - e.at) * speed) / regenMs);
}

/** Time (real ms) until the next whole point. */
export function nextEnergyIn(e: EnergyStore, now: number, max: number = ENERGY.max, regenMs: number = ENERGY.regenMs, speed = 1): number | null {
  const cur = currentEnergy(e, now, max, regenMs, speed);
  if (cur >= max) return null;
  return Math.ceil(((Math.floor(cur) + 1 - cur) * regenMs) / speed);
}

/** Keşif energy: grows with the time away — 1 per started 1.5 hours (1 h → 1, 8 h → 6, 24 h → 16). */
export function explorationEnergyCost(totalMs: number): number {
  return Math.max(1, Math.ceil(totalMs / (90 * 60_000)));
}
