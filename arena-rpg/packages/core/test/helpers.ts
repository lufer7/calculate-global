import { randomBytes } from 'node:crypto';
import type { RandomBytes } from '../src/index';

export const random: RandomBytes = (n) => new Uint8Array(randomBytes(n));
export const NOW = Date.UTC(2026, 0, 1);
