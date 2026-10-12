import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Portrait } from '../art/Portrait';
import { Button, ErrorText, Field, Pill } from '../components/ui';
import { tr } from '../i18n/tr';
import { ApiError, api } from '../lib/api';
import { classColor, colors, ui } from './theme';

/** First fighter = main class: its perk applies to the whole account for good. */
export function CreateFighterScreen({ isFirst, onCreated, onCancel }: { isFirst: boolean; onCreated: () => void; onCancel?: () => void }) {
  const [cls, setCls] = useState<game.ClassId>('scout');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createFighter(name, cls);
      onCreated();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
      <Text style={ui.title}>{isFirst ? 'Çetenin reisini seç' : 'Çeteye yeni üye'}</Text>
      {isFirst && (
        <Text style={ui.muted}>
          Reisin sınıfı çetenin ana sınıfı olur. Ana sınıfın avantajı çetedeki herkese kalıcı olarak geçer ve sonradan değişmez. Her yeni dövüşçü başlangıç ekipmanıyla gelir.
        </Text>
      )}
      {game.CLASS_IDS.map((id) => {
        const selected = cls === id;
        const perk = game.MAIN_CLASS_PERKS[id];
        return (
          <Pressable key={id} onPress={() => setCls(id)} accessibilityRole="radio" accessibilityState={{ selected }}
            style={[ui.panel, { borderColor: selected ? classColor(id) : colors.border, borderWidth: selected ? 2 : 1 }]}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Portrait cls={id} size={70} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={ui.between}>
                  <Text style={[ui.h2, { color: classColor(id) }]}>{tr.classes[id].name}</Text>
                  <Pill text={tr.classes[id].tagline} color={classColor(id)} />
                </View>
                <Text style={ui.text}>{tr.classes[id].blurb}</Text>
                <Text style={ui.muted}>Savaş tarzı: {game.CLASSES[id].combatStyle}</Text>
              </View>
            </View>
            {isFirst && (
              <View style={{ gap: 4, marginTop: 4 }}>
                <Text style={[ui.label, { color: classColor(id) }]}>Ana sınıf avantajı · {perk.title}</Text>
                {perk.lines.map((l) => <Text key={l} style={ui.text}>• {l}</Text>)}
              </View>
            )}
          </Pressable>
        );
      })}
      <Field label="Dövüşçü adı" value={name} onChangeText={setName} maxLength={16} placeholder="ör. Kara Demir" />
      <Text style={ui.muted}>Ad, diğer oyunculara görünebilir ve yönetim tarafından denetlenir. Uygunsuz adlar değiştirilir.</Text>
      <ErrorText message={error} />
      <Button title={isFirst ? 'Ana karakteri oluştur' : 'Dövüşçüyü oluştur'} busy={busy} disabled={name.trim().length < 3} onPress={create} />
      {onCancel && <Button title="Vazgeç" kind="ghost" onPress={onCancel} />}
    </ScrollView>
  );
}
