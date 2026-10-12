import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Bar, Button, Card, Pill } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { FighterView, GameState } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

export function FightersTab({ state, now, onOpen, onNew }: { state: GameState; now: number; onOpen: (f: FighterView) => void; onNew: () => void }) {
  const { account, fighters } = state;
  const nextUnlock = game.GAME_CONFIG.fighter.unlock_levels.find((l) => l > account.accountLevel);
  return (
    <View style={{ gap: 12 }}>
      {fighters.map((f) => (
        <Pressable key={f.id} onPress={() => onOpen(f)} accessibilityRole="button">
          <Card style={{ borderLeftWidth: 4, borderLeftColor: classColor(f.class) }}>
            <View style={ui.between}>
              <Text style={ui.h2}>{f.name}</Text>
              <Pill text={statusText(f, now)} color={f.status === 'idle' ? colors.good : f.status === 'injured' ? colors.danger : colors.warn} />
            </View>
            <Text style={ui.muted}>{tr.classes[f.class].name} · Seviye {f.level}</Text>
            <Bar ratio={f.xp / f.xpToNext} />
            <View style={ui.between}>
              <Text style={ui.muted}>Deneyim {f.xp} / {f.xpToNext}</Text>
              {f.skillPoints > 0 && <Text style={{ color: colors.accent, fontWeight: '700' }}>{f.skillPoints} yetenek puanı</Text>}
            </View>
          </Card>
        </Pressable>
      ))}
      <Card>
        <Text style={ui.text}>Dövüşçü hakkı: {fighters.length} / {account.fighterSlots}</Text>
        {fighters.length < account.fighterSlots
          ? <Button title="Yeni dövüşçü oluştur" onPress={onNew} />
          : <Text style={ui.muted}>{nextUnlock ? `Sıradaki hak hesap seviyesi ${nextUnlock}'da açılır (şu an ${account.accountLevel}).` : 'Tüm dövüşçü hakların açık.'}</Text>}
      </Card>
    </View>
  );
}

export function statusText(f: FighterView, now: number) {
  const base = tr.status[f.status] ?? f.status;
  return f.statusUntil && f.status !== 'idle' ? `${base} · ${formatDuration(f.statusUntil - now)}` : base;
}
