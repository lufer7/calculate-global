import type { CombatEvent, OriginId, StatKey } from '@arena/core';

export const tr = {
  stats: {
    strength: 'Güç',
    agility: 'Çeviklik',
    intellect: 'Zeka',
    vitality: 'Dayanıklılık',
    fortune: 'Talih',
  } satisfies Record<StatKey, string>,
  origins: {
    dockhand: { name: 'Liman Hamalı', blurb: 'Tuz ve halatla büyüdün. +2 Güç, +1 Dayanıklılık' },
    archivist: { name: 'Arşiv Çırağı', blurb: 'Tozlu raflar arasında öğrendin. +2 Zeka, +1 Talih' },
    courier: { name: 'Sur Habercisi', blurb: 'Surların üstünde koşarak yaşadın. +2 Çeviklik, +1 Dayanıklılık' },
  } satisfies Record<OriginId, { name: string; blurb: string }>,
  errors: {
    invalid_name: 'İsim 3-16 karakter olmalı; yalnızca harf, rakam ve tek boşluk.',
    invalid_origin: 'Bir köken seç.',
    invalid_allocation: 'Tüm puanları dağıtmalısın.',
  } as Record<string, string>,
  combat(e: CombatEvent, names: { a: string; b: string }): string {
    const actor = names[e.actor];
    const target = names[e.actor === 'a' ? 'b' : 'a'];
    if (e.kind === 'dodge') return `${target}, ${actor} saldırısından sıyrıldı.`;
    if (e.kind === 'crit') return `${actor} kritik vuruş! ${e.damage} hasar (${target}: ${e.targetHp} CP)`;
    return `${actor} vurdu: ${e.damage} hasar (${target}: ${e.targetHp} CP)`;
  },
};
