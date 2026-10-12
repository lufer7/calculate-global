import type { Character } from './character';
import type { EnergyState } from './energy';
import { ENERGY_MAX } from './energy';
import type { ItemInstance } from './items';

export const SAVE_VERSION = 1;

export interface ActiveQuest {
  questId: string;
  startedAt: number;
  endsAt: number;
  seed: number;
}

export interface SaveGame {
  v: typeof SAVE_VERSION;
  character: Character;
  gold: number;
  inventory: ItemInstance[];
  energy: EnergyState;
  activeQuest: ActiveQuest | null;
  /** Online features are OFF until the player opts in. */
  online: {
    enabled: boolean;
    /** Random secret; the server only ever sees its hash. Rotated every season or on "reset". */
    ladderToken: string | null;
  };
  createdAt: number;
  updatedAt: number;
}

export function newSave(character: Character, now: number): SaveGame {
  return {
    v: SAVE_VERSION,
    character,
    gold: 50,
    inventory: [],
    energy: { value: ENERGY_MAX, updatedAt: now },
    activeQuest: null,
    online: { enabled: false, ladderToken: null },
    createdAt: now,
    updatedAt: now,
  };
}

export function serializeSave(save: SaveGame): string {
  return JSON.stringify(save);
}

export class SaveFormatError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Parses and migrates a save. Older versions get upgraded here as the schema evolves. */
export function parseSave(json: string): SaveGame {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SaveFormatError('not_json');
  }
  if (!isObj(data) || !isNum(data.v)) throw new SaveFormatError('bad_shape');
  if (data.v > SAVE_VERSION) throw new SaveFormatError('newer_version');
  // if (data.v === 0) data = migrateV0toV1(data);

  const c = data.character;
  if (
    !isObj(c) ||
    typeof c.name !== 'string' ||
    typeof c.origin !== 'string' ||
    !isNum(c.level) ||
    !isObj(c.stats) ||
    !isNum(data.gold) ||
    !Array.isArray(data.inventory) ||
    !isObj(data.energy) ||
    !isObj(data.online)
  ) {
    throw new SaveFormatError('bad_shape');
  }
  return data as unknown as SaveGame;
}
