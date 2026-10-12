import { describe, expect, it } from 'vitest';
import { generateOpponent, simulateBattle } from '../src/index';

describe('simulateBattle', () => {
  it('is deterministic for the same seed', () => {
    const a = generateOpponent(5, 1);
    const b = generateOpponent(5, 2);
    expect(simulateBattle(a, b, 42)).toEqual(simulateBattle(a, b, 42));
  });

  it('produces a consistent log', () => {
    const r = simulateBattle(generateOpponent(10, 3), generateOpponent(2, 4), 7);
    expect(r.winner).toBe('a');
    expect(r.log.length).toBeGreaterThan(0);
    expect(r.hp.b).toBe(0);
    for (const e of r.log) expect(e.damage).toBeGreaterThanOrEqual(0);
  });
});
