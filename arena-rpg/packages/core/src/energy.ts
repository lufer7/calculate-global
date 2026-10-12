export interface EnergyState {
  value: number;
  /** Epoch ms of the last regen tick that was accounted for. */
  updatedAt: number;
}

export const ENERGY_MAX = 10;
export const ENERGY_REGEN_MS = 10 * 60 * 1000;

/** Device-clock based: manipulating the clock only affects the player's own offline game. */
export function currentEnergy(state: EnergyState, now: number): EnergyState {
  if (state.value >= ENERGY_MAX) return { value: state.value, updatedAt: now };
  const elapsed = Math.max(0, now - state.updatedAt);
  const ticks = Math.floor(elapsed / ENERGY_REGEN_MS);
  const value = Math.min(ENERGY_MAX, state.value + ticks);
  return { value, updatedAt: value >= ENERGY_MAX ? now : state.updatedAt + ticks * ENERGY_REGEN_MS };
}

export function spendEnergy(state: EnergyState, amount: number, now: number): EnergyState | null {
  const cur = currentEnergy(state, now);
  if (cur.value < amount) return null;
  // Spending from a full bar starts the regen timer now.
  return { value: cur.value - amount, updatedAt: cur.value >= ENERGY_MAX ? now : cur.updatedAt };
}
