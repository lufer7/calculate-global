import { useCallback, useEffect, useState } from 'react';
import { game } from '@arena/core';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ItemIcon } from '../../art/ItemIcon';
import { Scene } from '../../art/Scene';
import { FighterPicker } from '../../components/FighterPicker';
import { ItemDetails, equippedFor } from '../../components/ItemSheet';
import { Button, ErrorText, Gold, SectionTitle, Sheet } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { GameState, MarketOffer } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const SECTIONS: [MarketOffer['section'], string][] = [['equipment', 'Silahçı ve zırhçı'], ['food', 'Yiyecek tezgâhı'], ['potion', 'İksirci']];
const GREETINGS = [
  'Gel bakalım çete reisi! Bugünkü mallar taze, fiyatlar insaflı.',
  'Kılıçlar bilenmiş, peynirler olgun. Ne lazımsa var.',
  'Saat dönünce tezgâh değişir; beğendiğini kaçırma derim.',
];

export function MarketTab({ state, fighterId, setFighterId, now, refresh }: { state: GameState; fighterId: string; setFighterId: (id: string) => void; now: number; refresh: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [nextRefresh, setNextRefresh] = useState(0);
  const [selected, setSelected] = useState<MarketOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fighter = state.fighters.find((f) => f.id === fighterId) ?? state.fighters[0]!;

  const load = useCallback(async () => {
    try {
      const m = await api.market();
      setOffers(m.offers);
      setNextRefresh(m.nextRefresh);
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (nextRefresh && now >= nextRefresh) void load();
  }, [now >= nextRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardW = Math.floor((Math.min(width, 520) - 28 - 8) / 2);

  return (
    <View style={{ gap: 12 }}>
      <Scene name="market" height={130}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <View style={{ backgroundColor: '#0f1417d0', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: colors.trimDim }}>
            <Text style={[ui.label, { fontSize: 10 }]}>Salı Pazarı · Pazarcı Hüsnü</Text>
            <Text style={[ui.text, { fontSize: 13 }]}>“{GREETINGS[Math.floor(now / 3_600_000) % GREETINGS.length]}”</Text>
          </View>
        </View>
      </Scene>
      <View style={ui.between}>
        <Gold amount={state.account.gold} />
        <Text style={[ui.muted, ui.num]}>Tezgâh yenileniyor: {formatDuration(nextRefresh - now)}</Text>
      </View>
      <ErrorText message={error} />

      {SECTIONS.map(([section, title]) => (
        <View key={section} style={{ gap: 8 }}>
          <SectionTitle>{title}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {offers.filter((o) => o.section === section).map((o) => (
              <Pressable key={o.offerId} onPress={() => !o.soldOut && setSelected(o)} style={{ width: cardW, flexDirection: 'row', gap: 8, padding: 8, borderRadius: 6, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, opacity: o.soldOut ? 0.4 : 1, alignItems: 'center' }}>
                <ItemIcon icon={o.item.icon} rarity={o.item.rarity} size={46} qty={o.item.qty} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: o.item.kind === 'equipment' ? rarityColor(o.item.rarity) : colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={2}>{o.item.name}</Text>
                  {o.soldOut ? <Text style={ui.muted}>Satıldı</Text> : <Gold amount={o.price} size={12} />}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {selected && (
        <Sheet visible onClose={() => { setSelected(null); setError(null); }} title="Pazarcının malı">
          {selected.item.kind === 'equipment' && <FighterPicker fighters={state.fighters} selectedId={fighter.id} onSelect={setFighterId} size={40} />}
          <ItemDetails item={selected.item} compareTo={equippedFor(selected.item, fighter)} />
          <View style={ui.between}>
            <Text style={ui.text}>Fiyat</Text>
            <Gold amount={selected.price} />
          </View>
          <ErrorText message={error} />
          <Button
            title={state.account.gold < selected.price ? 'Altının yetmiyor' : 'Satın al (çantaya)'}
            disabled={state.account.gold < selected.price}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await api.buy(selected.offerId);
                setSelected(null);
                await Promise.all([refresh(), load()]);
              } catch (e) {
                setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Sheet>
      )}
    </View>
  );
}

const rarityColor = (r: game.Rarity) => game.RARITY_INFO[r].color;
