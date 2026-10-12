import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { tr } from '../i18n/tr';
import { colors } from './theme';

/**
 * Placeholder loading screen: a dusk harbour drawn with plain shapes plus a rotating tip.
 * Replace the scene with Albion-style illustrations later (ports, forests, markets).
 */
export function LoadingScreen({ message }: { message?: string }) {
  const [tip, setTip] = useState(() => Math.floor(Math.random() * tr.tips.length));
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % tr.tips.length), 4500);
    return () => clearInterval(t);
  }, []);

  const sky = ['#2b2340', '#4a2f45', '#7a4a3f', '#b9713f', '#d9954a'];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {sky.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
        <View style={{ position: 'absolute', bottom: '52%', left: '58%', width: 70, height: 70, borderRadius: 35, backgroundColor: '#f2c27a', opacity: 0.9 }} />
        {/* hills */}
        <View style={{ position: 'absolute', bottom: '22%', left: -60, width: 320, height: 160, borderRadius: 160, backgroundColor: '#2c2420' }} />
        <View style={{ position: 'absolute', bottom: '20%', right: -80, width: 360, height: 180, borderRadius: 180, backgroundColor: '#241d19' }} />
        {/* harbour: towers and a ship */}
        <View style={{ position: 'absolute', bottom: '22%', left: '18%', width: 26, height: 90, backgroundColor: '#1a1512' }} />
        <View style={{ position: 'absolute', bottom: '22%', left: '26%', width: 40, height: 60, backgroundColor: '#1a1512' }} />
        <View style={{ position: 'absolute', bottom: '22%', left: '22%', width: 14, height: 120, backgroundColor: '#1a1512' }} />
        <View style={{ position: 'absolute', bottom: '19%', right: '20%', width: 90, height: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: '#1a1512' }} />
        <View style={{ position: 'absolute', bottom: '21%', right: '29%', width: 4, height: 70, backgroundColor: '#1a1512' }} />
        <View style={{ position: 'absolute', bottom: '27%', right: '25%', width: 34, height: 40, backgroundColor: '#3b302a', opacity: 0.9 }} />
        {/* sea */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', backgroundColor: '#1b2230' }} />
        <View style={{ position: 'absolute', bottom: '12%', left: '30%', width: 120, height: 2, backgroundColor: '#d9954a', opacity: 0.5 }} />
        <View style={{ position: 'absolute', bottom: '8%', left: '45%', width: 70, height: 2, backgroundColor: '#d9954a', opacity: 0.35 }} />
        <View style={{ position: 'absolute', top: 48, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#f4e6cf', fontSize: 34, fontWeight: '800', letterSpacing: 2 }}>TOZ VE DEMİR</Text>
          <Text style={{ color: '#f4e6cf', opacity: 0.8, marginTop: 4 }}>Liman Kenti · Akşam</Text>
        </View>
      </View>
      <View style={{ padding: 20, gap: 10, minHeight: 150, borderTopWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.muted }}>{message ?? 'Yükleniyor…'}</Text>
        </View>
        <Text style={{ color: colors.accent, fontSize: 12, letterSpacing: 1 }}>İPUCU</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>{tr.tips[tip]}</Text>
      </View>
    </View>
  );
}
