import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Banner } from '../../art/Banner';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { FighterPicker } from '../../components/FighterPicker';
import { Bar, Button, Card, EnergyBar, ErrorText, Pill, SectionTitle } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { ArenaInfo, ArenaOpponent, FightResult, GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { BattleReplay } from '../BattleReplay';
import { classColor, colors, ui } from '../theme';

export function ArenaTab({ state, fighterId, setFighterId, now, refresh }: { state: GameState; fighterId: string; setFighterId: (id: string) => void; now: number; refresh: () => Promise<void> }) {
  const [info, setInfo] = useState<ArenaInfo | null>(null);
  const [result, setResult] = useState<FightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<'fight' | 'ranking'>('fight');
  const fighter = state.fighters.find((f) => f.id === fighterId) ?? state.fighters[0]!;

  const load = useCallback(async () => {
    try {
      setInfo(await api.arena(fighter.id));
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  }, [fighter.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const blocked = fighter.status !== 'idle' ? tr.status[fighter.status] : fighter.energy.value < 1 ? 'Enerjisi bitti (7 dakikada 1 dolar)' : fighter.hpRatio < (info?.minHp ?? 0.15) ? 'Canı çok düşük' : null;

  const challenge = async (type: 'npc' | 'player', o: ArenaOpponent) => {
    setBusy(`${type}${o.id}`);
    setError(null);
    try {
      setResult(await api.fight(fighter.id, { type, id: o.id }));
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  const opponentCard = (type: 'npc' | 'player', o: ArenaOpponent) => {
    const ratio = o.power / Math.max(1, fighter.power);
    const odds = ratio < 0.85 ? ['Kolay', colors.good] : ratio < 1.15 ? ['Denk', colors.warn] : ['Zorlu', colors.danger];
    return (
      <Card key={`${type}${o.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Portrait cls={o.class} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[ui.text, { fontWeight: '800' }]} numberOfLines={1}>{o.name}</Text>
          <Text style={ui.muted} numberOfLines={1}>{tr.classes[o.class].name} · Sv {o.level}{o.owner ? ` · ${o.clanTag ? `[${o.clanTag}] ` : ''}${o.owner}` : ''}</Text>
          <View style={ui.row}><Pill text={`Güç ${o.power}`} color={classColor(o.class)} /><Pill text={odds[0]!} color={odds[1]} /></View>
        </View>
        <Button title="Saldır" small disabled={!!blocked} busy={busy === `${type}${o.id}`} onPress={() => challenge(type, o)} />
      </Card>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Scene name="arena" height={120}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>ARENA</Text>
          <Text style={{ color: '#fff', textShadowColor: '#000', textShadowRadius: 4 }}>Her dövüş 1 enerji. Bir oyuncuyu yenersen altınının ~%30'unu alırsın.</Text>
        </View>
      </Scene>
      <FighterPicker fighters={state.fighters} selectedId={fighter.id} onSelect={setFighterId} />
      <Card trim>
        <View style={ui.between}>
          <Text style={[ui.h2, { color: classColor(fighter.class) }]}>{fighter.name}</Text>
          <Pill text={`Güç ${fighter.power}`} color={colors.trim} />
        </View>
        <Bar ratio={fighter.hpRatio} color={colors.hp} label={`Can %${Math.round(fighter.hpRatio * 100)}`} />
        <EnergyBar energy={fighter.energy} />
        {state.arenaShieldUntil && <Text style={{ color: colors.good, fontSize: 12 }}>🛡 Yakın zamanda soyuldun: {formatDuration(state.arenaShieldUntil - now)} boyunca altının çalınamaz.</Text>}
        <Text style={ui.muted}>Şöhret {fighter.arena.points} · {fighter.arena.wins} galibiyet · {fighter.arena.losses} yenilgi</Text>
        {blocked && <Text style={{ color: colors.warn }}>{blocked}{fighter.hpRatio < 0.15 ? ' · Envanterden yiyecek yedir.' : ''}</Text>}
      </Card>
      <View style={ui.row}>
        {(['fight', 'ranking'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} style={{ flex: 1, paddingVertical: 9, borderBottomWidth: 2, borderColor: view === v ? colors.trim : colors.border }}>
            <Text style={{ textAlign: 'center', color: view === v ? colors.text : colors.muted, fontWeight: '800' }}>{v === 'fight' ? 'Rakipler' : 'Şöhret sıralaması'}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText message={error} />
      {view === 'fight' && info && (
        <>
          <SectionTitle>Arena dövüşçüleri</SectionTitle>
          {info.npcs.map((o) => opponentCard('npc', o))}
          <SectionTitle>Diğer çeteler</SectionTitle>
          {info.players.length === 0 ? <Text style={ui.muted}>Seviyene yakın başka oyuncu yok.</Text> : info.players.map((o) => opponentCard('player', o))}
        </>
      )}
      {view === 'ranking' && info && (
        <Card>
          {info.ranking.map((r, i) => (
            <View key={`${r.name}${i}`} style={[ui.between, { paddingVertical: 4, borderBottomWidth: i < info.ranking.length - 1 ? 1 : 0, borderColor: colors.border }]}>
              <Text style={[ui.text, ui.num, { width: 28, color: i < 3 ? colors.trim : colors.muted, fontWeight: '800' }]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700', color: classColor(r.class) }]} numberOfLines={1}>{r.name}</Text>
                <Text style={ui.muted} numberOfLines={1}>{r.clanTag ? `[${r.clanTag}] ` : ''}{r.owner} · Sv {r.level}</Text>
              </View>
              <Text style={[ui.text, ui.num, { fontWeight: '800' }]}>{r.points}</Text>
            </View>
          ))}
        </Card>
      )}
      {view === 'ranking' && info && info.clanRanking.length > 0 && (
        <>
          <SectionTitle>Sancak sıralaması</SectionTitle>
          <Card>
            {info.clanRanking.map((c, i) => (
              <View key={c.tag} style={[ui.between, { paddingVertical: 4, gap: 8 }]}>
                <Text style={[ui.text, ui.num, { width: 22, color: i < 3 ? colors.trim : colors.muted, fontWeight: '800' }]}>{i + 1}</Text>
                <Banner color={c.color} symbol={c.symbol} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={[ui.text, { fontWeight: '700' }]} numberOfLines={1}>{c.name} <Text style={{ color: colors.trim }}>[{c.tag}]</Text></Text>
                  <Text style={ui.muted}>{c.members} üye</Text>
                </View>
                <Text style={[ui.text, ui.num, { fontWeight: '800' }]}>{c.points}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
      {result && <BattleReplay result={result} onClose={async () => { setResult(null); await refresh(); await load(); }} />}
    </View>
  );
}
