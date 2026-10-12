import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card, ErrorText, Pill } from '../../components/ui';
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
      <Text style={ui.text}>{tr.events[String(body.event)] ?? ''}</Text>
      <Text style={ui.text}>
        Ganimet: <Text style={{ fontWeight: '700', color: reward === 'nothing' ? colors.muted : colors.accent }}>{tr.tiers[reward]}</Text>
        {body.extraReward ? ` + ekstra ${tr.tiers[String(body.extraReward)]}` : ''}
      </Text>
      <Text style={ui.text}>Altın: +{Number(body.gold)}{Number(body.rewardMultiplier) > 1 ? ` (kehanet ×${Number(body.rewardMultiplier).toFixed(2)})` : ''}</Text>
      {fighters.map((f) => (
        <Text key={f.id} style={ui.muted}>
          {f.name}: +{f.xp} deneyim{f.levelsGained > 0 ? ` · Seviye ${f.newLevel}!` : ''}{f.injuredUntil ? ` · Yaralandı (${formatDuration(f.injuredUntil - at)})` : ''}
        </Text>
      ))}
    </View>
  );
}
