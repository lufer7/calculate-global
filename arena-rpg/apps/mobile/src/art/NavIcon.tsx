import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Line icons for the bottom bar and headers. */
export function NavIcon({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    // Wrapped in a non-touchable View: the press always reaches the parent Pressable.
    <View pointerEvents="none" style={{ width: size, height: size }}>
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 24 24">
      {name === 'gang' && <><Path {...p} d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><Path {...p} d="M2 20c0-3 3-5 6-5s6 2 6 5M12 18c.6-2 2.4-3 4-3 3 0 6 2 6 5" /></>}
      {name === 'home' && <><Path {...p} d="M3 11l9-7 9 7" /><Path {...p} d="M5 10v10h5v-6h4v6h5V10" /></>}
      {name === 'compass' && <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /><Path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>}
      {name === 'banner' && <><Path {...p} d="M5 21V3" /><Path {...p} d="M5 4h13l-3 4 3 4H5" /><Path {...p} d="M10 7l1 1.5L10 10" /></>}
      {name === 'telescope' && <><Path {...p} d="M3 13l12-6 2 4-12 6-2-4z" /><Path {...p} d="M15 7l3-1.5 2 4-3 1.5M10 15l-3 6M10 15l3 6" /></>}
      {name === 'mortar' && <><Path {...p} d="M4 11h16a8 7 0 0 1-16 0z" /><Path {...p} d="M8 21h8M10 18l-1 3M14 18l1 3M13 11l6-8" /></>}
      {name === 'bag' && <><Path {...p} d="M5 8h14l-1 12H6L5 8z" /><Path {...p} d="M9 8V6a3 3 0 0 1 6 0v2" /><Path {...p} d="M9 12h6" /></>}
      {name === 'map' && <><Path {...p} d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" /><Path {...p} d="M9 4v14M15 6v14" /></>}
      {name === 'swords' && <><Path {...p} d="M4 4l10 10M14 14l2 4 2-2-4-2M4 4h3l9 9" /><Path {...p} d="M20 4L10 14M10 14l-2 4-2-2 4-2M20 4h-3l-9 9" /></>}
      {name === 'market' && <><Path {...p} d="M3 9l2-5h14l2 5" /><Path {...p} d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z" /><Path {...p} d="M5 13v7h14v-7M10 20v-4h4v4" /></>}
      {name === 'more' && <><Path {...p} d="M5 10h14l-1.5 9H6.5L5 10z" /><Path {...p} d="M8 10c0-3 1-6 4-6s4 3 4 6M9 7c1 1 5 1 6 0" /></>}
      {name === 'coin' && <><Circle cx={12} cy={12} r={9} fill="#c9a55c" stroke="#7d6739" strokeWidth={1.5} /><Path d="M12 7v10M9 9.5h4.5a1.8 1.8 0 0 1 0 3.5H10a1.8 1.8 0 0 0 0 3.5h4.5" stroke="#5a4520" strokeWidth={1.6} fill="none" /></>}
      {name === 'scroll' && <><Path {...p} d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7" /><Path {...p} d="M6 4a2 2 0 0 0-2 2v2h4M7 20a2 2 0 0 1-2-2V8M10 9h6M10 13h6" /></>}
      {name === 'heart' && <Path fill={color} d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />}
      {name === 'bolt' && <Path fill={color} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />}
      {name === 'shield' && <Path {...p} d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" />}
      {name === 'clock' && <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 7v5l3 2" /></>}
      {name === 'anvil' && <><Path {...p} d="M3 8h12c0 3 2 4 6 4v1H14l-1 3h3v3H6v-3h3l-1-3c-3 0-5-2-5-5z" /></>}
      {name === 'flask' && <><Path {...p} d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3" /><Path {...p} d="M7 15h10" /></>}
      {name === 'user' && <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>}
      {name === 'trophy' && <><Path {...p} d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4c0 3 2 4 4 4M16 6h4c0 3-2 4-4 4M12 13v4M8 20h8M9 17h6" /></>}
      {name === 'cauldron' && <><Path {...p} d="M4 10h16c0 6-3 9-8 9s-8-3-8-9z" /><Path {...p} d="M3 10h18M9 6c0-1.5 1-2 1-3M14 7c0-1.5 1-2 1-3M7 19l-1 2M17 19l1 2" /></>}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'star' && <Path fill={color} d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />}
      {name === 'rest' && <><Rect {...p} x={3} y={12} width={18} height={6} rx={1} /><Path {...p} d="M3 18v2M21 18v2M6 12V9a2 2 0 0 1 2-2h3v5" /></>}
    </Svg>
    </View>
  );
}
