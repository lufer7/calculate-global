import { useState } from 'react';
import { Text, View } from 'react-native';
import { game } from '@arena/core';
import { ItemIcon } from '../art/ItemIcon';
import { tr } from '../i18n/tr';
import type { FighterView, ItemView } from '../lib/api';
import { ApiError, api } from '../lib/api';
import { colors, ui } from '../screens/theme';
import { Button, ErrorText, Gold, Sheet, StatRow } from './ui';

export const STAT_LABELS: [keyof game.GearStats, string, 'flat' | 'pct'][] = [
  ['damage', 'Hasar', 'flat'], ['magic', 'Büyü gücü', 'flat'], ['armor', 'Zırh', 'flat'], ['hp', 'Can', 'flat'],
  ['crit', 'Kritik şansı', 'pct'], ['evasion', 'Kaçınma', 'pct'], ['accuracy', 'İsabet', 'pct'], ['speed', 'Hız', 'flat'],
];

const fmt = (v: number, kind: 'flat' | 'pct') => (kind === 'pct' ? `%${Math.round(v * 1000) / 10}` : String(v));

/** What is currently in the slot this item would go to (for comparison). */
export function equippedFor(item: ItemView, fighter: FighterView | undefined): ItemView | undefined {
  if (!fighter || !item.slot) return undefined;
  const slots = game.slotsFor(item.slot);
  return fighter.equipment.find((e) => e.equippedSlot !== null && slots.includes(e.equippedSlot) && e.id !== item.id);
}

export function ItemDetails({ item, compareTo }: { item: ItemView; compareTo?: ItemView }) {
  const rarity = game.RARITY_INFO[item.rarity];
  return (
    <View style={{ gap: 10 }}>
      <View style={[ui.row, { alignItems: 'flex-start' }]}>
        <ItemIcon icon={item.icon} rarity={item.rarity} size={72} qty={item.qty} upgrade={item.upgrade} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[ui.h2, { color: item.kind === 'equipment' ? rarity.color : colors.text }]}>{item.name}</Text>
          {item.kind === 'equipment' && <Text style={ui.muted}>{rarity.name} · Eşya seviyesi {item.itemLevel}</Text>}
          {item.slot && <Text style={ui.muted}>{game.SLOT_NAMES[game.slotsFor(item.slot)[0]!]}{item.classes ? ` · ${item.classes.map((c) => tr.classes[c].name).join(', ')}` : ' · Tüm sınıflar'}</Text>}
          {item.heal && <Text style={{ color: colors.good }}>Canı %{Math.round(item.heal * 100)} doldurur</Text>}
          {item.description && <Text style={ui.muted}>{item.description}</Text>}
          {item.kind === 'resource' && <Text style={ui.muted}>Aktar malzemesi. Müneccimler iksir kaynatmak için kullanır.</Text>}
        </View>
      </View>
      {item.kind === 'resource' && <ResourceSources templateId={item.templateId} />}
      {item.stats && (
        <View style={{ gap: 4, backgroundColor: colors.inset, borderRadius: 6, padding: 10 }}>
          {STAT_LABELS.filter(([k]) => item.stats![k] !== 0 || (compareTo?.stats?.[k] ?? 0) !== 0).map(([k, label, kind]) => (
            <StatRow key={k} label={label} value={fmt(item.stats![k], kind)} delta={compareTo?.stats ? (kind === 'pct' ? (item.stats![k] - compareTo.stats[k]) * 100 : item.stats![k] - compareTo.stats[k]) : undefined} />
          ))}
          {compareTo && <Text style={[ui.muted, { fontSize: 11 }]}>▲▼ Şu an takılı olan {compareTo.name} ile karşılaştırma</Text>}
        </View>
      )}
    </View>
  );
}

/** "Nereden bulunur?" box for hunter materials (Aktar). */
export function ResourceSources({ templateId }: { templateId: string }) {
  const lines = tr.resourceSources[templateId];
  if (!lines) return null;
  return (
    <View style={{ gap: 4, backgroundColor: colors.inset, borderRadius: 6, padding: 10 }}>
      <Text style={[ui.label, { fontSize: 11 }]}>Nereden bulunur?</Text>
      {lines.map((l) => <Text key={l} style={[ui.text, { fontSize: 13 }]}>• {l}</Text>)}
    </View>
  );
}

/** Same item, same rarity, not equipped → can be merged into `item` for +1. */
export const mergeCandidates = (item: ItemView, items: ItemView[]) =>
  items.filter((x) => x.id !== item.id && !x.fighterId && x.kind === 'equipment' && x.templateId === item.templateId && x.rarity === item.rarity);

/** Item actions: equip/unequip for the selected fighter, use, "+ basma" (merge), sell. */
export function ItemSheet({ item, items = [], fighter, gold, onClose, onChanged, explorationId }: {
  item: ItemView | null; items?: ItemView[]; fighter?: FighterView; gold: number; onClose: () => void; onChanged: () => Promise<void>; explorationId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (!item) return null;
  const equippedHere = item.fighterId !== null;
  const compare = !equippedHere ? equippedFor(item, fighter) : undefined;
  const err = fighter && item.kind === 'equipment' && item.slot && !equippedHere
    ? game.canEquip({ templateId: item.templateId, itemLevel: item.itemLevel }, { class: fighter.class, level: fighter.level }, game.slotsFor(item.slot)[0]!)
    : null;

  const act = async (key: string, fn: () => Promise<unknown>, close = true) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onChanged();
      if (close) onClose();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet visible onClose={() => { setError(null); onClose(); }} title={item.kind === 'equipment' ? 'Eşya' : item.kind === 'food' ? 'Yiyecek' : item.kind === 'potion' ? 'İksir' : 'Malzeme'}>
      <ItemDetails item={item} compareTo={compare} />
      <ErrorText message={error} />
      {item.kind === 'equipment' && fighter && !equippedHere && (
        <Button title={err ? tr.error(err) : `${fighter.name} giysin`} disabled={!!err} busy={busy === 'equip'} onPress={() => act('equip', () => api.equip(item.id, fighter.id))} />
      )}
      {equippedHere && <Button title="Çıkar (çantaya koy)" kind="ghost" busy={busy === 'unequip'} onPress={() => act('unequip', () => api.unequip(item.id))} />}
      {item.kind === 'food' && fighter && (
        <Button title={`${fighter.name} yesin (can %${Math.round(fighter.hpRatio * 100)})`} disabled={fighter.hpRatio >= 1} busy={busy === 'use'} onPress={() => act('use', () => api.use(item.id, { fighterId: fighter.id }), item.qty <= 1)} />
      )}
      {(item.templateId === 'potion_heal' || item.templateId === 'potion_forget') && fighter && (
        <Button title={`${fighter.name} üzerinde kullan`} busy={busy === 'use'} onPress={() => act('use', () => api.use(item.id, { fighterId: fighter.id }))} />
      )}
      {item.templateId === 'potion_haste' && (
        <Button title={explorationId ? 'Yoldaki keşfe kullan (%10 erken döner)' : 'Yolda keşif yok'} disabled={!explorationId} busy={busy === 'use'} onPress={() => act('use', () => api.use(item.id, { explorationId }))} />
      )}
      {item.upgradeCost !== null && (() => {
        const dupes = mergeCandidates(item, items);
        return (
          <View style={{ gap: 6, backgroundColor: colors.inset, padding: 10, borderRadius: 6 }}>
            <View style={ui.between}>
              <View style={{ flex: 1 }}>
                <Text style={ui.text}>+ basma: {item.name.replace(/ \+\d+$/, '')} +{item.upgrade + 1}</Text>
                <View style={ui.row}><Gold amount={item.upgradeCost} size={13} /><Text style={ui.muted}>+ {dupes.length > 0 ? `aynı eşyadan 1 tane (${dupes.length} var)` : 'aynı eşyadan 1 tane'}</Text></View>
              </View>
              <Button title="+1 bas" small disabled={dupes.length === 0 || gold < item.upgradeCost} busy={busy === 'up'}
                onPress={() => act('up', () => api.merge(item.id, [...dupes].sort((a, b) => a.upgrade - b.upgrade)[0]!.id), false)} />
            </View>
            <Text style={[ui.muted, { fontSize: 12 }]}>Aynı eşyanın aynı renktekini çantada bu eşyanın üstüne sürükleyip bırakarak da basabilirsin. Her + bir öncekinden pahalıdır.</Text>
          </View>
        );
      })()}
      {!equippedHere && (
        <View style={ui.between}>
          <Text style={ui.muted}>Tüccara sat</Text>
          <View style={ui.row}>
            <Gold amount={item.sellPrice * item.qty} size={13} />
            <Button title={item.qty > 1 ? `Hepsini sat (${item.qty})` : 'Sat'} kind="danger" small busy={busy === 'sell'} onPress={() => act('sell', () => api.sell(item.id))} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
