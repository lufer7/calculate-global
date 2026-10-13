import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const native = Platform.OS !== 'web';

/**
 * Hasan Hoca, keeper of the Cami: a stern man with a furrowed brow and short, dead-straight
 * black hair with a blunt fringe. Same soft-lit bust style as the fighter portraits,
 * with a slow "breathing" idle and an occasional frown deepening.
 */
export function HasanHoca({ size = 120 }: { size?: number }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 1.2, borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: '#c9a55c' }}>
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 120">
          <Defs>
            <RadialGradient id="hhbg" cx="50%" cy="35%" r="70%">
              <Stop offset="0" stopColor="#c9a55c" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#0d1215" stopOpacity={1} />
            </RadialGradient>
            <LinearGradient id="hhskin" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#dcae86" />
              <Stop offset="1" stopColor="#9a6a48" />
            </LinearGradient>
            <LinearGradient id="hhcoat" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3d4a5a" />
              <Stop offset="1" stopColor="#1e252e" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={120} fill="url(#hhbg)" />
          {/* shoulders: plain dark coat over a white collarless shirt */}
          <Path d="M8 120 Q12 84 50 78 Q88 84 92 120 Z" fill="url(#hhcoat)" />
          <Path d="M40 80 L50 96 L60 80 Q50 78 40 80 Z" fill="#e8e4da" />
          <Path d="M50 96 L50 120" stroke="#141a20" strokeWidth={1} />
          {/* neck and head */}
          <Rect x={43} y={66} width={14} height={16} rx={4} fill="url(#hhskin)" />
          <Ellipse cx={50} cy={48} rx={20} ry={24} fill="url(#hhskin)" />
          <Ellipse cx={30} cy={50} rx={3.5} ry={6} fill="#b98763" />
          <Ellipse cx={70} cy={50} rx={3.5} ry={6} fill="#b98763" />
          {/* short, dead-straight hair with a blunt fringe */}
          <Path d="M29 44 Q28 22 50 20 Q72 22 71 44 L71 36 Q70 34 68 36 L66 34 L32 34 L30 36 Q29 34 29 44 Z" fill="#141414" />
          <Path d="M32 34 L68 34 L68 37 L32 37 Z" fill="#1c1c1c" />
          {[34, 39, 44, 49, 54, 59, 64].map((x) => <Path key={x} d={`M${x} 34 L${x} 37`} stroke="#0a0a0a" strokeWidth={0.6} />)}
          {/* furrowed, angry brows */}
          <Path d="M35 41 L46 45 L46 47 L35 44 Z" fill="#111" />
          <Path d="M65 41 L54 45 L54 47 L65 44 Z" fill="#111" />
          <Path d="M48 42 L49 46 M52 42 L51 46" stroke="#8a5a3c" strokeWidth={0.8} />
          {/* narrow, glaring eyes */}
          <Ellipse cx={41} cy={49} rx={3.2} ry={1.6} fill="#f2ece0" />
          <Ellipse cx={59} cy={49} rx={3.2} ry={1.6} fill="#f2ece0" />
          <Circle cx={41.5} cy={49} r={1.2} fill="#1a1208" />
          <Circle cx={58.5} cy={49} r={1.2} fill="#1a1208" />
          {/* nose, tight mouth, short trimmed beard shadow */}
          <Path d="M50 50 L47 60 Q50 62 53 60" stroke="#8a5a3c" strokeWidth={1.2} fill="none" />
          <Path d="M43 66 Q50 64 57 66" stroke="#5a2e22" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Path d="M32 56 Q34 72 50 74 Q66 72 68 56 Q64 70 50 70 Q36 70 32 56 Z" fill="#1a1a1a" opacity={0.35} />
          <G opacity={0.25}><Ellipse cx={50} cy={30} rx={14} ry={4} fill="#fff" /></G>
        </Svg>
      </Animated.View>
    </View>
  );
}
