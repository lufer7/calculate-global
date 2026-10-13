import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { game } from '@arena/core';
import { CreatureArt } from '../../art/Creature';
import { ItemIcon } from '../../art/ItemIcon';
import { Scene } from '../../art/Scene';
import type { SceneKey } from '../../art/Scene';
import { FighterPicker } from '../../components/FighterPicker';
import { Bar, Button, Card, EnergyBar, ErrorText, Gold, Pill } from '../../components/ui';
import { tr } from '../../i18n/tr';
import type { GameState, HuntResult } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

const BLURB: Record<string, string> = {
  dark_forest: 'Çam iğneleri arasında yaban domuzu izleri ve unutulmuş avcı kulübeleri.',
  misty_marsh: 'Sis hiç kalkmaz. Kamışların arasında batmış kervanların sandıkları yatar.',
  abandoned_mines: 'Cevher bitti, madenciler gitti. Karanlıkta başka şeyler kaldı.',
  lost_lands: 'Haritalarda olmayan yer. Yolu bilenler bile tedirgin döner.',
};

/**
 * Sefer (rev4, Gladiatus-style): pick a zone, five creatures appear; "Saldır" resolves the
 * fight at once (1 energy) and pops up the result. Repeat as long as energy and health last.
 */
export function ExpeditionsTab({ state, fighterId, setFighterId, refresh }: { state: GameState; fighterId: string; setFighterId: (id: string) => void; refresh: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ r: HuntResult; creature: game.Creature } | null>(null);
  const fighter = state.fighters.find((f) => f.id === fighterId) ?? state.fighters[0]!;
  const level = state.account.accountLevel;

  // Android back: close the zone before leaving the tab.
  useEffect(() => {
    if (!zoneId || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setZoneId(null);
      return true;
    });
    return () => sub.remove();
  }, [zoneId]);

  const attack = async (creature: game.Creature) => {
    setBusy(creature.id);
    setError(null);
    try {
      const r = await api.hunt(fighter.id, creature.id);
      setResult({ r, creature });
      await refresh();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  const blocked = fighter.status !== 'idle' ? `${fighter.name} şu an ${tr.status[fighter.status]?.toLocaleLowerCase('tr-TR') ?? 'meşgul'}.`
    : fighter.hpRatio < game.ARENA_MIN_HP ? 'Canı çok düşük. Camide dinlendir ya da bir şeyler yedir.'
      : fighter.energy.value < game.ENERGY.fightCost ? 'Enerjisi bitti. Enerji 7 dakikada 1 dolar.' : null;

  const zone = zoneId ? game.ZONES[zoneId] : null;
  const cardW = Math.floor((Math.min(width, 520) - 28 - 10) / 2);

  return (
    <View style={{ gap: 12 }}>
      <FighterPicker fighters={state.fighters} selectedId={fighter.id} onSelect={setFighterId} />
      <Card trim>
        <View style={ui.between}>
          <Text style={[ui.h2, { color: classColor(fighter.class) }]}>{fighter.name} <Text style={ui.muted}>Sv {fighter.level}</Text></Text>
          <Pill text={`Güç ${fighter.power}`} color={colors.trim} />
        </View>
        <Bar ratio={fighter.hpRatio} color={colors.hp} label={`Can %${Math.round(fighter.hpRatio * 100)}`} />
        <EnergyBar energy={fighter.energy} />
        {blocked && <Text style={{ color: colors.warn, fontSize: 13 }}>{blocked}</Text>}
      </Card>

      {!zone ? (
        <>
          <Text style={ui.muted}>Bir bölge seç; her bölgede beş yaratık seni bekliyor. Her saldırı 1 enerji ister.</Text>
          {Object.values(game.ZONES).map((z) => {
            const locked = level < z.minLevel;
            const list = game.creaturesOf(z.id);
            return (
              <Pressable key={z.id} disabled={locked} onPress={() => setZoneId(z.id)} accessibilityRole="button" accessibilityLabel={z.name}
                style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: state.prophecyZone === z.id ? '#b9a0d9' : colors.border, opacity: locked ? 0.55 : 1 }}>
                <Scene name={z.id as SceneKey} height={96} style={{ borderRadius: 0 }}>
                  <View style={{ flex: 1, justifyContent: 'space-between', padding: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Pill text={locked ? `🔒 Hesap Sv ${z.minLevel}` : `Sv ${list[0]!.level}–${list[4]!.level}`} color="#f2e6cc" />
                      {state.prophecyZone === z.id && <Pill text="★ Kehanet: +altın" color="#f2e6ff" />}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>{z.name}</Text>
                  </View>
                </Scene>
              </Pressable>
            );
          })}
        </>
      ) : (
        <>
          <View style={ui.between}>
            <Pressable onPress={() => setZoneId(null)} hitSlop={10}><Text style={{ color: colors.trim, fontWeight: '800' }}>‹ Bölgeler</Text></Pressable>
            {state.prophecyZone === zone.id && <Pill text="★ Bugünün kehaneti" color="#b9a0d9" />}
          </View>
          <View>
            <Text style={[ui.h2, { fontSize: 22 }]}>{zone.name}</Text>
            <Text style={ui.muted}>{BLURB[zone.id]}</Text>
          </View>
          <ErrorText message={error} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {game.creaturesOf(zone.id).map((cr) => {
              const unknown = cr.level > fighter.level + game.UNKNOWN_LEVEL_GAP;
              const diff = cr.level - fighter.level;
              const tone = unknown ? colors.danger : diff >= 3 ? colors.warn : diff <= -4 ? colors.good : colors.text;
              return (
                <View key={cr.id} style={{ width: cardW, backgroundColor: colors.panel, borderRadius: 8, borderWidth: 1, borderColor: unknown ? '#8c2f2a' : colors.border, padding: 8, gap: 6, alignItems: 'center' }}>
                  <CreatureArt shape={cr.shape} color={cr.color} size={cardW - 16} unknown={unknown} />
                  <Text style={[ui.text, { fontWeight: '800', textAlign: 'center' }]} numberOfLines={1}>{cr.name}</Text>
                  <Text style={{ color: tone, fontWeight: '800', fontSize: 12 }}>{unknown ? 'Sv ???' : `Sv ${cr.level}`}</Text>
                  <Text style={{ color: unknown ? colors.danger : colors.muted, fontSize: 11, textAlign: 'center', minHeight: 28 }} numberOfLines={2}>
                    {unknown ? '??? Bu yaratık senin için çok güçlü olabilir.' : cr.blurb}
                  </Text>
                  <Button title="Saldır" small style={{ alignSelf: 'stretch' }} disabled={!!blocked} busy={busy === cr.id} onPress={() => attack(cr)} />
                </View>
              );
            })}
          </View>
        </>
      )}

      {result && (
        <HuntPopup
          result={result.r}
          creature={result.creature}
          onClose={() => setResult(null)}
          onAgain={fighter.status === 'idle' && result.r.energy.value >= game.ENERGY.fightCost && result.r.hpRatio >= game.ARENA_MIN_HP ? () => { setResult(null); void attack(result.creature); } : undefined}
        />
      )}
    </View>
  );
}

const native = Platform.OS !== 'web';

/** Instant result pop-up: verdict with a short pop, gold/XP/loot, and folded battle details. */
function HuntPopup({ result: r, creature, onClose, onAgain }: { result: HuntResult; creature: game.Creature; onClose: () => void; onAgain?: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  const [details, setDetails] = useState(false);
  useEffect(() => {
    Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.8)), useNativeDriver: native }).start();
  }, [pop]);
  const dealt = r.outcome.log.filter((e) => e.actor === 'a' && (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'double')).reduce((s, e) => s + e.value, 0);
  const taken = r.outcome.log.filter((e) => e.actor === 'b' && (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'double')).reduce((s, e) => s + e.value, 0);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000b0', justifyContent: 'center', padding: 18 }}>
        <Animated.View style={{ backgroundColor: colors.panel, borderRadius: 12, borderWidth: 2, borderColor: r.won ? colors.trim : colors.danger, padding: 16, gap: 10, maxHeight: '88%',
          opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
          <View style={[ui.row, { gap: 12 }]}>
            <CreatureArt shape={creature.shape} color={creature.color} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: 2, color: r.won ? colors.trim : colors.danger }}>{r.won ? 'ZAFER' : 'YENİLGİ'}</Text>
              <Text style={ui.muted}>{r.me.name} vs {creature.name} · {r.outcome.rounds} tur</Text>
            </View>
          </View>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 14 }]}>
            {r.gold > 0 && <Gold amount={r.gold} />}
            <Text style={{ color: colors.xp, fontWeight: '800' }}>+{r.xp} deneyim</Text>
            {r.prophecy && <Text style={{ color: '#b9a0d9', fontWeight: '700' }}>★ kehanet</Text>}
          </View>
          {r.levelsGained > 0 && <Text style={[ui.h2, { color: colors.good }]}>Seviye atladın! Sv {r.me.level}</Text>}
          {r.loot.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {r.loot.map((it, i) => (
                <View key={i} style={{ alignItems: 'center', width: 76, gap: 2 }}>
                  <ItemIcon icon={it.icon} rarity={it.rarity} size={46} qty={it.qty} dim={!it.kept} />
                  <Text style={{ color: game.RARITY_INFO[it.rarity].color, fontSize: 10, textAlign: 'center' }} numberOfLines={2}>{it.kept ? it.name : 'Çanta dolu'}</Text>
                </View>
              ))}
            </View>
          )}
          <Bar ratio={r.hpRatio} color={colors.hp} label={`Can %${Math.round(r.hpRatio * 100)}`} />
          <EnergyBar energy={r.energy} compact />
          <Pressable onPress={() => setDetails(!details)} style={[ui.between, { paddingVertical: 4 }]}>
            <Text style={[ui.label, { fontSize: 11 }]}>Savaş detayları · verdiğin {dealt} / aldığın {taken}</Text>
            <Text style={{ color: colors.trim }}>{details ? '▲' : '▼'}</Text>
          </Pressable>
          {details && (
            <ScrollView style={{ maxHeight: 180 }}>
              {r.outcome.log.filter((e) => e.round > 0).map((e, i) => (
                <Text key={i} style={{ color: e.actor === 'a' ? colors.text : '#d8c9b0', fontSize: 12 }}>
                  {e.round}. {e.actor === 'a' ? r.me.name : creature.name} {e.kind === 'miss' ? 'ıskaladı' : e.kind === 'dodge' ? 'savurdu, rakip sıyrıldı' : e.kind === 'heal' ? `yaralarını sardı (+${e.value} can)` : `${e.kind === 'crit' ? 'KRİTİK ' : ''}vurdu: ${e.value} hasar`}
                </Text>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Kapat" kind="ghost" style={{ flex: 1 }} onPress={onClose} />
            {onAgain && <Button title="Tekrar saldır" style={{ flex: 1 }} onPress={onAgain} />}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
