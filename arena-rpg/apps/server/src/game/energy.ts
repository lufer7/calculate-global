import { game } from '@arena/core';
import type { AccountRow, FighterRow } from '../accounts/repo';
import type { Db } from '../db/database';
import type { GameClock } from './settle';
import { researchOf } from './settle';

/** Rasathane effects of an account (finished research only). */
export const fxOf = (acc: Pick<AccountRow, 'research_json'>) => game.researchEffects(researchOf(acc));

export function energyRules(fx: game.ResearchEffects) {
  return { max: game.ENERGY.max + fx.energyMax, regenMs: Math.max(60_000, game.ENERGY.regenMs - fx.energyRegenCutMs) };
}

/** Resting in the Cami fills energy faster with "Derin Uyku". */
const regenFor = (f: Pick<FighterRow, 'status_kind'>, fx: game.ResearchEffects) => {
  const { regenMs } = energyRules(fx);
  return f.status_kind === 'resting' ? Math.round(regenMs / (1 + fx.restEnergy)) : regenMs;
};

export function energyOf(f: Pick<FighterRow, 'energy' | 'energy_at' | 'status_kind'>, fx: game.ResearchEffects, clock: GameClock, at = clock.now()): number {
  return game.currentEnergy({ energy: f.energy, at: f.energy_at ?? at }, at, energyRules(fx).max, regenFor(f, fx), clock.speed);
}

export function energyView(f: FighterRow, fx: game.ResearchEffects, clock: GameClock) {
  const now = clock.now();
  const { max } = energyRules(fx);
  const store = { energy: f.energy, at: f.energy_at ?? now };
  return { value: Math.floor(energyOf(f, fx, clock, now)), max, nextIn: game.nextEnergyIn(store, now, max, regenFor(f, fx), clock.speed) };
}

/** Writes the regenerated value so a rate change (rest start/end) starts from a clean point. */
export function checkpointEnergy(db: Db, f: FighterRow, fx: game.ResearchEffects, clock: GameClock, at = clock.now()) {
  db.prepare('UPDATE fighters SET energy = ?, energy_at = ? WHERE id = ?').run(energyOf(f, fx, clock, at), at, f.id);
}

/** Spends energy if there is enough; returns false otherwise. */
export function spendEnergy(db: Db, f: FighterRow, fx: game.ResearchEffects, clock: GameClock, cost: number): boolean {
  const now = clock.now();
  const cur = energyOf(f, fx, clock, now);
  if (cur < cost) return false;
  db.prepare('UPDATE fighters SET energy = ?, energy_at = ? WHERE id = ?').run(cur - cost, now, f.id);
  return true;
}
