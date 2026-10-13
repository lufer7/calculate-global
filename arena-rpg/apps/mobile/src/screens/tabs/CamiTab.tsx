import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { HasanHoca } from '../../art/HasanHoca';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { Bar, Button, Card, ErrorText, SectionTitle } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const LINES = [
  'Yine mi yaralı geldiniz? Yatırın şunları, ses etmeyin.',
  'Burada ücret yok, acele de yok. Can dediğin yavaş gelir.',
  'Arenada kafa kırıp sonra bana getiriyorsunuz… Neyse, geçmiş olsun.',
  'Ayakkabılar kapıda. Sonra konuşuruz.',
  'Dinlenen dövüşçü savaşamaz. Sabır, evlat.',
  'Yemek parası yok mu? Olsun. Burası herkese açık.',
];

/** Cami: Hasan Hoca lets wounded fighters rest — free, but slower than food. */
export function CamiTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [line, setLine] = useState(() => Math.floor(Math.random() * LINES.length));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rate = game.CAMI_HEAL_PER_HOUR * (1 + state.researchEffects.restHeal);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
      setLine((i) => (i + 1) % LINES.length);
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Scene name="cami" height={130}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>Cami</Text>
          <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Avluda serin bir gölge, içeride sessizlik.</Text>
        </View>
      </Scene>

      <Pressable onPress={() => setLine((i) => (i + 1) % LINES.length)} accessibilityRole="button" accessibilityLabel="Hasan Hoca ile konuş">
        <Card trim style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <HasanHoca size={92} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[ui.label, { fontSize: 12 }]}>Hasan Hoca</Text>
            <View style={{ backgroundColor: colors.inset, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.trimDim }}>
              <Text style={[ui.text, { fontStyle: 'italic' }]}>“{LINES[line]}”</Text>
            </View>
          </View>
        </Card>
      </Pressable>

      <Card>
        <Text style={ui.muted}>
          Canı azalan dövüşçülerini buraya yatır: ücretsiz, saatte %{Math.round(rate * 100)} iyileşir (kendi halinde %{Math.round(game.HP_REGEN_PER_HOUR * 100)}).
          Can dolunca kendiliğinden kalkar; istersen erken de kaldırabilirsin, o ana kadar iyileştiği kalır. Dinlenen dövüşçü savaşamaz ve keşfe çıkamaz.
          {state.researchEffects.restEnergy > 0 ? ` Derin Uyku: dinlenirken enerji %${Math.round(state.researchEffects.restEnergy * 100)} daha hızlı dolar.` : ''}
        </Text>
      </Card>
      <ErrorText message={error} />

      <SectionTitle>Dövüşçüler</SectionTitle>
      {state.fighters.map((f) => {
        const resting = f.status === 'resting';
        const full = f.hpRatio >= 1;
        const toFull = Math.round(game.restTimeToFull(f.hpRatio, rate) / state.gameSpeed);
        return (
          <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, ...(resting ? { borderColor: colors.trimDim } : {}) }}>
            <Portrait cls={f.class} size={46} hpRatio={f.hpRatio} injured={f.status === 'injured'} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[ui.text, { fontWeight: '800' }]}>{f.name} <Text style={ui.muted}>Sv {f.level}</Text></Text>
              <Bar ratio={f.hpRatio} color={colors.hp} label={`Can %${Math.round(f.hpRatio * 100)}`} />
              <Text style={{ color: resting ? colors.good : colors.faint, fontSize: 11 }}>
                {resting ? `Dinleniyor · dolmasına ${formatDuration((f.statusUntil ?? now) - now)}` : f.status !== 'idle' ? tr.status[f.status] : full ? 'Canı dolu' : `Yatarsa ${formatDuration(toFull)} içinde dolar`}
              </Text>
            </View>
            {resting
              ? <Button title="Kaldır" kind="ghost" small busy={busy === f.id} onPress={() => act(f.id, () => api.camiWake(f.id))} />
              : <Button title="Yatır" small disabled={full || f.status !== 'idle'} busy={busy === f.id} onPress={() => act(f.id, () => api.camiRest(f.id))} />}
          </Card>
        );
      })}
    </View>
  );
}
