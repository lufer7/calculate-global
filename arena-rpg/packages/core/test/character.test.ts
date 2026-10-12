import { describe, expect, it } from 'vitest';
import { createCharacter, gainXp, statBudget, sumStats } from '../src/index';
import { NOW, random } from './helpers';

const valid = { name: '  Demir   Yürek ', origin: 'dockhand' as const, allocation: { strength: 4, vitality: 4, agility: 2 } };

describe('createCharacter', () => {
  it('creates a level-1 character with origin bonus applied', () => {
    const r = createCharacter(valid, { random, now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.name).toBe('Demir Yürek');
    expect(r.value.stats).toEqual({ strength: 11, agility: 7, intellect: 5, vitality: 10, fortune: 5 });
    expect(sumStats(r.value.stats)).toBe(statBudget('dockhand', 1));
    expect(r.value.id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rejects bad names, origins and allocations', () => {
    const deps = { random, now: NOW };
    expect(createCharacter({ ...valid, name: 'ab' }, deps)).toEqual({ ok: false, error: 'invalid_name' });
    expect(createCharacter({ ...valid, name: 'x<script>' }, deps)).toEqual({ ok: false, error: 'invalid_name' });
    expect(createCharacter({ ...valid, origin: 'king' as never }, deps)).toEqual({ ok: false, error: 'invalid_origin' });
    expect(createCharacter({ ...valid, allocation: { strength: 11 } }, deps)).toEqual({ ok: false, error: 'invalid_allocation' });
    expect(createCharacter({ ...valid, allocation: { strength: 12, agility: -2 } }, deps)).toEqual({ ok: false, error: 'invalid_allocation' });
    expect(createCharacter({ ...valid, allocation: { strength: 10, luck: 0 } as never }, deps)).toEqual({ ok: false, error: 'invalid_allocation' });
  });

  it('levels up and grants stat points', () => {
    const r = createCharacter(valid, { random, now: NOW });
    if (!r.ok) throw new Error();
    const c = gainXp(r.value, 500);
    expect(c.level).toBeGreaterThan(1);
    expect(c.unspentPoints).toBe((c.level - 1) * 3);
  });
});
