import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { game } from '@arena/core';
import { ItemIcon } from '../art/ItemIcon';
import { NavIcon } from '../art/NavIcon';
import { Portrait } from '../art/Portrait';
import { Scene } from '../art/Scene';
import { Bar, Button, Gold } from '../components/ui';
import type { FightResult } from '../lib/api';
import { colors, fonts, ui } from './theme';

const native = Platform.OS !== 'web';

/**
 * Gladiatus-style: the result is decided the moment you attack. A ~1 s clash animation,
 * then the outcome; the round-by-round chronicle is folded away for those who want it.
 */
export function BattleReplay({ result, onClose }: { result: FightResult; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'clash' | 'result'>('clash');
  const [details, setDetails] = useState(false);
  const charge = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const o = result.outcome;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(charge, { toValue: 1, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: native }),
      Animated.parallel([
        Animated.timing(charge, { toValue: 0, duration: 380, easing: Easing.out(Easing.back(2)), useNativeDriver: native }),
        Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: native }),
      ]),
    ]).start(() => {
      setPhase('result');
      Animated.timing(reveal, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
    });
  }, [charge, flash, reveal]);

  const left = charge.interpolate({ inputRange: [0, 1], outputRange: [0, 70] });
  const right = charge.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
  const swordScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });

  const stats = summarize(o.log);
  const won = result.won;
  const verdict = won ? 'ZAFER' : o.fled === 'a' ? 'GERİ ÇEKİLDİN' : o.winner === 'draw' ? 'BERABERE' : 'YENİLGİ';
  const loser = won ? 'b' : 'a';

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Scene name="arena" height={220} style={{ borderRadius: 0 }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 14 }}>
            {(['a', 'b'] as const).map((side) => {
              const who = side === 'a' ? result.me : result.foe;
              const down = phase === 'result' && side === loser && o.winner !== 'draw';
              return (
                <Animated.View key={side} style={{ alignItems: 'center', gap: 4, width: 132, opacity: down ? 0.55 : 1, transform: [{ translateX: side === 'a' ? left : right }] }}>
                  <Portrait cls={who.class} size={74} />
                  <Text style={{ color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }} numberOfLines={1}>{who.name}</Text>
                  <Text style={{ color: '#f2e6cc', fontSize: 11, textShadowColor: '#000', textShadowRadius: 3 }}>Sv {who.level}</Text>
                  <View style={{ width: 120 }}>
                    <Bar ratio={(phase === 'result' ? o.hp[side] : o.startHp[side]) / o.maxHp[side]} color={colors.hp} label={`${phase === 'result' ? o.hp[side] : o.startHp[side]} / ${o.maxHp[side]}`} />
                  </View>
                </Animated.View>
              );
            })}
          </View>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center', opacity: phase === 'clash' ? 1 : 0, transform: [{ scale: swordScale }] }}>
            <NavIcon name="swords" color="#fff6d8" size={56} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#fff3c4', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }} />
        </Scene>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {phase === 'result' && (
            <Animated.View style={{ gap: 12, opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
              <View style={{ alignItems: 'center', gap: 6, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: won ? colors.trim : colors.danger, backgroundColor: colors.panel }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: '900', letterSpacing: 3, color: won ? colors.trim : colors.danger }}>{verdict}</Text>
                <Text style={ui.muted}>{o.rounds} tur sürdü</Text>
                <View style={[ui.row, { gap: 16, marginTop: 4 }]}>
                  <Gold amount={result.rewards.gold} />
                  <Text style={[ui.text, { color: colors.xp, fontWeight: '700' }]}>+{result.rewards.xp} deneyim</Text>
                  <Text style={[ui.text, { color: result.rewards.points >= 0 ? colors.good : colors.danger, fontWeight: '700' }]}>{result.rewards.points >= 0 ? '+' : ''}{result.rewards.points} şöhret</Text>
                </View>
                {result.rewards.levelsGained > 0 && <Text style={[ui.h2, { color: colors.good }]}>Seviye atladın!</Text>}
                {!!result.rewards.stolen && result.rewards.stolen > 0 && (
                  <View style={ui.row}><Text style={[ui.text, { color: colors.trim, fontWeight: '800' }]}>Rakibin kesesinden:</Text><Gold amount={result.rewards.stolen} /></View>
                )}
                {won && result.foe.owner && result.rewards.stolen === 0 && <Text style={ui.muted}>Rakip yakın zamanda soyulduğu için korumada; altın alınamadı.</Text>}
                {result.rewards.loot && (
                  <View style={[ui.row, { marginTop: 4 }]}>
                    <ItemIcon icon={result.rewards.loot.icon} rarity={result.rewards.loot.rarity} size={44} upgrade={0} dim={!result.rewards.loot.kept} />
                    <Text style={{ color: game.RARITY_INFO[result.rewards.loot.rarity].color, fontWeight: '700', flexShrink: 1 }}>{result.rewards.loot.kept ? `Ganimet: ${result.rewards.loot.name}` : 'Çanta dolu olduğu için ganimet alınamadı'}</Text>
                  </View>
                )}
                {!won && <Text style={[ui.muted, { textAlign: 'center' }]}>Canın %{Math.round(result.hpRatio * 100)}'e düştü. Saldıran olarak altın kaybetmezsin.</Text>}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  ['Verdiğin hasar', String(stats.dealt.a)], ['Aldığın hasar', String(stats.dealt.b)],
                  ['Kritik', String(stats.crits.a)], ['Kaçınma', String(stats.dodges.a)],
                ].map(([k, v]) => (
                  <View key={k} style={{ flex: 1, backgroundColor: colors.inset, borderRadius: 6, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>{k}</Text>
                    <Text style={[{ color: colors.text, fontWeight: '800', fontSize: 15 }, ui.num]}>{v}</Text>
                  </View>
                ))}
              </View>

              <Pressable onPress={() => setDetails(!details)} style={[ui.between, { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }]}>
                <Text style={[ui.label, { fontSize: 12 }]}>Savaş detayları</Text>
                <Text style={{ color: colors.trim }}>{details ? '▲ Gizle' : '▼ Göster'}</Text>
              </Pressable>
              {details && o.log.map((e, i) => (
                <Text key={i} style={[ui.text, { fontSize: 13, color: e.actor === 'a' ? colors.text : '#d8c9b0' }]}>
                  <Text style={{ color: colors.faint }}>{e.round > 0 ? `${e.round}. tur  ` : ''}</Text>
                  {line(e, { a: result.me.name, b: result.foe.name })}
                </Text>
              ))}
            </Animated.View>
          )}
        </ScrollView>
        <View style={{ padding: 14 }}>
          <Button title={phase === 'result' ? 'Arenaya dön' : '…'} disabled={phase !== 'result'} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function summarize(log: game.BattleEvent[]) {
  const dealt = { a: 0, b: 0 };
  const crits = { a: 0, b: 0 };
  const dodges = { a: 0, b: 0 };
  for (const e of log) {
    if (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'double') dealt[e.actor] += e.value;
    if (e.kind === 'crit') crits[e.actor]++;
    if (e.kind === 'dodge') dodges[e.actor === 'a' ? 'b' : 'a']++;
  }
  return { dealt, crits, dodges };
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
