import { useState } from 'react';
import { Text, View } from 'react-native';
import { game } from '@arena/core';
import { Bar, Button, Card, ErrorText } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

/** "Kafa Kazanı" – the research tab. */
export function ResearchTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = state.account.activeResearch;
  const perk = game.accountPerks(state.account.mainClass).researchDurationReduction;

  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.muted}>Kazanın başında üç yaşlı bilge, bir kepçe ve sonsuz bir tartışma. Bir seferde tek araştırma kaynar.</Text>
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
                <Text style={ui.text}>Sv {next}: {def.cost(next)} altın · ~{formatDuration(duration)}</Text>
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
