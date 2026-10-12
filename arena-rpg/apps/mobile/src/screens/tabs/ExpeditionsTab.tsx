import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import type { SceneKey } from '../../art/Scene';
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

export function ExpeditionsTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [luck, setLuck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const idle = state.fighters.filter((f) => f.status === 'idle');
  const canHidden = state.fighters.some((f) => (f.skills.lost_lands ?? 0) > 0);
  const zones = Object.values(game.ZONES).filter((z) => !z.hidden || canHidden);
  const perkCut = game.accountPerks(state.account.mainClass).expeditionDurationReduction;
  const used = state.expeditions.length;

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

  const zone = zoneId ? game.ZONES[zoneId] : null;
  const underLevel = zone ? state.fighters.filter((f) => picked.includes(f.id) && f.level < zone.minLevel) : [];

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Sefer yuvası</Text>
          <Text style={[ui.h2, ui.num, { color: used >= state.expeditionSlots ? colors.warn : colors.text }]}>{used} / {state.expeditionSlots}</Text>
        </View>
        <Text style={ui.muted}>Yuvalar Kafa Kazanı'ndaki Keşif Lojistiği'nden ve en yüksek Gözcünün her 25 seviyesinden gelir.</Text>
        {state.gameSpeed > 1 && <Text style={{ color: colors.warn, fontSize: 12 }}>Test modu: süreler {state.gameSpeed} kat hızlı.</Text>}
      </Card>

      {state.expeditions.length > 0 && <SectionTitle>Yoldaki seferler</SectionTitle>}
      {state.expeditions.map((e) => {
        const z = game.ZONES[e.zoneId];
        const party = state.fighters.filter((f) => e.fighterIds.includes(f.id));
        const total = e.endsAt - e.startedAt;
        return (
          <Card key={e.id} style={{ borderColor: colors.trimDim }}>
            <View style={ui.between}>
              <Text style={ui.h2}>{z?.name ?? e.zoneId}</Text>
              <Pill text={e.recalled ? 'Geri dönüyor' : 'Yolda'} color={colors.warn} />
            </View>
            <View style={ui.row}>{party.map((f) => <Portrait key={f.id} cls={f.class} size={30} />)}<Text style={ui.muted}>{party.map((f) => f.name).join(', ')}</Text></View>
            <Bar ratio={(now - e.startedAt) / total} color={colors.trim} label={`Dönüş ${formatDuration(e.endsAt - now)}`} />
            {!e.recalled && <Button title="Geri çağır (ödül alınmaz)" kind="ghost" small busy={busy === e.id} onPress={() => act(e.id, () => api.recall(e.id))} />}
          </Card>
        );
      })}

      <SectionTitle>Keşif bölgeleri</SectionTitle>
      {zones.map((z) => {
        const open = zoneId === z.id;
        const duration = Math.round((z.baseDurationMs * (1 - perkCut)) / state.gameSpeed);
        return (
          <View key={z.id} style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: open ? colors.trim : colors.border, backgroundColor: colors.panel }}>
            <Pressable onPress={() => { setZoneId(open ? null : z.id); setPicked([]); setLuck(false); setError(null); }}>
              <Scene name={z.id as SceneKey} height={110} style={{ borderRadius: 0 }}>
                <View style={{ flex: 1, justifyContent: 'space-between', padding: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    {state.prophecyZone === z.id && <Pill text="★ Bugünün kehaneti" color="#f2e6ff" />}
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>{z.name}</Text>
                    <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Önerilen Sv {z.minLevel}+ · ~{formatDuration(duration)}</Text>
                  </View>
                </View>
              </Scene>
            </Pressable>
            {open && (
              <View style={{ padding: 12, gap: 10 }}>
                <Text style={ui.muted}>{BLURB[z.id]}</Text>
                {idle.length === 0 && <Text style={ui.muted}>Hazırda bekleyen dövüşçü yok.</Text>}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {idle.map((f) => {
                    const on = picked.includes(f.id);
                    return (
                      <Pressable key={f.id} onPress={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])} style={{ alignItems: 'center', gap: 3, opacity: on ? 1 : 0.5 }}>
                        <Portrait cls={f.class} size={48} hpRatio={f.hpRatio} />
                        <Text style={{ color: on ? colors.trim : colors.muted, fontSize: 11, fontWeight: '800' }}>{on ? '✓ ' : ''}{f.name}</Text>
                        <Text style={{ color: colors.faint, fontSize: 10 }}>Sv {f.level}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {state.luckPotions > 0 && (
                  <Checkbox checked={luck} onChange={setLuck}>
                    <Text style={ui.text}>Şans İksiri kullan (+%15 nadir ödül) · {state.luckPotions} adet</Text>
                  </Checkbox>
                )}
                {underLevel.length > 0 && <Text style={{ color: colors.warn }}>⚠ {underLevel.map((f) => f.name).join(', ')} önerilen seviyenin altında; yaralanma ihtimali artar.</Text>}
                <ErrorText message={error} />
                <Button
                  title="Sefere gönder"
                  busy={busy === 'send'}
                  disabled={picked.length === 0 || used >= state.expeditionSlots}
                  onPress={() => act('send', async () => { await api.startExpedition(z.id, picked, luck); setZoneId(null); setPicked([]); setLuck(false); })}
                />
              </View>
            )}
          </View>
        );
      })}
      {!zoneId && <ErrorText message={error} />}
    </View>
  );
}
