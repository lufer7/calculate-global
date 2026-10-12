import { Pressable, ScrollView, Text, View } from 'react-native';
import type { SaveGame } from '@arena/core';
import { ENERGY_MAX, STAT_KEYS, combatProfile, currentEnergy, xpToNextLevel } from '@arena/core';
import { tr } from '../i18n/tr';
import { ui } from './theme';

export function HomeScreen({ save, onOpenPrivacy }: { save: SaveGame; onOpenPrivacy: () => void }) {
  const c = save.character;
  const profile = combatProfile(c);
  const energy = currentEnergy(save.energy, Date.now());

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Text style={ui.title}>{c.name}</Text>
      <Text style={ui.text}>
        {tr.origins[c.origin].name} · Seviye {c.level} · {c.xp}/{xpToNextLevel(c.level)} TP
      </Text>
      <View style={ui.panel}>
        <Text style={ui.text}>Altın: {save.gold}</Text>
        <Text style={ui.text}>Enerji: {energy.value}/{ENERGY_MAX}</Text>
        <Text style={ui.text}>Can: {profile.maxHp} · Hasar: {profile.damageMin}-{profile.damageMax} · Zırh: {profile.armor}</Text>
      </View>
      <View style={ui.panel}>
        {STAT_KEYS.map((k) => (
          <Text key={k} style={ui.text}>
            {tr.stats[k]}: {c.stats[k]}
          </Text>
        ))}
      </View>
      {/* Next steps: QuestScreen (startQuest/claimQuest), ShopScreen (buyItem), SmithScreen (upgradeItem), ArenaScreen (api.fight) */}
      <Pressable style={ui.ghostButton} onPress={onOpenPrivacy}>
        <Text style={ui.ghostButtonText}>Gizlilik, Yedekleme ve Veri Silme</Text>
      </Pressable>
    </ScrollView>
  );
}
