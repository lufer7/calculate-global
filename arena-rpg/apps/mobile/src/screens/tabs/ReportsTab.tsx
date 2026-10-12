import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { game } from '@arena/core';
import { ItemIcon } from '../../art/ItemIcon';
import { Card, ErrorText, Gold, Pill } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { Report } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

interface FighterResult { id: string; name: string; xp: number; levelsGained: number; newLevel: number; injuredUntil: number | null }

export function ReportsTab({ refresh }: { refresh: () => Promise<void> }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.reports()
      .then(async (r) => {
        setReports(r.reports);
        if (r.reports.some((x) => !x.read)) {
          await api.markReportsRead();
          await refresh();
        }
      })
      .catch((e) => setError(tr.error(e instanceof ApiError ? e.code : 'unknown')));
  }, [refresh]);

  if (error) return <ErrorText message={error} />;
  if (!reports) return <ActivityIndicator color={colors.accent} />;
  if (reports.length === 0) return <Card><Text style={ui.muted}>Henüz rapor yok. Bir sefer gönder; döndüğünde raporu burada okursun.</Text></Card>;

  return (
    <View style={{ gap: 12 }}>
      {reports.map((r) => (
        <Card key={r.id} style={!r.read ? { borderColor: colors.accent } : undefined}>
          <View style={ui.between}>
            <Text style={[ui.h2, { flex: 1 }]}>{r.title}</Text>
            {!r.read && <Pill text="Yeni" color={colors.accent} />}
          </View>
          <Text style={ui.muted}>{new Date(r.at).toLocaleString('tr-TR')}</Text>
          {r.kind === 'expedition' && <ExpeditionBody body={r.body} at={r.at} />}
          {r.kind === 'expedition_recalled' && <Text style={ui.text}>Dövüşçüler eli boş döndü.</Text>}
        </Card>
      ))}
    </View>
  );
}

function ExpeditionBody({ body, at }: { body: Record<string, unknown>; at: number }) {
  const fighters = (body.fighters ?? []) as FighterResult[];
  const reward = String(body.reward);
  return (
    <View style={{ gap: 6 }}>
      {typeof body.success === 'boolean' && (
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Text style={{ fontWeight: '900', color: body.success ? colors.good : colors.danger }}>{body.success ? '✓ Bölüm geçildi' : '✗ Bölüm geçilemedi'}</Text>
          <Text style={ui.muted}>(şans %{Number(body.chance)})</Text>
          {body.firstBossClear === true && <Text style={{ color: colors.trim, fontWeight: '800' }}>☠ Patron ilk kez yenildi!</Text>}
        </View>
      )}
      {body.success === false && <Text style={ui.muted}>Ekip geri çekildi; yalnızca az bir altın ve deneyim getirdi. Daha güçlü bir ekip ya da daha iyi eşyalarla tekrar dene.</Text>}
      <Text style={ui.text}>{tr.events[String(body.event)] ?? ''}</Text>
      <Text style={ui.text}>
        Ganimet: <Text style={{ fontWeight: '700', color: reward === 'nothing' ? colors.muted : colors.accent }}>{tr.tiers[reward]}</Text>
        {body.extraReward ? ` + ekstra ${tr.tiers[String(body.extraReward)]}` : ''}
      </Text>
      <View style={ui.row}><Gold amount={Number(body.gold)} size={14} />{Number(body.rewardMultiplier) > 1 && <Text style={ui.muted}>(kehanet ×{Number(body.rewardMultiplier).toFixed(2)})</Text>}</View>
      {Array.isArray(body.items) && (body.items as { name: string; rarity: game.Rarity; icon: string; qty: number; kept: boolean }[]).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(body.items as { name: string; rarity: game.Rarity; icon: string; qty: number; kept: boolean }[]).map((it, i) => (
            <View key={i} style={{ alignItems: 'center', width: 70, gap: 2 }}>
              <ItemIcon icon={it.icon} rarity={it.rarity} size={44} qty={it.qty} dim={!it.kept} />
              <Text style={{ color: game.RARITY_INFO[it.rarity].color, fontSize: 10, textAlign: 'center' }} numberOfLines={2}>{it.kept ? it.name : 'Çanta doluydu'}</Text>
            </View>
          ))}
        </View>
      )}
      {fighters.map((f) => (
        <Text key={f.id} style={ui.muted}>
          {f.name}: +{f.xp} deneyim{f.levelsGained > 0 ? ` · Seviye ${f.newLevel}!` : ''}{f.injuredUntil ? ` · Yaralandı (${formatDuration(f.injuredUntil - at)})` : ''}
        </Text>
      ))}
    </View>
  );
}
