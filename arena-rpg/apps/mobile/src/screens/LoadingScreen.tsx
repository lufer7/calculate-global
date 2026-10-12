import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Scene } from '../art/Scene';
import type { SceneKey } from '../art/Scene';
import { tr } from '../i18n/tr';
import { colors, fonts } from './theme';

const SCENES: SceneKey[] = ['harbor', 'dark_forest', 'market', 'misty_marsh'];
const CAPTIONS: Record<string, string> = { harbor: 'Tuzlu Liman · Akşam', dark_forest: 'Karanlık Orman', market: 'Salı Pazarı', misty_marsh: 'Sisli Bataklık' };

/** Loading screen: a medieval landscape with a rotating tip underneath. */
export function LoadingScreen({ message }: { message?: string }) {
  const [scene] = useState(() => SCENES[Math.floor(Math.random() * SCENES.length)]!);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * tr.tips.length));
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % tr.tips.length), 4500);
    return () => clearInterval(t);
  }, []);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.trim} />
          <Text style={{ color: colors.muted }}>{message ?? 'Yükleniyor…'}</Text>
        </View>
        <Text style={{ color: colors.trim, fontSize: 11, letterSpacing: 1.5, fontWeight: '800' }}>İPUCU</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>{tr.tips[tip]}</Text>
      </View>
    </View>
  );
}
