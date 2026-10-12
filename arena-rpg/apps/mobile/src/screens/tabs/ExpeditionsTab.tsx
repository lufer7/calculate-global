import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { game } from '@arena/core';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import type { SceneKey } from '../../art/Scene';
import { TrailMap } from '../../art/TrailMap';
import { Bar, Button, Card, Checkbox, ErrorText, Pill, SectionTitle } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const BLURB: Record<string, string> = {
  dark_forest: 'Çam iğneleri arasında yaban domuzu izleri ve unutulmuş avcı kulübeleri.',
  misty_marsh: 'Sis hiç kalkmaz. Kamışların arasında batmış kervanların sandıkları yatar.',
  abandoned_mines: 'Cevher bitti, madenciler gitti. Karanlıkta başka şeyler kaldı.',
  lost_lands: 'Haritalarda olmayan yer. Yalnızca yolu bilen Gözcüler dönebilir.',
};

const N = game.STAGES_PER_ZONE;

export function ExpeditionsTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const { width: screenW } = useWindowDimensions();
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [luck, setLuck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const idle = state.fighters.filter((f) => f.status === 'idle');
  const canHidden = state.fighters.some((f) => (f.skills.lost_lands ?? 0) > 0);
  const zones = Object.values(game.ZONES).filter((z) => !z.hidden || canHidden);
  const perkCut = game.accountPerks(state.account.mainClass).expeditionDurationReduction;
  const used = state.expeditions.length;
  const cleared = (id: string) => Math.min(N, state.zoneProgress?.[id] ?? 0);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  const openZone = (id: string) => {
    setZoneId(id);
    setStage(Math.min(cleared(id) + 1, N));
    setPicked([]);
    setLuck(false);
    setError(null);
  };

  const running = state.expeditions.length > 0 && (
    <>
      <SectionTitle>Yoldaki seferler</SectionTitle>
      {state.expeditions.map((e) => {
        const z = game.ZONES[e.zoneId];
        const party = state.fighters.filter((f) => e.fighterIds.includes(f.id));
        const total = e.endsAt - e.startedAt;
        const stageName = game.ZONE_STAGES[e.zoneId]?.stageNames[(e.stage ?? 1) - 1];
        return (
          <Card key={e.id} style={{ borderColor: colors.trimDim }}>
            <View style={ui.between}>
              <View style={{ flex: 1 }}>
                <Text style={ui.h2}>{z?.name ?? e.zoneId}</Text>
                {stageName && <Text style={ui.muted}>{e.stage}. bölüm · {stageName}</Text>}
              </View>
              <Pill text={e.recalled ? 'Geri dönüyor' : 'Yolda'} color={colors.warn} />
            </View>
            <View style={ui.row}>{party.map((f) => <Portrait key={f.id} cls={f.class} size={30} />)}<Text style={ui.muted}>{party.map((f) => f.name).join(', ')}</Text></View>
            <Bar ratio={(now - e.startedAt) / total} color={colors.trim} label={`Dönüş ${formatDuration(e.endsAt - now)}`} />
            {!e.recalled && <Button title="Geri çağır (ödül alınmaz)" kind="ghost" small busy={busy === e.id} onPress={() => act(e.id, () => api.recall(e.id))} />}
          </Card>
        );
      })}
    </>
  );

  const zone = zoneId ? game.ZONES[zoneId] : null;
  if (zone) {
    const info = game.ZONE_STAGES[zone.id];
    const done = cleared(zone.id);
    const level = game.stageLevel(zone, stage);
    const duration = Math.round((game.stageDurationMs(zone, stage) * (1 - perkCut)) / state.gameSpeed);
    const party = state.fighters.filter((f) => picked.includes(f.id));
    const chance = party.length ? game.successChance(game.partyPower(party.map((f) => f.power)), level, stage) : null;
    const boss = stage === N;
    const mapW = Math.min(screenW - 28, 440);
    const active = state.expeditions.filter((e) => e.zoneId === zone.id).map((e) => e.stage);
    const chanceColor = chance === null ? colors.muted : chance >= 0.75 ? colors.good : chance >= 0.45 ? colors.warn : colors.danger;

    return (
      <View style={{ gap: 12 }}>
        <View style={ui.between}>
          <Pressable onPress={() => setZoneId(null)} hitSlop={10}><Text style={{ color: colors.trim, fontWeight: '800' }}>‹ Bölgeler</Text></Pressable>
          <Text style={[ui.muted, ui.num]}>Sefer yuvası {used} / {state.expeditionSlots}</Text>
        </View>
        <View>
          <Text style={[ui.h2, { fontSize: 22 }]}>{zone.name}</Text>
          <Text style={ui.muted}>{BLURB[zone.id]}</Text>
          <View style={[ui.row, { marginTop: 6, flexWrap: 'wrap' }]}>
            <Pill text={`Bölüm ${done}/${N}`} color={done >= N ? colors.good : colors.trim} />
            <Pill text={`Ödüller: altın + ${info?.rewardText ?? 'çeşitli ganimet'}`} color={colors.muted} />
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <TrailMap zoneId={zone.id} cleared={done} selected={stage} width={mapW} onSelect={(s) => { setStage(s); setError(null); }} activeStages={active} />
        </View>

        <Card trim>
          <View style={ui.between}>
            <View style={{ flex: 1 }}>
              <Text style={ui.label}>{stage}. bölüm{boss ? ' · Patron' : ''}</Text>
              <Text style={ui.h2}>{info?.stageNames[stage - 1] ?? `Bölüm ${stage}`}</Text>
            </View>
            {stage <= done ? <Pill text="✓ Geçildi" color={colors.good} /> : <Pill text="Sıradaki" color={colors.trim} />}
          </View>
          <Text style={ui.muted}>Önerilen Sv {level}+ · ~{formatDuration(duration)} · ganimet ×{game.stageLootMultiplier(stage).toFixed(2)}</Text>
          {boss && done < N && <Text style={{ color: colors.trim, fontSize: 13 }}>☠ İlk zaferde garantili nadir+ eşya.</Text>}

          <SectionTitle>Ekip</SectionTitle>
          {idle.length === 0 && <Text style={ui.muted}>Hazırda bekleyen dövüşçü yok.</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {idle.map((f) => {
              const on = picked.includes(f.id);
              return (
                <Pressable key={f.id} onPress={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])} style={{ alignItems: 'center', gap: 3, opacity: on ? 1 : 0.5 }}>
                  <Portrait cls={f.class} size={48} hpRatio={f.hpRatio} />
                  <Text style={{ color: on ? colors.trim : colors.muted, fontSize: 11, fontWeight: '800' }}>{on ? '✓ ' : ''}{f.name}</Text>
                  <Text style={{ color: colors.faint, fontSize: 10 }}>Sv {f.level} · {f.power}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 4 }}>
            <View style={ui.between}>
              <Text style={ui.text}>Başarı şansı</Text>
              <Text style={[ui.h2, ui.num, { color: chanceColor }]}>{chance === null ? '—' : `%${Math.round(chance * 100)}`}</Text>
            </View>
            {chance !== null && <Bar ratio={chance} color={chanceColor} />}
            <Text style={[ui.muted, { fontSize: 12 }]}>Başarısız seferde altının bir kısmı yine gelir ama ekipte yaralanma olabilir. Ek üyeler gücün üçte biri kadar katkı verir.</Text>
          </View>

          {state.luckPotions > 0 && (
            <Checkbox checked={luck} onChange={setLuck}>
              <Text style={ui.text}>Şans İksiri kullan (+%15 nadir ödül) · {state.luckPotions} adet</Text>
            </Checkbox>
          )}
          <ErrorText message={error} />
          <Button
            title={used >= state.expeditionSlots ? 'Boş sefer yuvası yok' : 'Sefere gönder'}
            busy={busy === 'send'}
            disabled={picked.length === 0 || used >= state.expeditionSlots}
            onPress={() => act('send', async () => { await api.startExpedition(zone.id, picked, luck, stage); setPicked([]); setLuck(false); })}
          />
        </Card>
        {running}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Sefer yuvası</Text>
          <Text style={[ui.h2, ui.num, { color: used >= state.expeditionSlots ? colors.warn : colors.text }]}>{used} / {state.expeditionSlots}</Text>
        </View>
        <Text style={ui.muted}>Her bölgede 10 bölüm var; her bölüm bir öncekinden zor. Bir bölgeye dokun, haritada kaldığın yerden devam et.</Text>
        {state.gameSpeed > 1 && <Text style={{ color: colors.warn, fontSize: 12 }}>Test modu: süreler {state.gameSpeed} kat hızlı.</Text>}
      </Card>

      {running}

      <SectionTitle>Keşif bölgeleri</SectionTitle>
      {zones.map((z) => {
        const done = cleared(z.id);
        return (
          <Pressable key={z.id} onPress={() => openZone(z.id)} style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }}>
            <Scene name={z.id as SceneKey} height={110} style={{ borderRadius: 0 }}>
              <View style={{ flex: 1, justifyContent: 'space-between', padding: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Pill text={done >= N ? '✓ Tamamlandı' : `Bölüm ${done}/${N}`} color={done >= N ? '#bdf0c0' : '#f2e6cc'} />
                  {state.prophecyZone === z.id && <Pill text="★ Bugünün kehaneti" color="#f2e6ff" />}
                </View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>{z.name}</Text>
                  <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Sv {z.minLevel}+ · {game.ZONE_STAGES[z.id]?.rewardText ?? ''}</Text>
                </View>
              </View>
            </Scene>
            <View style={{ height: 4, backgroundColor: colors.bgDeep }}>
              <View style={{ width: `${(done / N) * 100}%`, height: 4, backgroundColor: colors.trim }} />
            </View>
          </Pressable>
        );
      })}
      <ErrorText message={error} />
    </View>
  );
}
