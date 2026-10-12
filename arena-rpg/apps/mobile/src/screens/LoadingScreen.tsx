import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { Scene } from '../art/Scene';
import type { SceneKey } from '../art/Scene';
import { tr } from '../i18n/tr';
import { colors, fonts } from './theme';

const SCENES: SceneKey[] = ['harbor', 'dark_forest', 'market', 'misty_marsh'];
const CAPTIONS: Record<string, string> = { harbor: 'Tuzlu Liman · Akşam', dark_forest: 'Karanlık Orman', market: 'Salı Pazarı', misty_marsh: 'Sisli Bataklık' };

/** Loading screen: a medieval landscape with a rotating tip underneath. */
export function LoadingScreen({ message, durationMs = 2600 }: { message?: string; durationMs?: number }) {
  const [scene] = useState(() => SCENES[Math.floor(Math.random() * SCENES.length)]!);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * tr.tips.length));
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % tr.tips.length), 6000);
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
    Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => clearInterval(t);
  }, [durationMs, fade, progress]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <Scene name={scene} fill style={{ borderRadius: 0 }}>
        <View style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#f4e9d2', fontSize: 36, fontWeight: '900', letterSpacing: 4, fontFamily: fonts.display, textShadowColor: '#000', textShadowRadius: 10 }}>AEGIS</Text>
          <View style={{ width: 160, height: 1, backgroundColor: colors.trim, marginVertical: 6 }} />
          <Text style={{ color: '#f4e9d2', opacity: 0.9, textShadowColor: '#000', textShadowRadius: 6 }}>{CAPTIONS[scene]}</Text>
        </View>
      </Scene>
      <View style={{ padding: 20, gap: 10, minHeight: 150, borderTopWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.bgDeep }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{message ?? 'Diyar hazırlanıyor…'}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: '#00000080', overflow: 'hidden', borderWidth: 1, borderColor: colors.trimDim }}>
          <Animated.View style={{ height: '100%', backgroundColor: colors.trim, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['4%', '96%'] }) }} />
        </View>
        <Animated.View style={{ gap: 6, opacity: fade }}>
          <Text style={{ color: colors.trim, fontSize: 11, letterSpacing: 1.5, fontWeight: '800' }}>İPUCU</Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>{tr.tips[tip]}</Text>
        </Animated.View>
      </View>
    </View>
  );
}
