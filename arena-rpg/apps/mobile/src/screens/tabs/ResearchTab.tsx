import { useState } from 'react';
import { Text, View } from 'react-native';
import { game } from '@arena/core';
import { Scene } from '../../art/Scene';
import { Bar, Button, Card, ErrorText, Gold } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

/** "Rasathane" – the research tab. */
export function ResearchTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = state.account.activeResearch;
  const perk = game.accountPerks(state.account.mainClass).researchDurationReduction;

  return (
    <View style={{ gap: 12 }}>
      <Scene name="study" height={120}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>KAFA KAZANI</Text>
          <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Üç yaşlı bilge, bir kepçe ve bitmeyen bir tartışma. Bir seferde tek fikir kaynar.</Text>
        </View>
      </Scene>
      {perk > 0 && <Text style={{ color: colors.seer }}>Yıldız Okuru: araştırmalar %{Math.round(perk * 100)} daha kısa.</Text>}
      {Object.values(game.RESEARCH).map((def) => {
        const level = state.account.research[def.id] ?? 0;
        const next = level + 1;
        const running = active?.id === def.id;
        const maxed = level >= def.maxLevel;
        const duration = maxed ? 0 : Math.round(game.researchDuration(def, next, [perk]) / state.gameSpeed);
        return (
          <Card key={def.id}>
            <View style={ui.between}>
              <Text style={ui.h2}>{def.name}</Text>
              <Text style={ui.muted}>Sv {level}/{def.maxLevel}</Text>
            </View>
            <Text style={ui.muted}>{def.description}</Text>
            <Bar ratio={level / def.maxLevel} />
            {running && active ? (
              <Text style={[ui.text, { color: colors.warn }]}>Kaynıyor… Sv {active.level} için {formatDuration(active.until - now)}</Text>
            ) : maxed ? (
              <Text style={{ color: colors.good }}>Tamamlandı</Text>
            ) : (
              <>
                <View style={ui.between}><Text style={ui.text}>Sv {next} · ~{formatDuration(duration)}</Text><Gold amount={def.cost(next)} size={13} /></View>
                <Button
                  title="Kazana at"
                  busy={busy}
                  disabled={!!active || state.account.gold < def.cost(next)}
                  onPress={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await api.startResearch(def.id);
                      await refresh();
                    } catch (e) {
                      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </>
            )}
          </Card>
        );
      })}
      <ErrorText message={error} />
    </View>
  );
}
