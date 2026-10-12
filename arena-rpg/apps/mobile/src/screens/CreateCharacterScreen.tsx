import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { OriginId, SaveGame, StatKey, Stats } from '@arena/core';
import { BASE_STAT, CREATION_POINTS, ORIGINS, ORIGIN_IDS, STAT_KEYS, createCharacter, emptyStats, newSave, sumStats } from '@arena/core';
import { tr } from '../i18n/tr';
import { random } from '../lib/random';
import { writeSave } from '../storage/saveRepository';
import { colors, ui } from './theme';

export function CreateCharacterScreen({ onCreated }: { onCreated: (save: SaveGame) => void }) {
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState<OriginId>('dockhand');
  const [allocation, setAllocation] = useState<Stats>(emptyStats());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = CREATION_POINTS - sumStats(allocation);
  const originBonus: Partial<Stats> = ORIGINS[origin];
  const preview = useMemo(
    () => Object.fromEntries(STAT_KEYS.map((k) => [k, BASE_STAT + (originBonus[k] ?? 0) + allocation[k]])) as Stats,
    [allocation, originBonus],
  );

  const adjust = (k: StatKey, d: 1 | -1) => {
    if ((d === 1 && remaining === 0) || (d === -1 && allocation[k] === 0)) return;
    setAllocation({ ...allocation, [k]: allocation[k] + d });
  };

  const submit = async () => {
    const result = createCharacter({ name, origin, allocation }, { random, now: Date.now() });
    if (!result.ok) {
      setError(tr.errors[result.error] ?? result.error);
      return;
    }
    setBusy(true);
    try {
      const save = newSave(result.value, Date.now());
      await writeSave(save); // local SQLite only – nothing leaves the device
      onCreated(save);
    } catch {
      setError('Kayıt cihaza yazılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Text style={ui.title}>Yeni Dövüşçü</Text>

      <Text style={ui.label}>İsim (yalnızca bu cihazda kalır)</Text>
      <TextInput
        style={ui.input}
        value={name}
        onChangeText={setName}
        maxLength={16}
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        placeholder="ör. Kara Demir"
        placeholderTextColor={colors.muted}
      />

      <Text style={ui.label}>Köken</Text>
      {ORIGIN_IDS.map((id) => (
        <Pressable
          key={id}
          onPress={() => setOrigin(id)}
          style={[ui.panel, origin === id && { borderColor: colors.accent }]}
          accessibilityRole="radio"
          accessibilityState={{ selected: origin === id }}
        >
          <Text style={ui.text}>{tr.origins[id].name}</Text>
          <Text style={{ color: colors.muted }}>{tr.origins[id].blurb}</Text>
        </Pressable>
      ))}

      <Text style={ui.label}>Stat Puanları — kalan: {remaining}</Text>
      <View style={ui.panel}>
        {STAT_KEYS.map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={ui.text}>{tr.stats[k]}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Stepper label="−" onPress={() => adjust(k, -1)} />
              <Text style={[ui.text, { width: 28, textAlign: 'center' }]}>{preview[k]}</Text>
              <Stepper label="+" onPress={() => adjust(k, 1)} />
            </View>
          </View>
        ))}
      </View>

      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, (remaining !== 0 || busy) && { opacity: 0.5 }]} disabled={remaining !== 0 || busy} onPress={submit}>
        <Text style={ui.buttonText}>Arenaya Çık</Text>
      </Pressable>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Hesap açılmaz, kişisel veri istenmez. İlerlemen yalnızca bu cihazda şifreli saklanır.
      </Text>
    </ScrollView>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[ui.ghostButton, { width: 36, paddingVertical: 4 }]} hitSlop={8}>
      <Text style={ui.ghostButtonText}>{label}</Text>
    </Pressable>
  );
}
