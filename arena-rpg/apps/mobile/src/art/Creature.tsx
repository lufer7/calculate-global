import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { game } from '@arena/core';

/** Soft-lit creature silhouettes on a 100×100 board (placeholders for illustrated art). */
function Body({ shape, c }: { shape: game.CreatureShape; c: string }) {
  const eye = '#ffdd88';
  switch (shape) {
    case 'beast': // fox
      return (
        <G>
          <Path d="M18 70 Q22 50 42 48 L60 46 Q70 36 74 30 L78 40 Q86 44 86 52 L76 56 Q72 70 62 74 L30 76 Q20 78 18 70 Z" fill={c} />
          <Path d="M18 70 Q6 62 10 50 Q16 60 26 62 Z" fill={c} />
          <Path d="M10 50 Q8 46 12 44 Q14 50 18 54 Z" fill="#f2e6cc" />
          <Path d="M70 34 L74 22 L78 34 Z" fill={c} />
          <Circle cx={76} cy={44} r={1.8} fill={eye} />
          <Rect x={30} y={74} width={5} height={10} fill={c} /><Rect x={58} y={72} width={5} height={12} fill={c} />
        </G>
      );
    case 'wolf':
      return (
        <G>
          <Path d="M14 66 Q18 46 40 44 L62 42 Q70 30 78 28 L80 38 Q90 42 90 50 L80 54 Q76 68 64 72 L28 74 Q16 76 14 66 Z" fill={c} />
          <Path d="M14 64 Q4 56 6 44 Q12 56 22 58 Z" fill={c} />
          <Path d="M72 32 L76 18 L80 32 Z M66 34 L68 22 L73 33 Z" fill={c} />
          <Circle cx={80} cy={42} r={2} fill={eye} />
          <Path d="M84 50 L88 53 L84 54 Z" fill="#fff" />
          {[26, 36, 58, 66].map((x) => <Rect key={x} x={x} y={72} width={5} height={14} fill={c} />)}
        </G>
      );
    case 'boar':
      return (
        <G>
          <Ellipse cx={48} cy={58} rx={32} ry={20} fill={c} />
          <Path d="M72 46 Q88 48 90 60 Q86 68 74 68 Z" fill={c} />
          <Path d="M84 62 Q92 58 92 52" stroke="#f2e6cc" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M24 40 L30 32 L34 40 L40 32 L44 40 L50 32 L54 40" stroke={c} strokeWidth={4} fill="none" />
          <Circle cx={78} cy={54} r={2} fill={eye} />
          {[26, 38, 58, 68].map((x) => <Rect key={x} x={x} y={72} width={6} height={12} fill={c} />)}
        </G>
      );
    case 'bear':
      return (
        <G>
          <Ellipse cx={46} cy={56} rx={34} ry={24} fill={c} />
          <Circle cx={76} cy={40} r={14} fill={c} />
          <Circle cx={68} cy={28} r={5} fill={c} /><Circle cx={84} cy={28} r={5} fill={c} />
          <Ellipse cx={82} cy={46} rx={6} ry={4} fill="#00000040" />
          <Circle cx={74} cy={38} r={2} fill={eye} /><Circle cx={82} cy={38} r={2} fill={eye} />
          {[20, 34, 56, 68].map((x) => <Rect key={x} x={x} y={72} width={9} height={14} rx={3} fill={c} />)}
        </G>
      );
    case 'humanoid':
      return (
        <G>
          <Path d="M28 96 Q30 62 50 58 Q70 62 72 96 Z" fill={c} />
          <Circle cx={50} cy={40} r={14} fill={c} />
          <Path d="M36 36 Q50 22 64 36 L64 32 Q50 14 36 32 Z" fill="#00000050" />
          <Circle cx={45} cy={42} r={1.8} fill={eye} /><Circle cx={55} cy={42} r={1.8} fill={eye} />
          <Path d="M74 30 L78 30 L78 82 L74 82 Z" fill="#9aa6ad" />
          <Path d="M70 80 L82 80 L82 84 L70 84 Z" fill="#7d6739" />
        </G>
      );
    case 'flyer':
      return (
        <G>
          <Path d="M50 46 Q30 26 6 34 Q16 44 14 56 Q26 48 36 56 Q42 50 50 58 Q58 50 64 56 Q74 48 86 56 Q84 44 94 34 Q70 26 50 46 Z" fill={c} />
          <Ellipse cx={50} cy={54} rx={9} ry={12} fill={c} />
          <Path d="M44 42 L46 34 L50 42 L54 34 L56 42 Z" fill={c} />
          <Circle cx={47} cy={50} r={1.6} fill="#ff6a6a" /><Circle cx={53} cy={50} r={1.6} fill="#ff6a6a" />
        </G>
      );
    case 'serpent':
      return (
        <G>
          <Path d="M10 80 Q30 60 50 76 Q70 92 82 66 Q90 48 74 40" stroke={c} strokeWidth={12} fill="none" strokeLinecap="round" />
          <Ellipse cx={70} cy={36} rx={12} ry={8} fill={c} />
          <Circle cx={72} cy={33} r={1.8} fill={eye} />
          <Path d="M58 38 L50 36 M58 38 L50 41" stroke="#c0392b" strokeWidth={1.5} />
        </G>
      );
    case 'spider':
      return (
        <G>
          {[-1, 1].map((d) => [0, 1, 2, 3].map((i) => (
            <Path key={`${d}${i}`} d={`M50 58 Q${50 + d * (20 + i * 4)} ${36 + i * 8} ${50 + d * (38 + i * 2)} ${54 + i * 10}`} stroke={c} strokeWidth={3} fill="none" />
          )))}
          <Ellipse cx={50} cy={62} rx={16} ry={14} fill={c} />
          <Circle cx={50} cy={46} r={9} fill={c} />
          {[45, 49, 53, 57].map((x, i) => <Circle key={x} cx={x - 1} cy={44 + (i % 2)} r={1.4} fill="#ff6a6a" />)}
        </G>
      );
    case 'golem':
      return (
        <G>
          <Path d="M26 92 L30 58 L22 40 L36 30 L64 30 L78 40 L70 58 L74 92 L58 92 L54 72 L46 72 L42 92 Z" fill={c} />
          <Path d="M36 30 L42 18 L58 18 L64 30 Z" fill={c} />
          <Path d="M34 46 L44 52 M60 40 L68 52 M40 64 L52 60" stroke="#00000050" strokeWidth={2} />
          <Rect x={42} y={22} width={5} height={3} fill={eye} /><Rect x={53} y={22} width={5} height={3} fill={eye} />
        </G>
      );
    case 'spirit':
      return (
        <G>
          <Path d="M30 90 Q26 40 50 24 Q74 40 70 90 Q64 82 58 90 Q52 82 46 90 Q40 82 30 90 Z" fill={c} opacity={0.85} />
          <Ellipse cx={42} cy={46} rx={4} ry={6} fill="#0d1215" /><Ellipse cx={58} cy={46} rx={4} ry={6} fill="#0d1215" />
          <Circle cx={42} cy={46} r={1.5} fill="#bfefff" /><Circle cx={58} cy={46} r={1.5} fill="#bfefff" />
          <Circle cx={50} cy={50} r={36} fill={c} opacity={0.12} />
        </G>
      );
    case 'dragon':
      return (
        <G>
          <Path d="M50 44 Q22 14 4 30 Q18 36 18 48 Q32 40 44 52 Z M50 44 Q78 14 96 30 Q82 36 82 48 Q68 40 56 52 Z" fill={c} opacity={0.9} />
          <Ellipse cx={50} cy={62} rx={18} ry={20} fill={c} />
          <Path d="M50 44 Q50 28 60 22 L66 26 Q58 30 58 42 Z" fill={c} />
          <Path d="M58 22 L62 12 L64 22 Z" fill="#f2e6cc" />
          <Circle cx={62} cy={26} r={1.6} fill="#ffb347" />
          <Path d="M40 80 Q30 92 16 90" stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'leech':
      return (
        <G>
          <Path d="M12 70 Q20 50 44 54 Q70 58 86 48 Q92 58 84 66 Q66 80 40 76 Q20 78 12 70 Z" fill={c} />
          {[30, 42, 54, 66].map((x) => <Path key={x} d={`M${x} 56 Q${x + 2} 66 ${x} 76`} stroke="#00000040" strokeWidth={2} fill="none" />)}
          <Circle cx={86} cy={56} r={4} fill="#5a1f22" />
        </G>
      );
    case 'frog':
      return (
        <G>
          <Ellipse cx={50} cy={62} rx={24} ry={22} fill={c} />
          <Circle cx={38} cy={40} r={8} fill={c} /><Circle cx={62} cy={40} r={8} fill={c} />
          <Circle cx={38} cy={40} r={3} fill={eye} /><Circle cx={62} cy={40} r={3} fill={eye} />
          <Path d="M36 60 Q50 68 64 60" stroke="#0d1215" strokeWidth={2} fill="none" />
          <Path d="M78 24 L82 24 L80 90 Z" fill="#8a7a55" />
          <Path d="M76 24 L80 12 L84 24 Z" fill="#9aa6ad" />
        </G>
      );
    default:
      return <Circle cx={50} cy={55} r={26} fill={c} />;
  }
}

export function CreatureArt({ shape, color, size = 80, unknown }: { shape: game.CreatureShape; color: string; size?: number; unknown?: boolean }) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: unknown ? '#8c2f2a' : '#00000080' }}>
      <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="crbg" cx="50%" cy="40%" r="75%">
            <Stop offset="0" stopColor={unknown ? '#3a1414' : '#2c3a33'} />
            <Stop offset="1" stopColor="#0b0f12" />
          </RadialGradient>
        </Defs>
        <Rect width={100} height={100} fill="url(#crbg)" />
        <Ellipse cx={50} cy={90} rx={36} ry={6} fill="#00000070" />
        <G opacity={unknown ? 0.35 : 1}>
          <Body shape={shape} c={unknown ? '#1b1b1b' : color} />
        </G>
        {unknown && <Path d="M40 40 Q40 30 50 30 Q60 30 60 40 Q60 46 52 48 L52 56 M52 64 L52 66" stroke="#e05a4f" strokeWidth={5} fill="none" strokeLinecap="round" />}
      </Svg>
    </View>
  );
}
