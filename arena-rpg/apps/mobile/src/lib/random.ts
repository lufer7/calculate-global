import { getRandomBytes } from 'expo-crypto';
import type { RandomBytes } from '@arena/core';

/** CSPRNG from the OS (SecRandomCopyBytes / SecureRandom). */
export const random: RandomBytes = (n) => getRandomBytes(n);
