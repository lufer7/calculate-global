import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { game } from '@arena/core';

/** Shared metal/wood/leather gradients (identical everywhere, so duplicate ids on web are harmless). */
function Materials() {
  const lin = (id: string, a: string, b: string, c?: string) => (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {[<Stop key="0" offset="0" stopColor={a} />, <Stop key="m" offset="0.5" stopColor={c ?? a} />, <Stop key="1" offset="1" stopColor={b} />]}
    </LinearGradient>
  );
  return (
    <Defs>
      {lin('im', '#f2f4f5', '#6d7880', '#b9c2c7')}
      {lin('iw', '#9a6a3c', '#4a2e18')}
      {lin('ig', '#ffe7a3', '#9a6c1c', '#e0b24c')}
      {lin('il', '#b07a48', '#5a3a1e')}
      {lin('ic', '#8a8fb0', '#3e4266')}
      {lin('ir', '#c0503f', '#5a1a14')}
      <RadialGradient id="ibg" cx="50%" cy="45%" r="60%">
        <Stop offset="0" stopColor="#2a363e" />
        <Stop offset="1" stopColor="#11181c" />
      </RadialGradient>
    </Defs>
  );
}

const O = '#0c0f10'; // outline

const ICONS: Record<string, () => ReactNode> = {
  sword: () => (
    <G transform="rotate(-45 32 32)">
      <Path d="M29 6 L35 6 L35 40 L32 46 L29 40 Z" fill="url(#im)" stroke={O} strokeWidth={1.2} />
      <Rect x={22} y={40} width={20} height={4} rx={1} fill="url(#ig)" stroke={O} strokeWidth={1} />
      <Rect x={30} y={44} width={4} height={10} fill="url(#il)" stroke={O} strokeWidth={1} />
      <Circle cx={32} cy={56} r={3} fill="url(#ig)" stroke={O} strokeWidth={1} />
    </G>
  ),
  axe: () => (
    <G>
      <Rect x={30} y={8} width={5} height={50} rx={2} fill="url(#iw)" stroke={O} strokeWidth={1.2} />
      <Path d="M34 12 Q54 10 54 28 Q46 24 34 28 Z" fill="url(#im)" stroke={O} strokeWidth={1.2} />
      <Path d="M31 14 Q20 18 22 26 Q26 22 31 24 Z" fill="url(#im)" stroke={O} strokeWidth={1} />
    </G>
  ),
  mace: () => (
    <G>
      <Rect x={30} y={26} width={5} height={32} rx={2} fill="url(#iw)" stroke={O} strokeWidth={1.2} />
      <Circle cx={32.5} cy={18} r={11} fill="url(#im)" stroke={O} strokeWidth={1.2} />
      {[[32.5, 4], [44, 12], [44, 24], [21, 12], [21, 24]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={2.5} fill="url(#im)" stroke={O} strokeWidth={0.8} />)}
    </G>
  ),
  bow: () => (
    <G>
      <Path d="M20 6 Q50 32 20 58" fill="none" stroke="url(#iw)" strokeWidth={5} />
      <Path d="M20 6 Q50 32 20 58" fill="none" stroke={O} strokeWidth={0.8} />
      <Path d="M21 7 L21 57" stroke="#e8dcc0" strokeWidth={1} />
      <Path d="M14 32 L52 32" stroke="url(#iw)" strokeWidth={2} />
      <Path d="M52 32 L46 28 L46 36 Z" fill="url(#im)" stroke={O} strokeWidth={0.8} />
      <Path d="M14 32 L10 28 M14 32 L10 36" stroke="#d8cfc0" strokeWidth={1.5} />
    </G>
  ),
  dagger: () => (
    <G transform="rotate(-40 32 32)">
      <Path d="M30 10 L34 10 L35 36 L32 42 L29 36 Z" fill="url(#im)" stroke={O} strokeWidth={1.2} />
      <Path d="M24 36 Q32 40 40 36 L40 40 Q32 43 24 40 Z" fill="url(#ig)" stroke={O} strokeWidth={1} />
      <Rect x={30} y={40} width={4} height={12} fill="url(#il)" stroke={O} strokeWidth={1} />
    </G>
  ),
  staff: () => (
    <G>
      <Path d="M30 20 L33 60" stroke="url(#iw)" strokeWidth={5} strokeLinecap="round" />
      <Path d="M30 20 Q22 14 26 6 Q32 2 38 6 Q42 14 34 20 Z" fill="url(#iw)" stroke={O} strokeWidth={1} />
      <Circle cx={32} cy={12} r={5} fill="#8fe0ff" stroke={O} strokeWidth={1} />
      <Circle cx={31} cy={11} r={1.6} fill="#ffffff" />
    </G>
  ),
  wand: () => (
    <G transform="rotate(-35 32 32)">
      <Rect x={30} y={18} width={4} height={38} rx={2} fill="url(#iw)" stroke={O} strokeWidth={1} />
      <Path d="M32 6 L35 14 L43 14 L37 19 L39 27 L32 22 L25 27 L27 19 L21 14 L29 14 Z" fill="url(#ig)" stroke={O} strokeWidth={0.8} />
    </G>
  ),
  shield: () => (
    <G>
      <Path d="M32 6 L54 14 Q54 42 32 58 Q10 42 10 14 Z" fill="url(#ir)" stroke={O} strokeWidth={1.4} />
      <Path d="M32 10 L50 17 Q50 40 32 53 Q14 40 14 17 Z" fill="none" stroke="url(#ig)" strokeWidth={2} />
      <Path d="M32 18 L32 46 M20 28 L44 28" stroke="url(#ig)" strokeWidth={3} />
    </G>
  ),
  quiver: () => (
    <G transform="rotate(20 32 32)">
      <Path d="M22 16 L42 16 L40 58 L24 58 Z" fill="url(#il)" stroke={O} strokeWidth={1.2} />
      <Rect x={22} y={26} width={20} height={3} fill="url(#ig)" />
      {[26, 32, 38].map((x) => <G key={x}><Path d={`M${x} 16 L${x} 4`} stroke="#d8cfc0" strokeWidth={1.5} /><Path d={`M${x} 4 L${x - 3} 9 M${x} 4 L${x + 3} 9`} stroke="#c0503f" strokeWidth={1.5} /></G>)}
    </G>
  ),
  tome: () => (
    <G>
      <Path d="M12 14 L48 10 L52 50 L16 54 Z" fill="#3e2a5a" stroke={O} strokeWidth={1.2} />
      <Path d="M16 54 L52 50 L52 54 L17 58 Z" fill="#e8dcc0" stroke={O} strokeWidth={0.8} />
      <Circle cx={32} cy={32} r={9} fill="none" stroke="url(#ig)" strokeWidth={2} />
      <Path d="M32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 L30 30 Z" fill="url(#ig)" />
    </G>
  ),
  helm: () => (
    <G>
      <Path d="M14 40 Q14 10 32 8 Q50 10 50 40 L50 50 L40 50 L40 36 L24 36 L24 50 L14 50 Z" fill="url(#im)" stroke={O} strokeWidth={1.3} />
      <Rect x={30} y={8} width={4} height={30} fill="url(#ig)" stroke={O} strokeWidth={0.6} />
      <Rect x={20} y={30} width={24} height={4} fill="#11181c" />
    </G>
  ),
  hood: () => (
    <G>
      <Path d="M10 56 Q8 20 32 8 Q56 20 54 56 Q44 48 32 48 Q20 48 10 56 Z" fill="#3f5a3a" stroke={O} strokeWidth={1.3} />
      <Path d="M20 46 Q20 24 32 20 Q44 24 44 46 Q38 42 32 42 Q26 42 20 46 Z" fill="#141a14" />
    </G>
  ),
  plate: () => (
    <G>
      <Path d="M14 14 L24 8 Q32 14 40 8 L50 14 L54 30 L46 32 L46 56 L18 56 L18 32 L10 30 Z" fill="url(#im)" stroke={O} strokeWidth={1.3} />
      <Path d="M32 14 L32 56" stroke="#6d7880" strokeWidth={1.5} />
      <Path d="M22 26 Q32 32 42 26 M22 38 Q32 44 42 38" stroke="#6d7880" strokeWidth={1.5} fill="none" />
    </G>
  ),
  jerkin: () => (
    <G>
      <Path d="M14 14 L24 8 Q32 12 40 8 L50 14 L54 30 L46 32 L46 56 L18 56 L18 32 L10 30 Z" fill="url(#il)" stroke={O} strokeWidth={1.3} />
      <Path d="M32 12 L32 56" stroke="#3a2412" strokeWidth={1.5} />
      {[22, 30, 38, 46].map((y) => <Path key={y} d={`M29 ${y} L35 ${y + 2}`} stroke="#e8dcc0" strokeWidth={1} />)}
    </G>
  ),
  robe: () => (
    <G>
      <Path d="M20 10 Q32 16 44 10 L50 18 L46 30 L52 58 L12 58 L18 30 L14 18 Z" fill="url(#ic)" stroke={O} strokeWidth={1.3} />
      <Path d="M32 16 L32 58" stroke="url(#ig)" strokeWidth={2} />
      <Path d="M18 30 L46 30" stroke="url(#ig)" strokeWidth={2} />
    </G>
  ),
  gloves: () => (
    <G>
      <Path d="M18 56 L18 30 Q16 20 20 18 L22 30 L22 14 Q24 10 27 14 L27 28 L28 12 Q31 8 33 12 L33 28 L35 16 Q38 12 40 16 L39 34 Q44 28 46 32 Q42 44 40 56 Z" fill="url(#il)" stroke={O} strokeWidth={1.2} />
      <Rect x={17} y={48} width={24} height={8} fill="#5a3a1e" stroke={O} strokeWidth={1} />
    </G>
  ),
  boots: () => (
    <G>
      <Path d="M18 8 L34 8 L34 40 L52 46 Q56 52 52 56 L16 56 Z" fill="url(#il)" stroke={O} strokeWidth={1.3} />
      <Rect x={16} y={52} width={38} height={4} fill="#2a1a0c" />
      <Rect x={18} y={14} width={16} height={4} fill="url(#ig)" />
    </G>
  ),
  amulet: () => (
    <G>
      <Path d="M16 8 Q32 34 48 8" fill="none" stroke="url(#ig)" strokeWidth={2} />
      <Path d="M32 30 L42 42 L32 58 L22 42 Z" fill="#3fa0b0" stroke={O} strokeWidth={1.2} />
      <Path d="M32 30 L42 42 L32 58 L22 42 Z" fill="none" stroke="url(#ig)" strokeWidth={2} />
      <Path d="M28 40 L32 36 L34 40" stroke="#e8ffff" strokeWidth={1.2} fill="none" />
    </G>
  ),
  ring: () => (
    <G>
      <Ellipse cx={32} cy={38} rx={16} ry={14} fill="none" stroke="url(#ig)" strokeWidth={5} />
      <Ellipse cx={32} cy={38} rx={16} ry={14} fill="none" stroke={O} strokeWidth={0.8} />
      <Path d="M24 20 L32 12 L40 20 L32 28 Z" fill="#c0303f" stroke={O} strokeWidth={1} />
      <Path d="M29 18 L32 15 L34 18" stroke="#ffd0d0" strokeWidth={1} fill="none" />
    </G>
  ),
  bread: () => (
    <G>
      <Ellipse cx={32} cy={38} rx={24} ry={15} fill="#c78a3e" stroke={O} strokeWidth={1.2} />
      <Ellipse cx={32} cy={34} rx={22} ry={11} fill="#e0a85a" />
      {[20, 30, 40].map((x) => <Path key={x} d={`M${x} 28 Q${x + 4} 34 ${x + 2} 40`} stroke="#9a6a2a" strokeWidth={2} fill="none" />)}
    </G>
  ),
  cheese: () => (
    <G>
      <Path d="M8 44 L48 20 L56 44 Z" fill="#f0c95a" stroke={O} strokeWidth={1.2} />
      <Path d="M8 44 L56 44 L56 50 L8 50 Z" fill="#d6a83e" stroke={O} strokeWidth={1.2} />
      {[[30, 38, 3], [44, 34, 2.5], [22, 44, 2]].map(([x, y, r]) => <Circle key={x} cx={x} cy={y} r={r} fill="#c69636" />)}
    </G>
  ),
  fish: () => (
    <G>
      <Path d="M10 32 Q28 14 46 32 Q28 50 10 32 Z" fill="#a07a4a" stroke={O} strokeWidth={1.2} />
      <Path d="M46 32 L58 22 L56 32 L58 42 Z" fill="#8a643a" stroke={O} strokeWidth={1.2} />
      <Circle cx={18} cy={30} r={2} fill={O} />
      {[24, 30, 36].map((x) => <Path key={x} d={`M${x} 24 Q${x + 3} 32 ${x} 40`} stroke="#6a4a26" strokeWidth={1.2} fill="none" />)}
    </G>
  ),
  roast: () => (
    <G>
      <Path d="M14 40 Q10 18 32 16 Q50 18 48 36 Q46 48 30 50 Q18 50 14 40 Z" fill="#a3542e" stroke={O} strokeWidth={1.2} />
      <Path d="M18 36 Q18 22 32 22 Q44 24 42 34" stroke="#d27a44" strokeWidth={3} fill="none" />
      <Path d="M44 42 L56 54" stroke="#efe6d4" strokeWidth={5} strokeLinecap="round" />
    </G>
  ),
  honeycake: () => (
    <G>
      <Path d="M10 40 L54 40 L50 52 L14 52 Z" fill="#b97a3a" stroke={O} strokeWidth={1.2} />
      <Ellipse cx={32} cy={40} rx={22} ry={8} fill="#e2a24a" stroke={O} strokeWidth={1.2} />
      <Path d="M18 38 Q24 30 32 34 Q40 28 46 38" fill="#f6c84a" stroke="#c8902a" strokeWidth={1} />
      <Circle cx={32} cy={26} r={4} fill="#c0303f" stroke={O} strokeWidth={1} />
    </G>
  ),
  leather: () => (
    <G>
      <Path d="M12 18 Q22 10 32 14 Q42 8 52 18 Q48 30 54 44 Q42 54 32 50 Q20 56 10 44 Q16 30 12 18 Z" fill="url(#il)" stroke={O} strokeWidth={1.2} />
      <Path d="M20 24 Q32 30 44 24 M20 40 Q32 34 44 40" stroke="#5a3a1e" strokeWidth={1.2} fill="none" />
    </G>
  ),
  bone: () => (
    <G transform="rotate(-35 32 32)">
      <Rect x={18} y={28} width={28} height={8} fill="#efe6d4" stroke={O} strokeWidth={1.2} />
      {[[16, 26], [16, 38], [48, 26], [48, 38]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={6} fill="#efe6d4" stroke={O} strokeWidth={1.2} />)}
    </G>
  ),
  game_meat: () => (
    <G>
      <Path d="M14 38 Q12 18 32 18 Q50 20 46 38 Q42 50 28 50 Q16 48 14 38 Z" fill="#b84a3a" stroke={O} strokeWidth={1.2} />
      <Ellipse cx={30} cy={34} rx={10} ry={7} fill="#e07a6a" />
      <Circle cx={30} cy={34} r={3} fill="#efe6d4" />
    </G>
  ),
};

function Potion({ color }: { color: string }) {
  return (
    <G>
      <Rect x={27} y={8} width={10} height={10} fill="#8a6a3a" stroke={O} strokeWidth={1} />
      <Path d="M26 18 L38 18 L38 26 Q50 32 50 44 Q50 58 32 58 Q14 58 14 44 Q14 32 26 26 Z" fill="#cfe6ee" opacity={0.35} stroke={O} strokeWidth={1.3} />
      <Path d="M16 42 Q32 36 48 42 Q48 56 32 56 Q16 56 16 42 Z" fill={color} />
      <Ellipse cx={24} cy={34} rx={3} ry={6} fill="#ffffff" opacity={0.45} />
    </G>
  );
}
const POTION_COLORS: Record<string, string> = { potion_red: '#d0443a', potion_blue: '#3f8fe0', potion_green: '#5ac06a', potion_purple: '#a05ae0' };

export function ItemIcon({ icon, rarity = 'common', size = 56, qty, upgrade, dim }: {
  icon: string; rarity?: game.Rarity; size?: number; qty?: number; upgrade?: number; dim?: boolean;
}) {
  const color = game.RARITY_INFO[rarity]?.color ?? '#888';
  const draw = POTION_COLORS[icon] ? () => <Potion color={POTION_COLORS[icon]!} /> : ICONS[icon];
  return (
    <View style={{ width: size, height: size, borderRadius: 6, borderWidth: rarity === 'common' ? 1 : 2, borderColor: rarity === 'common' ? '#3a474f' : color, overflow: 'hidden', opacity: dim ? 0.45 : 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64">
        <Materials />
        <Rect width={64} height={64} fill="url(#ibg)" />
        {rarity !== 'common' && <Rect width={64} height={64} fill={color} opacity={0.12} />}
        {draw ? draw() : <Circle cx={32} cy={32} r={14} fill="#555" />}
      </Svg>
      {qty !== undefined && qty > 1 && (
        <Text style={{ position: 'absolute', right: 3, bottom: 1, color: '#fff', fontSize: Math.max(10, size / 5), fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }}>{qty}</Text>
      )}
      {upgrade !== undefined && upgrade > 0 && (
        <Text style={{ position: 'absolute', left: 3, top: 1, color: '#ffd77a', fontSize: Math.max(9, size / 6), fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }}>+{upgrade}</Text>
      )}
    </View>
  );
}

/** Empty paper-doll slot with a faint silhouette of what belongs there. */
export function EmptySlot({ slot, size = 56 }: { slot: game.EquipSlot; size?: number }) {
  const icon = { head: 'helm', amulet: 'amulet', chest: 'plate', main_hand: 'sword', off_hand: 'shield', hands: 'gloves', ring1: 'ring', ring2: 'ring', feet: 'boots' }[slot];
  return (
    <View style={{ width: size, height: size, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3a474f', backgroundColor: '#0d1316', overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64" opacity={0.18}>
        <Materials />
        {ICONS[icon]!()}
      </Svg>
    </View>
  );
}
