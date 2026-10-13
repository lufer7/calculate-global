import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { Slider } from '../../components/Slider';
import { Bar, Button, Card, Checkbox, ErrorText, Gold, Pill, SectionTitle } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const MIN = 60_000;
const HOUR = 60 * MIN;
const E = game.EXPLORATION;

/** "bugün 23:15", "yarın 07:45" or a date — the time the party walks back in. */
export function clockText(t: number, now: number): string {
  const d = new Date(t);
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const day = (x: number) => Math.floor((x - new Date(x).getTimezoneOffset() * MIN) / (24 * HOUR));
  const diff = day(t) - day(now);
  if (diff === 0) return `bugün ${hm}`;
  if (diff === 1) return `yarın ${hm}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${hm}`;
}

const hours = (ms: number) => {
  const h = Math.floor(ms / HOUR);
  const m = Math.round((ms % HOUR) / MIN);
  return h && m ? `${h} sa ${m} dk` : h ? `${h} saat` : `${m} dk`;
};

/**
 * Keşif: long, player-timed trips. Slide the travel and exploring time and watch the
 * return clock move, e.g. so the party is back when you wake up.
 */
export function ExplorationTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [travel, setTravel] = useState(E.travelMinMs);
  const [explore, setExplore] = useState(2 * HOUR);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [luck, setLuck] = useState(false);

  const idle = state.fighters.filter((f) => f.status === 'idle');
  const used = state.explorations.length;
  const party = state.fighters.filter((f) => picked.includes(f.id));
  const total = game.explorationTotalMs(travel, explore);
  const realTotal = Math.round(total / state.gameSpeed);
  const energyCost = game.explorationEnergyCost(total);
  const tired = party.filter((f) => f.energy.value < energyCost);
  const returnAt = now + realTotal;
  const bonus = game.explorationBonuses(party.length ? party : [{ skills: {} }], state.account.mainClass);
  const level = Math.max(1, ...party.map((f) => f.level));
  const est = game.explorationEstimate({ travelMs: travel, exploreMs: explore, level, pace: bonus.pace });
  const hasScout = party.some((f) => f.class === 'scout') || state.account.mainClass === 'scout';

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

  /** Fit the trip so the party is back at the given hour (next occurrence). */
  const backAt = (hour: number) => {
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    if (target.getTime() - now < HOUR) target.setDate(target.getDate() + 1);
    let left = Math.floor(((target.getTime() - now) * state.gameSpeed) / E.stepMs) * E.stepMs; // game time
    left = Math.max(2 * E.travelMinMs, Math.min(left, E.travelMaxMs * 2 + E.exploreMaxMs));
    let t: number = left >= 6 * HOUR ? HOUR : E.travelMinMs;
    if (left - 2 * t > E.exploreMaxMs) t = Math.min(E.travelMaxMs, Math.ceil((left - E.exploreMaxMs) / 2 / E.stepMs) * E.stepMs);
    setTravel(t);
    setExplore(Math.max(0, Math.min(E.exploreMaxMs, left - 2 * t)));
  };

  return (
    <View style={{ gap: 12 }}>
      <Scene name="lost_lands" height={110}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>Keşif</Text>
          <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Uzun yolculuklar · sefer ganimetinden daha değerli buluntular</Text>
        </View>
      </Scene>

      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Keşif yuvası</Text>
          <Text style={[ui.h2, ui.num, { color: used >= state.explorationSlots ? colors.warn : colors.text }]}>{used} / {state.explorationSlots}</Text>
        </View>
        <Text style={ui.muted}>Her 25 seviyede bir, en yüksek Gözcün bir keşif yuvası daha açar (Rasathane'deki Haritacılık da). Keşif, süresine göre enerji harcar. Yatmadan önce gönder, uyandığında ganimet hazır olsun.</Text>
        {state.gameSpeed > 1 && <Text style={{ color: colors.warn, fontSize: 12 }}>Test modu: süreler {state.gameSpeed} kat hızlı.</Text>}
      </Card>

      {state.explorations.length > 0 && <SectionTitle>Yoldaki keşifler</SectionTitle>}
      {state.explorations.map((x) => {
        const team = state.fighters.filter((f) => x.fighterIds.includes(f.id));
        const phase = x.recalled ? 'Geri dönüyor' : now < x.arriveAt ? 'Yolda (gidiş)' : now < x.leaveAt ? 'Keşfediyor' : 'Dönüş yolunda';
        return (
          <Card key={x.id} style={{ borderColor: colors.trimDim }}>
            <View style={ui.between}>
              <View style={ui.row}>{team.map((f) => <Portrait key={f.id} cls={f.class} size={30} />)}</View>
              <Pill text={phase} color={x.recalled ? colors.warn : colors.trim} />
            </View>
            <Text style={ui.muted}>{team.map((f) => f.name).join(', ')} · {hours(x.travelMs * 2 + x.exploreMs)}</Text>
            <PhaseBar start={x.startedAt} arrive={x.arriveAt} leave={x.leaveAt} end={x.endsAt} now={now} recalled={x.recalled} />
            <Text style={[ui.text, { fontWeight: '700' }]}>Dönüş: {clockText(x.endsAt, now)} · {formatDuration(x.endsAt - now)} kaldı</Text>
            {!x.recalled && <Button title="Geri çağır (ödül alınmaz)" kind="ghost" small busy={busy === x.id} onPress={() => act(x.id, () => api.recallExploration(x.id))} />}
          </Card>
        );
      })}

      <SectionTitle>Yeni keşif</SectionTitle>
      <Card trim>
        <Text style={ui.label}>Ekip</Text>
        {idle.length === 0 && <Text style={ui.muted}>Hazırda bekleyen dövüşçü yok.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {idle.map((f) => {
            const on = picked.includes(f.id);
            return (
              <Pressable key={f.id} onPress={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])} style={{ alignItems: 'center', gap: 3, opacity: on ? 1 : 0.5 }}>
                <Portrait cls={f.class} size={48} hpRatio={f.hpRatio} />
                <Text style={{ color: on ? colors.trim : colors.muted, fontSize: 11, fontWeight: '800' }}>{on ? '✓ ' : ''}{f.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 10 }}>{tr.classes[f.class].name} · Sv {f.level}</Text>
                <Text style={{ color: f.energy.value >= energyCost ? colors.energy : colors.danger, fontSize: 10, fontWeight: '800' }}>⚡{f.energy.value}/{f.energy.max}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 4, marginTop: 4 }}>
          <View style={ui.between}>
            <Text style={ui.text}>Gidiş süresi (dönüş de aynı)</Text>
            <Text style={[ui.text, ui.num, { fontWeight: '800', color: colors.trim }]}>{hours(travel)}</Text>
          </View>
          <Slider min={E.travelMinMs} max={E.travelMaxMs} step={E.stepMs} value={travel} onChange={setTravel} accessibilityLabel="Gidiş süresi" />
          <Text style={[ui.muted, { fontSize: 12 }]}>Uzak diyarlar az da olsa daha değerli buluntu demek.</Text>
        </View>
        <View style={{ gap: 4 }}>
          <View style={ui.between}>
            <Text style={ui.text}>Keşifte kalma süresi</Text>
            <Text style={[ui.text, ui.num, { fontWeight: '800', color: colors.trim }]}>{explore === 0 ? 'hemen dön' : hours(explore)}</Text>
          </View>
          <Slider min={E.exploreMinMs} max={E.exploreMaxMs} step={E.stepMs} value={explore} onChange={setExplore} accessibilityLabel="Keşifte kalma süresi" />
          <Text style={[ui.muted, { fontSize: 12 }]}>Uzun kalmak daha çok altın ve buluntu getirir; buluntuların değeri yine de şansa bağlı.</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[7, 8, 9].map((h) => (
            <Pressable key={h} onPress={() => backAt(h)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: colors.trimDim }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>☾ Sabah {String(h).padStart(2, '0')}:00'de dönsün</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.trimDim }}>
          <Text style={[ui.label, { fontSize: 11 }]}>Dönüş</Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{clockText(returnAt, now)}</Text>
          <Text style={ui.muted}>toplam {hours(total)}{state.gameSpeed > 1 ? ` (test: ${formatDuration(realTotal)})` : ''}</Text>
        </View>

        <View style={{ gap: 4 }}>
          <View style={ui.between}><Text style={ui.muted}>Tahmini altın</Text><View style={ui.row}><Gold amount={est.goldMin} size={13} /><Text style={ui.muted}>–</Text><Gold amount={est.goldMax} size={13} /></View></View>
          <View style={ui.between}><Text style={ui.muted}>Buluntu sayısı</Text><Text style={ui.text}>{est.finds}{bonus.extraFindChance > 0 ? ` (+1 şansı %${Math.round(bonus.extraFindChance * 100)})` : ''}</Text></View>
          <View style={ui.between}><Text style={ui.muted}>Deneyim (kişi başı)</Text><Text style={ui.text}>~{est.xp}</Text></View>
          {hasScout && (bonus.pace > 0 || bonus.rareRelative > 0 || bonus.lostLands) && (
            <Text style={{ color: colors.good, fontSize: 12 }}>
              Gözcü avantajı: {bonus.pace > 0 ? `%${Math.round(bonus.pace * 100)} daha hızlı ilerleme` : ''}{bonus.pace > 0 && bonus.rareRelative > 0 ? ' · ' : ''}{bonus.rareRelative > 0 ? `nadir buluntu +%${Math.round(bonus.rareRelative * 100)}` : ''}{bonus.lostLands ? ' · Kayıp Diyarlar: efsanevi şansı 2 kat' : ''}
            </Text>
          )}
        </View>

        <View style={[ui.between, { backgroundColor: colors.inset, borderRadius: 6, padding: 8 }]}>
          <Text style={ui.text}>Enerji (kişi başı)</Text>
          <Text style={{ color: tired.length ? colors.danger : colors.energy, fontWeight: '900' }}>⚡ {energyCost}</Text>
        </View>
        {tired.length > 0 && <Text style={{ color: colors.danger, fontSize: 12 }}>{tired.map((f) => f.name).join(', ')} için enerji yetmiyor. Süreyi kısalt ya da enerjinin dolmasını bekle.</Text>}
        {state.luckPotions > 0 && (
          <Checkbox checked={luck} onChange={setLuck}>
            <Text style={ui.text}>Şans İksiri kullan (nadir buluntu +%15) · {state.luckPotions} adet</Text>
          </Checkbox>
        )}
        <ErrorText message={error} />
        <Button
          title={used >= state.explorationSlots ? 'Boş keşif yuvası yok' : picked.length === 0 ? 'Önce ekip seç' : `Keşfe gönder (⚡${energyCost})`}
          busy={busy === 'send'}
          disabled={picked.length === 0 || used >= state.explorationSlots || tired.length > 0}
          onPress={() => act('send', async () => { await api.startExploration(picked, travel, explore, luck); setPicked([]); setLuck(false); })}
        />
      </Card>
    </View>
  );
}

/** Three-part bar: outbound, exploring, way back. */
function PhaseBar({ start, arrive, leave, end, now, recalled }: { start: number; arrive: number; leave: number; end: number; now: number; recalled: boolean }) {
  if (recalled) return <Bar ratio={1 - Math.max(0, end - now) / Math.max(1, end - start)} color={colors.warn} />;
  const span = Math.max(1, end - start);
  const seg = (a: number, b: number, color: string) => {
    const w = ((b - a) / span) * 100;
    if (w <= 0) return null;
    const fill = Math.max(0, Math.min(1, (now - a) / Math.max(1, b - a)));
    return (
      <View style={{ width: `${w}%`, height: 10, backgroundColor: colors.bgDeep, borderRightWidth: 1, borderColor: '#000' }}>
        <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: color }} />
      </View>
    );
  };
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#00000080' }}>
        {seg(start, arrive, '#8a7a55')}
        {seg(arrive, leave, colors.trim)}
        {seg(leave, end, '#8a7a55')}
      </View>
      <View style={ui.between}>
        <Text style={{ color: colors.faint, fontSize: 10 }}>Gidiş</Text>
        <Text style={{ color: colors.faint, fontSize: 10 }}>Keşif</Text>
        <Text style={{ color: colors.faint, fontSize: 10 }}>Dönüş</Text>
      </View>
    </View>
  );
}
