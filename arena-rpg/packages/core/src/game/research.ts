/** "Rasathane" – the research tab. One research at a time per account. */
export interface ResearchDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  cost: (nextLevel: number) => number;
  durationMs: (nextLevel: number) => number;
}

const MIN = 60_000;

export const RESEARCH: Record<string, ResearchDefinition> = {
  expedition_logistics: {
    id: 'expedition_logistics',
    name: 'Keşif Lojistiği',
    description: 'Aynı anda gönderilebilecek sefer sayısını artırır (Sv 2: 2 sefer, Sv 5: 3 sefer).',
    maxLevel: 5,
    cost: (lvl) => Math.round(100 * 3 ** (lvl - 1)),
    durationMs: (lvl) => Math.round(20 * MIN * lvl ** 1.6),
  },
};

export function researchDuration(def: ResearchDefinition, nextLevel: number, reductions: number[]): number {
  const factor = reductions.reduce((f, r) => f * (1 - r), 1);
  return Math.round(def.durationMs(nextLevel) * Math.max(0.4, factor));
}
