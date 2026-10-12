import { GAME_CONFIG } from './config';

/** Design doc §4 "Dikkat": a protected share of gold can never be plundered. */
export function plunderAmount(defenderGold: number, bonusRate = 0, lossReduction = 0): number {
  const { base_rate, protected_gold_ratio } = GAME_CONFIG.plunder;
  const exposed = Math.max(0, defenderGold * (1 - protected_gold_ratio));
  return Math.floor(exposed * Math.min(1, base_rate * (1 + bonusRate)) * (1 - lossReduction));
}

/** Level-gap protection: attacks on much weaker players are blocked or pay less. */
export function attackRewardFactor(attackerLevel: number, defenderLevel: number): number {
  const gap = attackerLevel - defenderLevel;
  if (gap <= 5) return 1;
  if (gap >= 20) return 0; // blocked
  return 1 - (gap - 5) / 15;
}

export function canAttack(attackerLevel: number, defenderLevel: number): boolean {
  return attackRewardFactor(attackerLevel, defenderLevel) > 0;
}

/** Arena never injures or costs gold; it only drains HP (restored with Salı Pazarı food). */
export const ARENA_HP_LOSS_ON_DEFEAT = 0.15;

export function hpAfterArena(hpRatio: number, won: boolean): number {
  return won ? hpRatio : Math.max(0, hpRatio - ARENA_HP_LOSS_ON_DEFEAT);
}

/** Night window in the server's timezone (never the device clock). */
export function isNight(now: number, timeZone: string = GAME_CONFIG.seer.timezone): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  const { from, to } = GAME_CONFIG.seer.night_hours;
  return hour >= from || hour < to;
}
