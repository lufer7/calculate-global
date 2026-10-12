import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { game } from '@arena/core';

/** Symbol paths drawn on a 40×40 field (centre ≈ 20,20). */
const SYMBOLS: Record<string, string> = {
  sword: 'M20 6 L23 9 L23 25 L27 25 L27 28 L22 28 L22 33 L18 33 L18 28 L13 28 L13 25 L17 25 L17 9 Z',
  shield: 'M20 7 L31 11 L31 20 C31 27 26 31 20 34 C14 31 9 27 9 20 L9 11 Z',
  star: 'M20 6 L23.5 15.5 L33.5 15.8 L25.6 22 L28.4 31.8 L20 26 L11.6 31.8 L14.4 22 L6.5 15.8 L16.5 15.5 Z',
  wolf: 'M10 10 L16 16 L24 16 L30 10 L30 22 L26 30 L20 33 L14 30 L10 22 Z M15 21 L18 22 L15 23 Z M25 21 L22 22 L25 23 Z',
  tower: 'M11 9 L15 9 L15 12 L18 12 L18 9 L22 9 L22 12 L25 12 L25 9 L29 9 L29 16 L27 16 L27 33 L13 33 L13 16 L11 16 Z',
  crown: 'M8 28 L10 12 L16 20 L20 9 L24 20 L30 12 L32 28 Z',
  moon: 'M24 7 C16 9 12 15 12 21 C12 27 17 33 25 33 C19 30 17 26 17 20 C17 14 20 10 24 7 Z',
  axe: 'M19 6 L21 6 L21 34 L19 34 Z M21 9 C29 9 32 14 32 19 C27 18 24 20 21 22 Z',
};

/** A clan banner: swallow-tailed flag in the clan colour with its symbol. */
export function Banner({ color = 0, symbol = 0, size = 64 }: { color?: number; symbol?: number; size?: number }) {
  const fill = game.EMBLEM_COLORS[color] ?? game.EMBLEM_COLORS[0]!;
  const sym = SYMBOLS[game.EMBLEM_SYMBOLS[symbol] ?? 'sword']!;
  const id = `bn-${color}`;
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 1.3 }}>
      <Svg pointerEvents="none" width={size} height={size * 1.3} viewBox="0 0 40 52">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fill} stopOpacity={1} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        <Rect x={1} y={0.5} width={38} height={3} rx={1.5} fill="#7d6739" />
        <Circle cx={1.5} cy={2} r={1.6} fill="#c9a55c" />
        <Circle cx={38.5} cy={2} r={1.6} fill="#c9a55c" />
        <Path d="M3 3 L37 3 L37 50 L20 42 L3 50 Z" fill={fill} />
        <Path d="M3 3 L37 3 L37 50 L20 42 L3 50 Z" fill={`url(#${id})`} />
        <Path d="M5 5 L35 5 L35 46.5 L20 39.5 L5 46.5 Z" fill="none" stroke="#e8cc85" strokeWidth={0.8} opacity={0.8} />
        <Path d={sym} fill="#f2e6cc" stroke="#00000060" strokeWidth={0.6} transform="translate(0,1)" />
      </Svg>
    </View>
  );
}

export const SYMBOL_NAMES: Record<string, string> = { sword: 'Kılıç', shield: 'Kalkan', star: 'Yıldız', wolf: 'Kurt', tower: 'Kule', crown: 'Taç', moon: 'Hilal', axe: 'Balta' };
