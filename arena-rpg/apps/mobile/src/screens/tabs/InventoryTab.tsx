import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { game } from '@arena/core';
import { EmptySlot, ItemIcon } from '../../art/ItemIcon';
import { Portrait } from '../../art/Portrait';
import { FighterPicker } from '../../components/FighterPicker';
import { ItemSheet } from '../../components/ItemSheet';
import { Card, ErrorText, SectionTitle } from '../../components/ui';
import { tr } from '../../i18n/tr';
import type { GameState, ItemView } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

const LEFT: game.EquipSlot[] = ['head', 'amulet', 'chest', 'hands'];
const RIGHT: game.EquipSlot[] = ['main_hand', 'off_hand', 'ring1', 'ring2'];
type Filter = 'all' | 'equipment' | 'food' | 'potion' | 'resource';
const FILTERS: [Filter, string][] = [['all', 'Hepsi'], ['equipment', 'Ekipman'], ['food', 'Yiyecek'], ['potion', 'İksir'], ['resource', 'Malzeme']];

/** Paper doll + gang bag on one screen: tap an item to compare, equip, eat, upgrade or sell. */
export function InventoryTab({ state, fighterId, setFighterId, refresh }: { state: GameState; fighterId: string; setFighterId: (id: string) => void; refresh: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<ItemView[]>([]);
  const [capacity, setCapacity] = useState(48);
  const [selected, setSelected] = useState<ItemView | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const fighter = state.fighters.find((f) => f.id === fighterId) ?? state.fighters[0]!;

  const load = useCallback(async (): Promise<ItemView[]> => {
    try {
      const inv = await api.inventory();
      setItems(inv.items);
      setCapacity(inv.capacity);
      return inv.items;
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
      return [];
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, state]);

  const reload = async () => {
    await refresh();
    return load();
  };

  const bag = items.filter((i) => !i.fighterId && (filter === 'all' || i.kind === filter));
  const bagCount = items.filter((i) => !i.fighterId).length;
  const contentWidth = Math.min(width, 520) - 28;
  const slotSize = Math.min(58, Math.floor((contentWidth - 24) / 5.4));
  const cols = 6;
  const cell = Math.floor((contentWidth - (cols - 1) * 6) / cols);
  const p = fighter.profile;

  const slot = (s: game.EquipSlot) => {
    const it = fighter.equipment.find((e) => e.equippedSlot === s);
    return (
      <Pressable key={s} onPress={() => it && setSelected(it)} accessibilityLabel={game.SLOT_NAMES[s]} style={{ alignItems: 'center', gap: 2 }}>
        {it ? <ItemIcon icon={it.icon} rarity={it.rarity} size={slotSize} upgrade={it.upgrade} /> : <EmptySlot slot={s} size={slotSize} />}
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <FighterPicker fighters={state.fighters} selectedId={fighter.id} onSelect={setFighterId} />

      <Card trim style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 6 }}>{LEFT.map(slot)}</View>
          <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={[ui.h2, { color: classColor(fighter.class) }]} numberOfLines={1}>{fighter.name}</Text>
            <Text style={ui.muted}>{tr.classes[fighter.class].name} · Sv {fighter.level}</Text>
            <Portrait cls={fighter.class} size={Math.min(110, slotSize * 1.9)} hpRatio={fighter.hpRatio} injured={fighter.status === 'injured'} />
            {slot('feet')}
          </View>
          <View style={{ gap: 6 }}>{RIGHT.map(slot)}</View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {[['Güç', String(fighter.power)], ['Can', `${Math.round(p.maxHp * fighter.hpRatio)}/${p.maxHp}`], ['Hasar', `${p.damageMin}–${p.damageMax}`], ['Zırh', String(p.armor)],
            ['Kritik', `%${Math.round(p.crit * 100)}`], ['Kaçınma', `%${Math.round(p.evasion * 100)}`], ['İsabet', `%${Math.round(p.accuracy * 100)}`], ['Hız', String(p.speed)]].map(([k, v]) => (
            <View key={k} style={{ width: '23.5%', backgroundColor: colors.inset, borderRadius: 5, paddingVertical: 5, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 10 }}>{k}</Text>
              <Text style={[{ color: colors.text, fontWeight: '800', fontSize: 13 }, ui.num]}>{v}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle right={<Text style={[ui.muted, ui.num]}>{bagCount}/{capacity}</Text>}>Çete çantası</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {FILTERS.map(([id, label]) => (
          <Pressable key={id} onPress={() => setFilter(id)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: filter === id ? colors.trim : colors.border, backgroundColor: filter === id ? '#c9a55c22' : 'transparent' }}>
            <Text style={{ color: filter === id ? colors.text : colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText message={error} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {bag.map((it) => {
          const unusable = it.kind === 'equipment' && it.classes !== null && !it.classes.includes(fighter.class);
          return (
            <Pressable key={it.id} onPress={() => setSelected(it)} accessibilityLabel={it.name}>
              <ItemIcon icon={it.icon} rarity={it.rarity} size={cell} qty={it.qty} upgrade={it.upgrade} dim={unusable} />
            </Pressable>
          );
        })}
        {filter === 'all' && Array.from({ length: Math.max(0, Math.min(12, capacity - bagCount)) }).map((_, i) => (
          <View key={`e${i}`} style={{ width: cell, height: cell, borderRadius: 6, borderWidth: 1, borderColor: '#243039', backgroundColor: '#0d1316' }} />
        ))}
      </View>
      {bag.length === 0 && filter !== 'all' && <Text style={ui.muted}>Bu türde eşya yok.</Text>}
      <Card>
        <Text style={ui.muted}>Soluk görünen eşyalar seçili dövüşçünün sınıfına uymuyor. Bir eşyaya dokunarak takılı olanla karşılaştırabilir, giydirebilir, demircide güçlendirebilir ya da satabilirsin.</Text>
      </Card>

      <ItemSheet
        item={selected}
        fighter={fighter}
        gold={state.account.gold}
        expeditionId={state.expeditions.find((e) => !e.recalled)?.id}
        onClose={() => setSelected(null)}
        onChanged={async () => {
          const fresh = await reload();
          // keep the sheet in sync (e.g. after a blacksmith upgrade)
          setSelected((cur) => (cur ? fresh.find((i) => i.id === cur.id) ?? null : null));
        }}
      />
    </View>
  );
}
