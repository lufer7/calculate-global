import { describe, expect, it } from 'vitest';
import { game } from '../src';

describe('sancak', () => {
  it('validates and moderates banner names and tags', () => {
    expect(game.validateClanName('Demir Kurtlar')).toBeNull();
    expect(game.validateClanName('ab')).toBe('name_length');
    expect(game.validateClanName('Kurt<script>')).toBe('name_chars');
    expect(game.validateClanName('Orospu Çocukları')).toBe('name_blocked');
    expect(game.validateClanName('Aegis Yönetimi')).toBe('name_blocked');
    expect(game.validateClanTag('DMR')).toBeNull();
    expect(game.validateClanTag('dmr')).toBe('tag_invalid');
    expect(game.clanNameKey('Demir  Kurtlar')).toBe(game.clanNameKey('demir kurtlar'));
  });
  it('levels up, grows member cap and gold bonus', () => {
    expect(game.clanLevel(0)).toBe(1);
    expect(game.clanLevel(300)).toBe(3);
    expect(game.clanLevel(1e9)).toBe(10);
    expect(game.clanMaxMembers(1)).toBe(10);
    expect(game.clanMaxMembers(10)).toBe(28);
    expect(game.clanGoldBonus(5)).toBeCloseTo(0.05);
  });
  it('raid hits are deterministic, hurt the attacker and stronger fighters hit harder', () => {
    const boss = game.RAID_BOSSES[0]!;
    const weak = { name: 'a', class: 'swordmaster' as const, level: 5, skills: {}, gear: game.ZERO_STATS };
    const strong = { ...weak, level: 25 };
    expect(game.raidHit(weak, boss, 3)).toEqual(game.raidHit(weak, boss, 3));
    const w = game.raidHit(weak, boss, 3);
    expect(w.hpRatio).toBeLessThan(1);
    expect(game.raidHit(strong, boss, 3).damage).toBeGreaterThan(w.damage);
    const total = game.raidGold(boss, 100, 100, 1);
    expect(total).toBe(Math.round(boss.gold * 1.1));
  });
});
