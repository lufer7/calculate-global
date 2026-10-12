import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Button, Card, Checkbox, ErrorText, Pill } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

export function ExpeditionsTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
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
  const leavesEmpty = picked.length > 0 && picked.length === idle.length;
  const underLevel = zone ? state.fighters.filter((f) => picked.includes(f.id) && f.level < zone.minLevel) : [];

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Sefer slotu</Text>
          <Text style={[ui.h2, { color: used >= state.expeditionSlots ? colors.warn : colors.text }]}>{used} / {state.expeditionSlots}</Text>
        </View>
        <Text style={ui.muted}>Slotlar Keşif Lojistiği araştırmasından ve en yüksek Gözcünün her 25 seviyesinden gelir.</Text>
        {state.gameSpeed > 1 && <Text style={{ color: colors.warn, fontSize: 12 }}>Test modu: süreler {state.gameSpeed} kat hızlı.</Text>}
      </Card>

      {state.expeditions.map((e) => {
        const z = game.ZONES[e.zoneId];
        const names = state.fighters.filter((f) => e.fighterIds.includes(f.id)).map((f) => f.name).join(', ');
        return (
          <Card key={e.id} style={{ borderColor: colors.warn }}>
            <View style={ui.between}>
              <Text style={ui.h2}>{z?.name ?? e.zoneId}</Text>
              <Pill text={e.recalled ? 'Geri dönüyor' : 'Yolda'} color={colors.warn} />
            </View>
            <Text style={ui.muted}>{names}</Text>
            <Text style={[ui.text, { fontVariant: ['tabular-nums'] }]}>Dönüş: {formatDuration(e.endsAt - now)}</Text>
            {!e.recalled && <Button title="Geri çağır (ödül alınmaz)" kind="ghost" busy={busy === e.id} onPress={() => act(e.id, () => api.recall(e.id))} />}
          </Card>
        );
      })}

      <Text style={ui.label}>Keşif bölgeleri</Text>
      {zones.map((z) => {
        const open = zoneId === z.id;
        const duration = Math.round((z.baseDurationMs * (1 - perkCut)) / state.gameSpeed);
        return (
          <Card key={z.id} style={open ? { borderColor: colors.accent } : undefined}>
            <Pressable onPress={() => { setZoneId(open ? null : z.id); setPicked([]); setError(null); }}>
              <View style={ui.between}>
                <Text style={ui.h2}>{z.name}</Text>
                {state.prophecyZone === z.id && <Pill text="★ Kehanet" color={colors.seer} />}
              </View>
              <Text style={ui.muted}>Önerilen seviye {z.minLevel}+ · Süre ~{formatDuration(duration)}{perkCut > 0 ? ' (Kâşifler Yolu dahil)' : ''}</Text>
            </Pressable>
            {open && (
              <View style={{ gap: 10, marginTop: 6 }}>
                {idle.length === 0 && <Text style={ui.muted}>Kalede boşta dövüşçü yok.</Text>}
                {idle.map((f) => (
                  <Checkbox key={f.id} checked={picked.includes(f.id)} onChange={(v) => setPicked(v ? [...picked, f.id] : picked.filter((x) => x !== f.id))}>
                    <Text style={ui.text}><Text style={{ color: classColor(f.class) }}>{tr.classes[f.class].name}</Text> · {f.name} (Sv {f.level})</Text>
                  </Checkbox>
                ))}
                {leavesEmpty && <Text style={{ color: colors.warn }}>⚠ Kalede kimse kalmayacak; saldırıya açık olursun.</Text>}
                {underLevel.length > 0 && <Text style={{ color: colors.warn }}>⚠ {underLevel.map((f) => f.name).join(', ')} önerilen seviyenin altında; yaralanma ihtimali artar.</Text>}
                <ErrorText message={error} />
                <Button
                  title="Sefere gönder"
                  busy={busy === 'send'}
                  disabled={picked.length === 0 || used >= state.expeditionSlots}
                  onPress={() => act('send', async () => { await api.startExpedition(z.id, picked); setZoneId(null); setPicked([]); })}
                />
              </View>
            )}
          </Card>
        );
      })}
      {!zoneId && <ErrorText message={error} />}
    </View>
  );
}
