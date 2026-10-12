import { Pressable, Text, View } from 'react-native';
import { NavIcon } from '../../art/NavIcon';
import { Card } from '../../components/ui';
import type { GameState } from '../../lib/api';
import { colors, ui } from '../theme';

export type MoreId = 'research' | 'alchemy' | 'reports' | 'account';

const ITEMS: { id: MoreId; icon: string; title: string; sub: string }[] = [
  { id: 'research', icon: 'cauldron', title: 'Kafa Kazanı', sub: 'Araştırmalar: sefer yuvaları ve fazlası' },
  { id: 'alchemy', icon: 'flask', title: 'Simya', sub: 'Avcı malzemelerinden iksir kaynat' },
  { id: 'reports', icon: 'scroll', title: 'Raporlar', sub: 'Sefer ve araştırma sonuçları' },
  { id: 'account', icon: 'user', title: 'Hesap ve gizlilik', sub: 'Verilerin, KVKK başvuruları, çıkış' },
];

export function MoreTab({ state, onOpen }: { state: GameState; onOpen: (id: MoreId) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {ITEMS.map((it) => (
        <Pressable key={it.id} onPress={() => onOpen(it.id)} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.trimDim, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inset }}>
              <NavIcon name={it.icon} color={colors.trim} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.h2}>{it.title}{it.id === 'reports' && state.unreadReports > 0 ? `  (${state.unreadReports})` : ''}</Text>
              <Text style={ui.muted}>{it.sub}</Text>
            </View>
            <Text style={{ color: colors.trim, fontSize: 20 }}>›</Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
