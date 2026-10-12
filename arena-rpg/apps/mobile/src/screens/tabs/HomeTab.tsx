import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { game } from '@arena/core';
import { Banner } from '../../art/Banner';
import { NavIcon } from '../../art/NavIcon';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { formatDuration, tr } from '../../i18n/tr';
import type { FighterView, GameState } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

const UNLOCKS = game.GAME_CONFIG.fighter.unlock_levels;
/** Slot positions around the leader (fractions of the stage), slot 0 is the leader in the middle. */
const SPOTS: [number, number][] = [[0.5, 0.5], [0.17, 0.25], [0.83, 0.25], [0.17, 0.77], [0.83, 0.77]];

/**
 * Ana Sayfa: the gang around its leader around the camp fire. Tap a fighter to open them,
 * an empty slot to recruit; locked slots show the account level that opens them.
 */
export function HomeTab({ state, now, onOpen, onNew, onGo }: {
  state: GameState; now: number; onOpen: (f: FighterView) => void; onNew: () => void; onGo: (tab: 'expeditions' | 'exploration' | 'research' | 'clan' | 'reports') => void;
}) {
  const { width } = useWindowDimensions();
  const { account, fighters } = state;
  const stageW = Math.min(width, 520) - 28;
  const stageH = Math.max(380, stageW * 1.05);

  const chips: { key: string; icon: string; text: string; go: Parameters<typeof onGo>[0] }[] = [];
  const nextExp = [...state.expeditions].sort((a, b) => a.endsAt - b.endsAt)[0];
  if (nextExp) chips.push({ key: 'exp', icon: 'map', text: `${state.expeditions.length} sefer · ${formatDuration(nextExp.endsAt - now)}`, go: 'expeditions' });
  const nextX = [...state.explorations].sort((a, b) => a.endsAt - b.endsAt)[0];
  if (nextX) chips.push({ key: 'x', icon: 'compass', text: `${state.explorations.length} keşif · ${formatDuration(nextX.endsAt - now)}`, go: 'exploration' });
  if (account.activeResearch) chips.push({ key: 'r', icon: 'telescope', text: `${game.RESEARCH[account.activeResearch.id]?.name ?? 'Araştırma'} · ${formatDuration(account.activeResearch.until - now)}`, go: 'research' });
  if (state.unreadReports > 0) chips.push({ key: 'rep', icon: 'scroll', text: `${state.unreadReports} yeni rapor`, go: 'reports' });

  return (
    <View style={{ gap: 12 }}>
      <View style={{ width: stageW, height: stageH, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.trimDim }}>
        <Scene name="camp" fill style={{ borderRadius: 0, position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0b0f1255' }} />
        {/* soft ring the gang stands on */}
        <View pointerEvents="none" style={{ position: 'absolute', left: stageW * 0.1, top: stageH * 0.14, width: stageW * 0.8, height: stageH * 0.74, borderRadius: stageW, borderWidth: 1, borderColor: '#c9a55c33', borderStyle: 'dashed' }} />
        {state.clan && (
          <Pressable onPress={() => onGo('clan')} accessibilityLabel={`Sancak: ${state.clan.name}`} style={{ position: 'absolute', right: 10, top: 8, alignItems: 'center' }}>
            <Banner color={state.clan.color} symbol={state.clan.symbol} size={30} />
            <Text style={{ color: '#f2e6cc', fontSize: 10, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }}>[{state.clan.tag}]</Text>
          </Pressable>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', left: 10, top: 8 }}>
          <Text style={{ color: '#f2e6cc', fontWeight: '900', fontSize: 15, textShadowColor: '#000', textShadowRadius: 4 }}>{account.displayName}</Text>
          <Text style={{ color: '#f2e6cccc', fontSize: 11, textShadowColor: '#000', textShadowRadius: 3 }}>Hesap seviyesi {account.accountLevel} · {fighters.length}/{account.fighterSlots} dövüşçü</Text>
        </View>
        {SPOTS.map(([fx, fy], i) => {
          const f = fighters[i];
          const leader = i === 0;
          const size = leader ? Math.min(118, stageW * 0.3) : Math.min(78, stageW * 0.2);
          const left = fx * stageW - size / 2;
          const top = fy * stageH - (size * 1.2) / 2 - (leader ? 4 : 0);
          if (f) return <FighterNode key={f.id} f={f} now={now} size={size} left={left} top={top} leader={leader} onPress={() => onOpen(f)} />;
          const open = i < account.fighterSlots;
          return (
            <Pressable key={`slot${i}`} disabled={!open} onPress={onNew} accessibilityLabel={open ? 'Yeni dövüşçü kat' : `Hesap seviyesi ${UNLOCKS[i]} gerekir`}
              style={{ position: 'absolute', left, top, width: size, height: size * 1.2, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: open ? colors.trim : '#ffffff40', backgroundColor: '#0d121599', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Text style={{ color: open ? colors.trim : '#ffffff70', fontSize: open ? 28 : 18, fontWeight: '900' }}>{open ? '+' : '🔒'}</Text>
              <Text style={{ color: open ? colors.text : '#ffffff90', fontSize: 10, textAlign: 'center', fontWeight: '700' }}>{open ? 'Dövüşçü kat' : `Sv ${UNLOCKS[i]}`}</Text>
            </Pressable>
          );
        })}
      </View>

      {chips.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chips.map((c) => (
            <Pressable key={c.key} onPress={() => onGo(c.go)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.panel }}>
              <NavIcon name={c.icon} color={colors.trim} size={16} />
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{c.text}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function FighterNode({ f, now, size, left, top, leader, onPress }: { f: FighterView; now: number; size: number; left: number; top: number; leader: boolean; onPress: () => void }) {
  const busy = f.status !== 'idle';
  const statusColor = f.status === 'injured' ? colors.danger : busy ? colors.warn : colors.good;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${f.name}, ${tr.classes[f.class].name}, seviye ${f.level}`}
      style={({ pressed }) => ({ position: 'absolute', left: left - 10, top, width: size + 20, alignItems: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <View style={{ shadowColor: leader ? colors.trim : '#000', shadowOpacity: leader ? 0.8 : 0.5, shadowRadius: leader ? 12 : 5, elevation: leader ? 8 : 3 }}>
        <Portrait cls={f.class} size={size} hpRatio={f.hpRatio} injured={f.status === 'injured'} />
        {leader && <Text style={{ position: 'absolute', top: -14, alignSelf: 'center', fontSize: 16 }}>👑</Text>}
        {f.skillPoints > 0 && (
          <View style={{ position: 'absolute', right: -6, top: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: colors.trim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000' }}>
            <Text style={{ color: colors.accentInk, fontWeight: '900', fontSize: 11 }}>★{f.skillPoints}</Text>
          </View>
        )}
      </View>
      <View style={{ width: size, height: 5, marginTop: 4, borderRadius: 3, backgroundColor: '#00000090', overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(f.hpRatio * 100)}%`, height: '100%', backgroundColor: colors.hp }} />
      </View>
      <Text numberOfLines={1} style={{ color: classColor(f.class), fontWeight: '900', fontSize: leader ? 15 : 12, marginTop: 2, textShadowColor: '#000', textShadowRadius: 4 }}>{f.name}</Text>
      <Text style={{ color: '#f2e6cc', fontSize: 10, textShadowColor: '#000', textShadowRadius: 3 }}>Sv {f.level}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, backgroundColor: '#000000a0', borderWidth: 1, borderColor: statusColor }}>
        <Text style={{ color: statusColor, fontSize: 9, fontWeight: '800' }}>
          {tr.status[f.status] ?? f.status}{busy && f.statusUntil ? ` · ${formatDuration(f.statusUntil - now)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
