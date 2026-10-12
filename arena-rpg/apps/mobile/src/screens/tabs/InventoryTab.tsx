import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { game } from '@arena/core';
import { EmptySlot, ItemIcon } from '../../art/ItemIcon';
import { Portrait } from '../../art/Portrait';
import { FighterPicker } from '../../components/FighterPicker';
import { ItemSheet } from '../../components/ItemSheet';
import { DragArea, Draggable, DropZone } from '../../components/DragDrop';
import { Card, ErrorText, SectionTitle } from '../../components/ui';
import { tr } from '../../i18n/tr';
import type { GameState, ItemView } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

const LEFT: game.EquipSlot[] = ['head', 'amulet', 'chest', 'hands'];
const RIGHT: game.EquipSlot[] = ['main_hand', 'off_hand', 'ring1', 'ring2'];
type Drag = { item: ItemView; from: 'bag' | 'slot' };
const USABLE_ON_FIGHTER = ['potion_heal', 'potion_forget'];
type Filter = 'all' | 'equipment' | 'food' | 'potion' | 'resource';
const FILTERS: [Filter, string][] = [['all', 'Hepsi'], ['equipment', 'Ekipman'], ['food', 'Yiyecek'], ['potion', 'İksir'], ['resource', 'Malzeme']];

/** Paper doll + gang bag on one screen: tap an item to compare, equip, eat, upgrade or sell. */
export function InventoryTab({ state, fighterId, setFighterId, refresh, lockScroll }: { state: GameState; fighterId: string; setFighterId: (id: string) => void; refresh: () => Promise<void>; lockScroll?: (locked: boolean) => void }) {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<ItemView[]>([]);
  const [capacity, setCapacity] = useState(48);
  const [selected, setSelected] = useState<ItemView | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
      <DropZone key={s} id={`slot:${s}`}>
        {it ? (
          <Draggable<Drag> payload={{ item: it, from: 'slot' }} size={slotSize} onTap={() => setSelected(it)} accessibilityLabel={`${game.SLOT_NAMES[s]}: ${it.name}`}>
            <ItemIcon icon={it.icon} rarity={it.rarity} size={slotSize} upgrade={it.upgrade} />
          </Draggable>
        ) : <EmptySlot slot={s} size={slotSize} />}
      </DropZone>
    );
  };

  const accepts = ({ item, from }: Drag, zone: string): boolean => {
    if (zone === 'bag') return from === 'slot';
    if (zone === 'doll') return from === 'bag' && (item.kind === 'equipment' || item.kind === 'food' || USABLE_ON_FIGHTER.includes(item.templateId));
    if (zone.startsWith('slot:')) {
      const s = zone.slice(5) as game.EquipSlot;
      return item.kind === 'equipment' && !!item.slot && game.slotsFor(item.slot).includes(s) && item.equippedSlot !== s;
    }
    return false;
  };

  const drop = async ({ item }: Drag, zone: string) => {
    setError(null);
    setNotice(null);
    try {
      if (zone === 'bag') {
        await api.unequip(item.id);
        setNotice(`${item.name} çantaya kondu.`);
      } else if (item.kind === 'equipment') {
        const s = zone.startsWith('slot:') ? (zone.slice(5) as game.EquipSlot) : undefined;
        const why = item.slot ? game.canEquip(item, fighter, s ?? game.slotsFor(item.slot)[0]!) : 'not_equipment';
        if (why) return setError(why === 'wrong_class' ? `${tr.classes[fighter.class].name} bu eşyayı kullanamaz.` : tr.error(why));
        await api.equip(item.id, fighter.id, s);
        setNotice(`${fighter.name} ${item.name} kuşandı.`);
      } else {
        if (item.kind === 'food' && fighter.hpRatio >= 1) return setError(`${fighter.name} zaten tok, canı dolu.`);
        await api.use(item.id, { fighterId: fighter.id });
        setNotice(item.kind === 'food' ? `${fighter.name} ${item.name} yedi${item.heal ? ` (+${item.heal} can)` : ''}.` : `${item.name} ${fighter.name} üzerinde kullanıldı.`);
      }
      await reload();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  };

  return (
    <DragArea<Drag> accepts={accepts} onDrop={(p, z) => void drop(p, z)} onDragChange={(d) => lockScroll?.(d)} style={{ gap: 12 }}>
      <FighterPicker fighters={state.fighters} selectedId={fighter.id} onSelect={setFighterId} />

      <Card trim style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 6 }}>{LEFT.map(slot)}</View>
          <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={[ui.h2, { color: classColor(fighter.class) }]} numberOfLines={1}>{fighter.name}</Text>
            <Text style={ui.muted}>{tr.classes[fighter.class].name} · Sv {fighter.level}</Text>
            <DropZone id="doll" round={60}>
              <Portrait cls={fighter.class} size={Math.min(110, slotSize * 1.9)} hpRatio={fighter.hpRatio} injured={fighter.status === 'injured'} />
            </DropZone>
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
      {notice && <Text style={{ color: colors.good, fontWeight: '700' }}>{notice}</Text>}
      <DropZone id="bag" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {bag.map((it) => {
          const unusable = it.kind === 'equipment' && it.classes !== null && !it.classes.includes(fighter.class);
          return (
            <Draggable<Drag> key={it.id} payload={{ item: it, from: 'bag' }} size={cell} onTap={() => setSelected(it)} accessibilityLabel={it.name}>
              <ItemIcon icon={it.icon} rarity={it.rarity} size={cell} qty={it.qty} upgrade={it.upgrade} dim={unusable} />
            </Draggable>
          );
        })}
        {filter === 'all' && Array.from({ length: Math.max(0, Math.min(12, capacity - bagCount)) }).map((_, i) => (
          <View key={`e${i}`} style={{ width: cell, height: cell, borderRadius: 6, borderWidth: 1, borderColor: '#243039', backgroundColor: '#0d1316' }} />
        ))}
      </DropZone>
      {bag.length === 0 && filter !== 'all' && <Text style={ui.muted}>Bu türde eşya yok.</Text>}
      <Card>
        <Text style={ui.muted}>Eşyaya basılı tut ve sürükle: yiyeceği ya da iksiri karaktere bırakırsan kullanılır, ekipmanı karaktere ya da ilgili yuvaya bırakırsan kuşanılır, kuşanılmış eşyayı çantaya bırakırsan çıkarılır. Kısa dokunuş takılı olanla karşılaştırmayı açar. Soluk eşyalar seçili dövüşçünün sınıfına uymaz.</Text>
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
    </DragArea>
  );
}
