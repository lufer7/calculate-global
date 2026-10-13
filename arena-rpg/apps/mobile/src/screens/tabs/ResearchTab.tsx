import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Scene } from '../../art/Scene';
import { Bar, Button, Card, ErrorText, Gold } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const BRANCH_ORDER: game.ResearchBranch[] = ['war', 'hunt', 'trade', 'healing'];
const depth = (d: game.ResearchDefinition): number => (d.requires ? 1 + depth(game.RESEARCH[d.requires.id]!) : 0);

/** Rasathane: a research tree in four branches; one research at a time. */
export function ResearchTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [branch, setBranch] = useState<game.ResearchBranch>('war');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const active = state.account.activeResearch;
  const levels = state.account.research;
  const perk = game.accountPerks(state.account.mainClass).researchDurationReduction;
  const list = Object.values(game.RESEARCH).filter((d) => d.branch === branch);
  const activeDef = active ? game.RESEARCH[active.id] : undefined;

  const start = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.startResearch(id);
      await refresh();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Scene name="study" height={110}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>RASATHANE</Text>
          <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Yıldızlar, haritalar ve bitmeyen hesaplar. Bir seferde tek araştırma.</Text>
        </View>
      </Scene>

      {active && activeDef && (
        <Card trim>
          <Text style={ui.label}>Süren araştırma</Text>
          <Text style={ui.h2}>{activeDef.name} · Sv {active.level}</Text>
          <Text style={{ color: colors.warn }}>Bitmesine {formatDuration(active.until - now)}</Text>
        </Card>
      )}
      {perk > 0 && <Text style={{ color: colors.seer }}>Yıldız Okuru: araştırmalar %{Math.round(perk * 100)} daha kısa.</Text>}

      <View style={{ flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {BRANCH_ORDER.map((b) => {
          const on = b === branch;
          const done = Object.values(game.RESEARCH).filter((d) => d.branch === b).reduce((s, d) => s + (levels[d.id] ?? 0), 0);
          return (
            <Pressable key={b} onPress={() => setBranch(b)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: on ? '#c9a55c26' : colors.panel }}>
              <Text style={{ color: on ? colors.text : colors.muted, fontWeight: '800', fontSize: 12 }}>{game.RESEARCH_BRANCHES[b].name}</Text>
              <Text style={{ color: colors.faint, fontSize: 10 }}>{done} seviye</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={ui.muted}>{game.RESEARCH_BRANCHES[branch].blurb}</Text>
      <ErrorText message={error} />

      {list.map((d) => {
        const level = levels[d.id] ?? 0;
        const next = level + 1;
        const maxed = level >= d.maxLevel;
        const locked = !!d.requires && (levels[d.requires.id] ?? 0) < d.requires.level;
        const running = active?.id === d.id;
        const dur = maxed ? 0 : Math.round(game.researchDuration(d, next, [perk]) / state.gameSpeed);
        const indent = depth(d) * 16;
        return (
          <View key={d.id} style={{ flexDirection: 'row', marginLeft: indent }}>
            {indent > 0 && <View style={{ width: 2, backgroundColor: locked ? colors.border : colors.trimDim, marginRight: 8, borderRadius: 1 }} />}
            <Card style={{ flex: 1, opacity: locked ? 0.6 : 1, ...(running ? { borderColor: colors.warn } : {}) }}>
              <View style={ui.between}>
                <Text style={[ui.h2, { flex: 1 }]}>{d.name}</Text>
                <Text style={ui.muted}>Sv {level}/{d.maxLevel}</Text>
              </View>
              <Text style={ui.text}>{d.description.replace('{v}', game.researchValueText(d, Math.max(1, next > d.maxLevel ? level : next)))}</Text>
              <Text style={{ color: colors.faint, fontSize: 11 }}>
                Şu an: {level > 0 ? game.researchValueText(d, level) : 'yok'}{!maxed ? ` → Sv ${next}: ${game.researchValueText(d, next)}` : ''}
              </Text>
              <Bar ratio={level / d.maxLevel} />
              {locked && d.requires && <Text style={{ color: colors.warn, fontSize: 12 }}>🔒 Önce {game.RESEARCH[d.requires.id]!.name} Sv {d.requires.level}</Text>}
              {running && active ? (
                <Text style={{ color: colors.warn }}>Sürüyor… {formatDuration(active.until - now)}</Text>
              ) : maxed ? (
                <Text style={{ color: colors.good }}>Tamamlandı</Text>
              ) : !locked && (
                <View style={[ui.between, { gap: 8 }]}>
                  <View>
                    <Gold amount={d.cost(next)} size={13} />
                    <Text style={{ color: colors.faint, fontSize: 11 }}>~{formatDuration(dur)}</Text>
                  </View>
                  <Button title="Araştır" small busy={busy === d.id} disabled={!!active || state.account.gold < d.cost(next)} onPress={() => start(d.id)} />
                </View>
              )}
            </Card>
          </View>
        );
      })}
    </View>
  );
}
