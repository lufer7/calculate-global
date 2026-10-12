import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { game } from '@arena/core';
import { classColor } from '../screens/theme';

/** Class busts drawn as soft-lit silhouettes – placeholders for illustrated portraits. */
export function Portrait({ cls, size = 64, hpRatio, injured }: { cls: game.ClassId; size?: number; hpRatio?: number; injured?: boolean }) {
  const c = classColor(cls);
  return (
    <View style={{ width: size, height: size * 1.2, borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: c }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 120">
        <Defs>
          <RadialGradient id={`pb-${cls}`} cx="50%" cy="35%" r="70%">
            <Stop offset="0" stopColor={c} stopOpacity={0.55} />
            <Stop offset="1" stopColor="#0d1215" stopOpacity={1} />
          </RadialGradient>
          <LinearGradient id="pskin" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#d9a77f" />
            <Stop offset="1" stopColor="#8a5a3c" />
          </LinearGradient>
          <LinearGradient id="pmetal" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#e6ebee" />
            <Stop offset="0.5" stopColor="#9aa6ad" />
            <Stop offset="1" stopColor="#4e5a62" />
          </LinearGradient>
        </Defs>
        <Rect width={100} height={120} fill={`url(#pb-${cls})`} />
        {cls === 'scout' && (
          <G>
            <Path d="M10 120 Q14 82 50 76 Q86 82 90 120 Z" fill="#3f5a36" />
            <Path d="M22 78 Q18 30 50 18 Q82 30 78 78 Q66 70 50 70 Q34 70 22 78 Z" fill="#4c6b40" />
            <Path d="M34 70 Q32 42 50 38 Q68 42 66 70 Q58 76 50 76 Q42 76 34 70 Z" fill="url(#pskin)" />
            <Path d="M30 54 Q34 30 50 28 Q66 30 70 54 Q62 42 50 42 Q38 42 30 54 Z" fill="#2c3f26" />
            <Path d="M40 58 L46 57 M54 57 L60 58" stroke="#2a1a10" strokeWidth={2} />
            <Path d="M70 120 L88 40" stroke="#6a4a2a" strokeWidth={3} />
            <Path d="M86 44 L92 32 M84 46 L80 34" stroke="#c0503f" strokeWidth={2} />
          </G>
        )}
        {cls === 'swordmaster' && (
          <G>
            <Path d="M6 120 Q8 84 50 78 Q92 84 94 120 Z" fill="url(#pmetal)" />
            <Path d="M20 92 Q50 82 80 92" stroke="#4e5a62" strokeWidth={2} fill="none" />
            <Path d="M28 74 Q26 26 50 20 Q74 26 72 74 Z" fill="url(#pmetal)" />
            <Rect x={47} y={14} width={6} height={52} fill="#b8433a" />
            <Path d="M34 50 L66 50 L66 56 L54 56 L54 70 L46 70 L46 56 L34 56 Z" fill="#0d1215" />
            <Path d="M82 120 L82 60 M74 70 L90 70" stroke="#cfd6da" strokeWidth={4} />
          </G>
        )}
        {cls === 'seer' && (
          <G>
            <Path d="M8 120 Q12 80 50 74 Q88 80 92 120 Z" fill="#3e3a72" />
            <Path d="M50 74 L50 120" stroke="#c9a55c" strokeWidth={3} />
            <Path d="M24 80 Q20 34 50 10 Q80 34 76 80 Q64 72 50 72 Q36 72 24 80 Z" fill="#4a4590" />
            <Path d="M36 72 Q34 46 50 42 Q66 46 64 72 Q58 78 50 78 Q42 78 36 72 Z" fill="url(#pskin)" />
            <Path d="M38 74 Q50 100 62 74 Q56 82 50 82 Q44 82 38 74 Z" fill="#d8d2c8" />
            <Path d="M42 60 L47 59 M53 59 L58 60" stroke="#2a1a10" strokeWidth={2} />
            <Path d="M50 22 L52 28 L58 28 L53 32 L55 38 L50 34 L45 38 L47 32 L42 28 L48 28 Z" fill="#ffd77a" />
            <Circle cx={14} cy={30} r={1.5} fill="#fff" /><Circle cx={86} cy={20} r={1.2} fill="#fff" /><Circle cx={80} cy={46} r={1} fill="#fff" />
          </G>
        )}
        {injured && <Rect width={100} height={120} fill="#5a0a0a" opacity={0.35} />}
        {hpRatio !== undefined && (
          <G>
            <Rect x={0} y={112} width={100} height={8} fill="#0a0d0e" />
            <Rect x={0} y={112} width={100 * Math.max(0, Math.min(1, hpRatio))} height={8} fill="#b8433a" />
          </G>
        )}
      </Svg>
    </View>
  );
}
