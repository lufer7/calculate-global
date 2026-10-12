import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Painterly placeholder scenes drawn in SVG (layered silhouettes, soft light, fog).
 * Swap for illustrated art later – keep the same keys.
 */
export type SceneKey = 'harbor' | 'dark_forest' | 'misty_marsh' | 'abandoned_mines' | 'lost_lands' | 'market' | 'arena' | 'study' | 'camp';

const W = 400;
const H = 220;

function sky(id: string, stops: [string, string][]) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
    </LinearGradient>
  );
}

function glow(id: string, color: string, opacity = 0.9) {
  return (
    <RadialGradient id={id} cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

/** Row of pines along a baseline. */
function pines(seed: number, baseY: number, height: number, color: string, count: number) {
  const out: ReactNode[] = [];
  let x = -10 + (seed % 13);
  for (let i = 0; i < count; i++) {
    const h = height * (0.7 + (((seed * (i + 3)) % 37) / 37) * 0.6);
    const w = h * 0.42;
    out.push(
      <Path key={i} fill={color} d={`M${x} ${baseY} L${x + w / 2} ${baseY - h} L${x + w} ${baseY} Z M${x + w * 0.15} ${baseY - h * 0.35} L${x + w / 2} ${baseY - h * 0.85} L${x + w * 0.85} ${baseY - h * 0.35} Z`} />,
    );
    x += w * (0.55 + ((seed * (i + 7)) % 11) / 30);
  }
  return out;
}

const scenes: Record<SceneKey, () => ReactNode> = {
  harbor: () => (
    <>
      <Defs>
        {sky('hs', [['0', '#1d2a44'], ['0.45', '#5b4a63'], ['0.75', '#c27a4c'], ['1', '#e8a85a']])}
        {glow('hg', '#ffd49a')}
        {sky('hw', [['0', '#2a3c52'], ['1', '#141d28']])}
      </Defs>
      <Rect width={W} height={H} fill="url(#hs)" />
      <Circle cx={280} cy={128} r={70} fill="url(#hg)" />
      <Circle cx={280} cy={128} r={18} fill="#ffe2ad" />
      <Path d="M0 140 Q60 112 120 128 T250 120 T400 132 L400 160 L0 160 Z" fill="#4a3c4c" opacity={0.7} />
      {/* town */}
      <Path fill="#241d24" d="M20 160 L20 118 L34 106 L48 118 L48 160 Z M52 160 L52 96 L58 84 L64 96 L64 160 Z M66 160 L66 124 L90 112 L114 124 L114 160 Z M118 160 L118 104 L126 92 L134 104 L134 160 Z M138 160 L138 128 L170 118 L176 128 L176 160 Z" />
      <Rect x={57} y={100} width={3} height={5} fill="#ffcf7a" />
      <Rect x={90} y={130} width={4} height={5} fill="#ffcf7a" />
      <Rect x={150} y={136} width={4} height={5} fill="#ffcf7a" />
      {/* pier & ship */}
      <Rect x={0} y={158} width={210} height={6} fill="#1c161b" />
      <Path fill="#1c161b" d="M250 168 Q300 182 350 168 L344 176 Q300 186 256 176 Z" />
      <Rect x={298} y={104} width={3} height={66} fill="#1c161b" />
      <Path fill="#d8c7a6" opacity={0.85} d="M302 108 Q326 126 302 156 Z" />
      <Path fill="#cdb894" opacity={0.75} d="M297 112 Q276 130 297 154 Z" />
      {/* water */}
      <Rect y={164} width={W} height={56} fill="url(#hw)" />
      {[172, 182, 194, 206].map((y, i) => <Rect key={y} x={232 + i * 8} y={y} width={90 - i * 14} height={1.6} fill="#ffcf8a" opacity={0.45 - i * 0.08} />)}
      <Path d="M90 70 q6 -5 12 0 q6 -5 12 0" stroke="#2a2230" strokeWidth={1.5} fill="none" />
      <Path d="M130 58 q5 -4 10 0 q5 -4 10 0" stroke="#2a2230" strokeWidth={1.3} fill="none" />
    </>
  ),
  dark_forest: () => (
    <>
      <Defs>
        {sky('fs', [['0', '#0d1a1c'], ['0.6', '#22403b'], ['1', '#3e5c4a']])}
        {glow('fm', '#d9f0e0', 0.6)}
      </Defs>
      <Rect width={W} height={H} fill="url(#fs)" />
      <Circle cx={310} cy={48} r={40} fill="url(#fm)" />
      <Circle cx={310} cy={48} r={13} fill="#e6f2e4" />
      <G>{pines(5, 150, 90, '#2b4a3f', 18)}</G>
      <Rect y={120} width={W} height={40} fill="#9fc0a8" opacity={0.12} />
      <G>{pines(11, 182, 120, '#17302a', 14)}</G>
      <Path d="M150 220 Q190 180 210 172 Q230 180 270 220 Z" fill="#3a3a2c" opacity={0.8} />
      <G>{pines(17, 225, 170, '#0b1916', 9)}</G>
      <Rect y={190} width={W} height={30} fill="#0b1513" opacity={0.6} />
    </>
  ),
  misty_marsh: () => (
    <>
      <Defs>
        {sky('ms', [['0', '#3b4744'], ['0.7', '#7d8a7c'], ['1', '#9aa58f']])}
        {sky('mw', [['0', '#56645c'], ['1', '#2b3530']])}
      </Defs>
      <Rect width={W} height={H} fill="url(#ms)" />
      <Path d="M0 130 Q100 118 200 128 T400 124 L400 150 L0 150 Z" fill="#59665c" />
      <Path fill="none" d="M70 150 L72 70 M72 92 L52 74 M72 100 L92 82 M72 80 L84 62" stroke="#2c3330" strokeWidth={4} />
      <Path fill="none" stroke="#2c3330" strokeWidth={3} d="M300 152 L303 92 M303 108 L322 96 M303 118 L286 104" />
      <Rect y={150} width={W} height={70} fill="url(#mw)" />
      {[0, 1, 2].map((i) => <Ellipse key={i} cx={80 + i * 130} cy={178 + i * 6} rx={70} ry={6} fill="#a9b7a6" opacity={0.25} />)}
      {Array.from({ length: 26 }).map((_, i) => (
        <Path key={i} d={`M${12 + i * 15} 220 q${(i % 3) - 1} -${20 + (i % 5) * 7} ${(i % 2 ? 4 : -4)} -${30 + (i % 4) * 8}`} stroke="#1f2a24" strokeWidth={2} fill="none" />
      ))}
      <Rect y={100} width={W} height={60} fill="#d4dccb" opacity={0.18} />
      <Rect y={170} width={W} height={30} fill="#d4dccb" opacity={0.14} />
    </>
  ),
  abandoned_mines: () => (
    <>
      <Defs>
        {sky('ns', [['0', '#2a2333'], ['0.7', '#5a4a52'], ['1', '#7a5e4c']])}
        {glow('nl', '#ffb85c', 0.85)}
      </Defs>
      <Rect width={W} height={H} fill="url(#ns)" />
      <Path d="M0 160 L70 70 L120 110 L190 30 L280 120 L330 80 L400 150 L400 220 L0 220 Z" fill="#3a3036" />
      <Path d="M150 220 L150 140 Q190 110 230 140 L230 220 Z" fill="#120e10" />
      <Path d="M144 220 L144 136 L236 136 L236 220" stroke="#6b4a2e" strokeWidth={8} fill="none" />
      <Rect x={140} y={128} width={100} height={10} fill="#7a5634" />
      <Circle cx={250} cy={150} r={26} fill="url(#nl)" />
      <Rect x={246} y={146} width={8} height={10} fill="#ffcf7a" />
      <Path d="M120 220 L170 170 M260 220 L210 170" stroke="#5b5b5b" strokeWidth={3} />
      {[180, 192, 204, 216].map((y) => <Rect key={y} x={150 - (y - 170) * 0.8} y={y} width={80 + (y - 170) * 1.6} height={3} fill="#4b3a2a" />)}
      <Path d="M0 220 L0 180 L40 170 L90 186 L120 220 Z" fill="#241d22" />
      <Path d="M400 220 L400 176 L350 168 L300 190 L290 220 Z" fill="#241d22" />
    </>
  ),
  lost_lands: () => (
    <>
      <Defs>
        {sky('ls', [['0', '#1a1238'], ['0.6', '#4b2f6a'], ['1', '#a0628a']])}
        {glow('lg', '#f2b8ff', 0.5)}
      </Defs>
      <Rect width={W} height={H} fill="url(#ls)" />
      <Circle cx={200} cy={90} r={90} fill="url(#lg)" />
      {[[60, 40, 4], [330, 30, 3], [250, 60, 2], [120, 70, 2]].map(([x, y, r]) => <Circle key={x} cx={x} cy={y} r={r} fill="#fff4ff" opacity={0.8} />)}
      <Path d="M150 110 L250 110 L240 126 L160 126 Z" fill="#3a2a4e" />
      <Path d="M90 70 L130 70 L124 80 L96 80 Z" fill="#3a2a4e" opacity={0.8} />
      <Path d="M290 84 L320 84 L316 92 L294 92 Z" fill="#3a2a4e" opacity={0.8} />
      <Path d="M0 220 L0 170 Q100 150 200 168 T400 160 L400 220 Z" fill="#2a1e36" />
      {[80, 120, 280, 320].map((x, i) => <Rect key={x} x={x} y={120 + (i % 2) * 14} width={14} height={60 - (i % 2) * 14} fill="#47375a" />)}
      <Path d="M70 118 L144 118 L144 126 L70 126 Z M270 132 L334 132 L334 140 L270 140 Z" fill="#5a4870" />
    </>
  ),
  market: () => (
    <>
      <Defs>
        {sky('ks', [['0', '#3c5a6e'], ['0.7', '#a7b9b0'], ['1', '#e5d6b0']])}
      </Defs>
      <Rect width={W} height={H} fill="url(#ks)" />
      <Path d="M0 120 L30 96 L60 120 L60 150 L0 150 Z M330 150 L330 104 L360 84 L392 104 L392 150 Z" fill="#6c6a6a" opacity={0.6} />
      <Rect y={150} width={W} height={70} fill="#7d6b52" />
      {Array.from({ length: 12 }).map((_, i) => <Rect key={i} x={i * 36} y={170 + (i % 2) * 18} width={30} height={12} rx={3} fill="#6a5a44" />)}
      {[[40, '#9c3b32'], [160, '#2f6a74'], [280, '#9a7a2a']].map(([x, c]) => (
        <G key={x as number}>
          <Rect x={(x as number) + 6} y={110} width={4} height={60} fill="#3b2a1c" />
          <Rect x={(x as number) + 90} y={110} width={4} height={60} fill="#3b2a1c" />
          <Path d={`M${x} 112 L${(x as number) + 100} 112 L${(x as number) + 92} 88 L${(x as number) + 8} 88 Z`} fill={c as string} />
          {[0, 1, 2, 3, 4].map((k) => <Path key={k} d={`M${(x as number) + 10 + k * 18} 88 L${(x as number) + 18 + k * 18} 88 L${(x as number) + 16 + k * 18} 112 L${(x as number) + 6 + k * 18} 112 Z`} fill="#efe2c4" opacity={0.75} />)}
          <Rect x={(x as number) + 4} y={140} width={92} height={16} fill="#5a3e26" />
          <Circle cx={(x as number) + 26} cy={138} r={7} fill="#c9a24a" />
          <Circle cx={(x as number) + 48} cy={136} r={6} fill="#8c2e2a" />
          <Rect x={(x as number) + 62} y={128} width={14} height={12} fill="#a8875a" />
        </G>
      ))}
    </>
  ),
  arena: () => (
    <>
      <Defs>
        {sky('as', [['0', '#5a7a9a'], ['1', '#e3c79a']])}
        {sky('aa', [['0', '#d9b77c'], ['1', '#a7814e']])}
      </Defs>
      <Rect width={W} height={H} fill="url(#as)" />
      <Path d="M0 60 Q200 20 400 60 L400 150 L0 150 Z" fill="#8a7158" />
      {Array.from({ length: 11 }).map((_, i) => <Path key={i} d={`M${12 + i * 36} 148 L${12 + i * 36} 92 Q${30 + i * 36} 74 ${48 + i * 36} 92 L${48 + i * 36} 148 Z`} fill="#4a3a2c" />)}
      <Path d="M0 60 Q200 20 400 60 L400 68 Q200 30 0 68 Z" fill="#6c563f" />
      {[60, 200, 340].map((x, i) => (
        <G key={x}>
          <Rect x={x} y={8 + (i === 1 ? -6 : 6)} width={2} height={44} fill="#3a2a1a" />
          <Path d={`M${x + 2} ${10 + (i === 1 ? -6 : 6)} L${x + 26} ${18 + (i === 1 ? -6 : 6)} L${x + 2} ${28 + (i === 1 ? -6 : 6)} Z`} fill={['#8f2f2a', '#c9a55c', '#2f5f6a'][i]} />
        </G>
      ))}
      <Ellipse cx={200} cy={196} rx={260} ry={52} fill="url(#aa)" />
      <Path d="M160 190 L176 168 M240 190 L224 168" stroke="#5a4632" strokeWidth={3} />
    </>
  ),
  study: () => (
    <>
      <Defs>
        {sky('ts', [['0', '#1a1418'], ['1', '#3a2a24']])}
        {glow('tg', '#7fe0a0', 0.7)}
        {glow('tf', '#ff9a4c', 0.8)}
      </Defs>
      <Rect width={W} height={H} fill="url(#ts)" />
      {[30, 70, 110].map((y) => <Rect key={y} x={20} y={y} width={110} height={4} fill="#4a3324" />)}
      {[34, 74].map((y) => [0, 1, 2, 3, 4].map((k) => <Rect key={`${y}${k}`} x={26 + k * 20} y={y - 18} width={12} height={18} fill={['#7a3a2a', '#2f5a4a', '#5a4a7a', '#8a6a2a', '#3a4a6a'][k]} />))}
      <Circle cx={200} cy={150} r={90} fill="url(#tf)" />
      <Path d="M140 150 Q200 230 260 150 Z" fill="#1c1c1c" />
      <Ellipse cx={200} cy={150} rx={62} ry={12} fill="#2a2a2a" />
      <Ellipse cx={200} cy={150} rx={54} ry={8} fill="#5fbf7a" />
      <Circle cx={200} cy={120} r={60} fill="url(#tg)" />
      <Path d="M180 136 q-10 -20 6 -36 q12 -14 0 -30 M212 136 q12 -18 -2 -34 q-10 -14 4 -30" stroke="#cfe8d4" strokeWidth={4} fill="none" opacity={0.4} />
      <Path d="M170 200 L160 220 M230 200 L240 220" stroke="#1c1c1c" strokeWidth={5} />
      <Path d="M160 214 L240 214" stroke="#ff9a4c" strokeWidth={6} opacity={0.7} />
    </>
  ),
  camp: () => (
    <>
      <Defs>
        {sky('cs', [['0', '#0c1220'], ['0.7', '#1e2a3a'], ['1', '#2e3640']])}
        {glow('cf', '#ffae52', 0.9)}
      </Defs>
      <Rect width={W} height={H} fill="url(#cs)" />
      {[[40, 30], [120, 18], [220, 40], [300, 22], [370, 50], [180, 12], [80, 60]].map(([x, y]) => <Circle key={x} cx={x} cy={y} r={1.4} fill="#e6eefc" />)}
      <G>{pines(3, 150, 80, '#121b22', 20)}</G>
      <Rect y={150} width={W} height={70} fill="#1a1d1c" />
      <Circle cx={200} cy={170} r={110} fill="url(#cf)" />
      <Path d="M60 180 L110 120 L160 180 Z" fill="#5a4636" />
      <Path d="M110 120 L110 180" stroke="#2a2018" strokeWidth={2} />
      <Path d="M250 182 L300 128 L350 182 Z" fill="#4a3c30" />
      <Path d="M186 186 L214 186 M190 190 L210 182" stroke="#3a2a1a" strokeWidth={5} />
      <Path d="M200 186 Q186 168 196 150 Q200 164 206 156 Q214 170 200 186 Z" fill="#ffc35a" />
      <Path d="M200 186 Q193 174 199 164 Q202 172 205 168 Q208 176 200 186 Z" fill="#fff0b8" />
    </>
  ),
};

export function Scene({ name, height = 140, fill, style, children }: { name: SceneKey; height?: number; fill?: boolean; style?: ViewStyle; children?: ReactNode }) {
  return (
    <View style={[fill ? { flex: 1 } : { height }, { overflow: 'hidden', borderRadius: 6 }, style]}>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {scenes[name]()}
      </Svg>
      {children ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}>{children}</View> : null}
    </View>
  );
}
