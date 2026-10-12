import { Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { Bar, Button, Card, Pill } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { FighterView, GameState } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

export function GangTab({ state, now, onOpen, onNew }: { state: GameState; now: number; onOpen: (f: FighterView) => void; onNew: () => void }) {
  const { account, fighters } = state;
  const nextUnlock = game.GAME_CONFIG.fighter.unlock_levels.find((l) => l > account.accountLevel);
  const perk = account.mainClassPerk;
  return (
    <View style={{ gap: 12 }}>
      <Scene name="camp" height={120}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>{account.displayName}</Text>
          <Text style={{ color: '#f2e6cc', textShadowColor: '#000', textShadowRadius: 4 }}>Çete · Hesap seviyesi {account.accountLevel}</Text>
        </View>
      </Scene>
      {perk && account.mainClass && (
        <Card trim style={{ borderColor: classColor(account.mainClass) }}>
          <Text style={[ui.label, { color: classColor(account.mainClass) }]}>Ana sınıf avantajı · {perk.title}</Text>
          {perk.lines.map((l) => <Text key={l} style={[ui.muted, { color: colors.text }]}>• {l}</Text>)}
        </Card>
      )}
      {fighters.map((f) => (
        <Pressable key={f.id} onPress={() => onOpen(f)} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Portrait cls={f.class} size={62} hpRatio={f.hpRatio} injured={f.status === 'injured'} />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={ui.between}>
                <Text style={[ui.h2, { flex: 1 }]} numberOfLines={1}>{f.name}</Text>
                <Pill text={statusText(f, now)} color={f.status === 'idle' ? colors.good : f.status === 'injured' ? colors.danger : colors.warn} />
              </View>
              <Text style={ui.muted}>{tr.classes[f.class].name} · Seviye {f.level} · Güç {f.power}</Text>
              <Bar ratio={f.hpRatio} color={colors.hp} label={`Can %${Math.round(f.hpRatio * 100)}`} />
              <Bar ratio={f.xp / f.xpToNext} color={colors.xp} label={`Deneyim ${f.xp}/${f.xpToNext}`} />
              {f.skillPoints > 0 && <Text style={{ color: colors.trim, fontWeight: '800', fontSize: 12 }}>★ {f.skillPoints} yetenek puanı harcanmayı bekliyor</Text>}
            </View>
          </Card>
        </Pressable>
      ))}
      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Çete üyeleri</Text>
          <Text style={[ui.h2, ui.num]}>{fighters.length} / {account.fighterSlots}</Text>
        </View>
        {fighters.length < account.fighterSlots
          ? <Button title="Çeteye yeni dövüşçü kat" onPress={onNew} />
          : <Text style={ui.muted}>{nextUnlock ? `Yeni üye hakkı hesap seviyesi ${nextUnlock}'da açılır.` : 'Bütün üye hakların açık.'}</Text>}
      </Card>
    </View>
  );
}

export function statusText(f: FighterView, now: number) {
  const base = tr.status[f.status] ?? f.status;
  return f.statusUntil && f.status !== 'idle' ? `${base} · ${formatDuration(f.statusUntil - now)}` : base;
}
