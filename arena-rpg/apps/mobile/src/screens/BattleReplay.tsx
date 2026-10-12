import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import type { game } from '@arena/core';
import { Portrait } from '../art/Portrait';
import { Scene } from '../art/Scene';
import { Bar, Button, Gold } from '../components/ui';
import type { FightResult } from '../lib/api';
import { colors, ui } from './theme';

/** Replays the server's battle log turn by turn: portraits, HP bars and a chronicle. */
export function BattleReplay({ result, onClose }: { result: FightResult; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const log = result.outcome.log;
  const done = step >= log.length;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [step, done]);

  const hp = step === 0 ? result.outcome.startHp : log[Math.min(step, log.length) - 1]!.hp;
  const names = { a: result.me.name, b: result.foe.name };
  const last = step > 0 ? log[step - 1] : undefined;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Scene name="arena" height={210} style={{ borderRadius: 0 }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 14 }}>
            {(['a', 'b'] as const).map((side) => {
              const who = side === 'a' ? result.me : result.foe;
              const hit = last && last.actor !== side && (last.kind === 'hit' || last.kind === 'crit' || last.kind === 'double');
              return (
                <View key={side} style={{ alignItems: 'center', gap: 4, width: 130, transform: [{ translateX: hit ? (side === 'a' ? -4 : 4) : 0 }] }}>
                  <Portrait cls={who.class} size={70} />
                  <Text style={{ color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }} numberOfLines={1}>{who.name}</Text>
                  <View style={{ width: 120 }}>
                    <Bar ratio={hp[side] / result.outcome.maxHp[side]} color={colors.hp} label={`${hp[side]} / ${result.outcome.maxHp[side]}`} />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>VS</Text>
            {last && last.value > 0 && <Text style={{ color: last.kind === 'heal' ? colors.good : last.kind === 'crit' ? colors.warn : '#fff', fontSize: 22, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 }}>{last.kind === 'heal' ? '+' : '-'}{last.value}</Text>}
          </View>
        </Scene>
        <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 14, gap: 6 }}>
          {log.slice(0, step).map((e, i) => (
            <Text key={i} style={[ui.text, { fontSize: 14, color: e.actor === 'a' ? colors.text : '#d8c9b0' }]}>
              <Text style={{ color: colors.faint }}>{e.round > 0 ? `${e.round}. tur  ` : ''}</Text>
              {line(e, names)}
            </Text>
          ))}
          {done && (
            <View style={{ gap: 10, marginTop: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: result.won ? colors.trim : colors.danger, backgroundColor: colors.panel }}>
              <Text style={[ui.title, { color: result.won ? colors.trim : colors.danger, textAlign: 'center' }]}>{result.won ? 'ZAFER' : result.outcome.fled === 'a' ? 'GERİ ÇEKİLDİN' : 'YENİLGİ'}</Text>
              <View style={[ui.row, { justifyContent: 'center', gap: 16 }]}>
                <Gold amount={result.rewards.gold} />
                <Text style={[ui.text, { color: colors.xp }]}>+{result.rewards.xp} deneyim</Text>
                <Text style={[ui.text, { color: result.rewards.points >= 0 ? colors.good : colors.danger }]}>{result.rewards.points >= 0 ? '+' : ''}{result.rewards.points} şöhret</Text>
              </View>
              {result.rewards.levelsGained > 0 && <Text style={[ui.h2, { textAlign: 'center', color: colors.good }]}>Seviye atladın!</Text>}
              {!result.won && <Text style={[ui.muted, { textAlign: 'center' }]}>Canın %{Math.round(result.hpRatio * 100)}'e düştü. Arenada yaralanma ya da altın kaybı yok.</Text>}
            </View>
          )}
        </ScrollView>
        <View style={{ padding: 14, flexDirection: 'row', gap: 10 }}>
          {!done && <Button title="Atla" kind="ghost" onPress={() => setStep(log.length)} style={{ flex: 1 }} />}
          <Button title={done ? 'Arenaya dön' : 'Kapat'} onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function line(e: game.BattleEvent, n: Record<'a' | 'b', string>): string {
  const me = n[e.actor];
  const foe = n[e.actor === 'a' ? 'b' : 'a'];
  switch (e.kind) {
    case 'hit': return `${me} vurdu → ${foe}: ${e.value} hasar.`;
    case 'crit': return `${me} KRİTİK vurdu → ${foe}: ${e.value} hasar!`;
    case 'double': return `${me} bir kez daha vurdu → ${foe}: ${e.value} hasar.`;
    case 'miss': return `${me} ıskaladı.`;
    case 'dodge': return `${foe} kaçtı; ${me} boşa savurdu.`;
    case 'heal': return `${me} yaralarını sardı: +${e.value} can.`;
    case 'cheat_death': return `${me} ölümcül darbeye rağmen ayakta kaldı!`;
    case 'flee': return `${me} gölgelere karışıp arenadan çekildi.`;
    case 'curse': return `${me} savaş öncesi lanet ve kutsamalarını yaptı.`;
    default: return '';
  }
}

