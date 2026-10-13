import { Pressable, ScrollView, Text, View } from 'react-native';
import { Portrait } from '../art/Portrait';
import type { FighterView } from '../lib/api';
import { classColor, colors } from '../screens/theme';

/** Horizontal strip of fighter portraits; the selected one gets a gold underline. */
export function FighterPicker({ fighters, selectedId, onSelect, size = 46 }: { fighters: FighterView[]; selectedId: string; onSelect: (id: string) => void; size?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
      {fighters.map((f) => {
        const on = f.id === selectedId;
        return (
          <Pressable key={f.id} onPress={() => onSelect(f.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ alignItems: 'center', gap: 4, opacity: on ? 1 : 0.6 }}>
            <Portrait cls={f.class} size={size} hpRatio={f.hpRatio} injured={f.status === 'injured'} />
            <Text style={{ color: on ? colors.text : colors.muted, fontSize: 11, fontWeight: '700', maxWidth: size + 20 }} numberOfLines={1}>{f.name}</Text>
            <Text style={{ color: f.energy.value > 0 ? colors.energy : colors.danger, fontSize: 10, fontWeight: '800' }}>⚡{f.energy.value}/{f.energy.max}</Text>
            <View style={{ height: 2, width: size, backgroundColor: on ? classColor(f.class) : 'transparent' }} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
