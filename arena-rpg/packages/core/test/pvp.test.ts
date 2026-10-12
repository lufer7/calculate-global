import { describe, expect, it } from 'vitest';
import {
  buildSnapshot, createCharacter, displayNameFromId, generateLadderToken, ladderIdFromToken, newSave, validateSnapshot,
} from '../src/index';
import { NOW, random } from './helpers';

const snapshot = () => {
  const r = createCharacter({ name: 'Gizli İsim', origin: 'courier', allocation: { agility: 10 } }, { random, now: NOW });
  if (!r.ok) throw new Error();
  return buildSnapshot(newSave(r.value, NOW));
};

describe('pvp snapshot', () => {
  it('contains no name or id', () => {
    const json = JSON.stringify(snapshot());
    expect(json).not.toContain('Gizli');
    expect(json).not.toContain('"id"');
  });

  it('accepts legal builds and strips unknown fields', () => {
    const r = validateSnapshot({ ...snapshot(), deviceId: 'abc' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toHaveProperty('deviceId');
  });

  it('rejects inflated stats and illegal gear', () => {
    const s = snapshot();
    expect(validateSnapshot({ ...s, stats: { ...s.stats, strength: 99 } })).toEqual({ ok: false, error: 'bad_stats' });
    expect(validateSnapshot({ ...s, equipment: { weapon: { templateId: 'quarry_maul', upgradeLevel: 0 } } })).toEqual({ ok: false, error: 'bad_item' });
    expect(validateSnapshot({ ...s, equipment: { head: { templateId: 'rusty_cleaver', upgradeLevel: 0 } } })).toEqual({ ok: false, error: 'bad_item' });
    expect(validateSnapshot({ ...s, level: 0 })).toEqual({ ok: false, error: 'bad_level' });
  });
});

describe('anonymous ladder ids', () => {
  it('derives a stable id and generated name from a random token', () => {
    const token = generateLadderToken(random);
    const id = ladderIdFromToken(token);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).toBe(ladderIdFromToken(token));
    expect(displayNameFromId(id)).toMatch(/^\S+ \S+ #\d{4}$/);
  });
});
