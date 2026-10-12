import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { NavIcon } from '../art/NavIcon';
import { ErrorText, Gold, useNow } from '../components/ui';
import { tr } from '../i18n/tr';
import type { FighterView, GameState } from '../lib/api';
import { ApiError, api } from '../lib/api';
import { CreateFighterScreen } from './CreateFighterScreen';
import { FighterScreen } from './FighterScreen';
import { LegalScreen } from './LegalScreen';
import { AccountTab } from './tabs/AccountTab';
import { AlchemyTab } from './tabs/AlchemyTab';
import { ArenaTab } from './tabs/ArenaTab';
import { ExpeditionsTab } from './tabs/ExpeditionsTab';
import { GangTab } from './tabs/GangTab';
import { InventoryTab } from './tabs/InventoryTab';
import { MarketTab } from './tabs/MarketTab';
import type { MoreId } from './tabs/MoreTab';
import { MoreTab } from './tabs/MoreTab';
import { ReportsTab } from './tabs/ReportsTab';
import { ResearchTab } from './tabs/ResearchTab';
import { colors, fonts, ui } from './theme';

const TABS = [
  { id: 'gang', title: 'Çete', icon: 'gang' },
  { id: 'inventory', title: 'Çanta', icon: 'bag' },
  { id: 'expeditions', title: 'Sefer', icon: 'map' },
  { id: 'arena', title: 'Arena', icon: 'swords' },
  { id: 'market', title: 'Pazar', icon: 'market' },
  { id: 'more', title: 'Daha', icon: 'more' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const MORE_TITLES: Record<MoreId, string> = { research: 'Rasathane', alchemy: 'Simya', reports: 'Raporlar', account: 'Hesap ve gizlilik' };

export function MainScreen({ initial, onSignedOut }: { initial: GameState; onSignedOut: () => void }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<TabId>('gang');
  const [more, setMore] = useState<MoreId | null>(null);
  const [dragLock, setDragLock] = useState(false);
  const [fighterId, setFighterId] = useState<string>(initial.fighters[0]?.id ?? '');
  const [openFighter, setOpenFighter] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(initial.serverTime - Date.now());
  const now = useNow(offset);

  const refresh = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      setOffset(s.serverTime - Date.now());
      setError(null);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'unknown';
      if (code === 'unauthorized' || code === 'banned') onSignedOut();
      else setError(tr.error(code));
    }
  }, [onSignedOut]);

  // Timers are settled on the server; poll often enough that countdowns flip promptly.
  useEffect(() => {
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);
  const nextDue = Math.min(
    ...state.expeditions.map((e) => e.endsAt),
    state.account.activeResearch?.until ?? Infinity,
    ...state.fighters.map((f) => f.statusUntil ?? Infinity),
  );
  useEffect(() => {
    if (Number.isFinite(nextDue) && now >= nextDue) void refresh();
  }, [now >= nextDue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (legal) return <LegalScreen which={legal} onClose={() => setLegal(null)} />;
  if (creating) return <CreateFighterScreen isFirst={false} onCreated={async () => { setCreating(false); await refresh(); }} onCancel={() => setCreating(false)} />;
  const fighter: FighterView | undefined = state.fighters.find((f) => f.id === openFighter);
  if (fighter) return <FighterScreen fighter={fighter} onBack={() => setOpenFighter(null)} onChanged={refresh} onInventory={() => { setFighterId(fighter.id); setOpenFighter(null); setTab('inventory'); }} />;

  const selectFighter = (id: string) => setFighterId(id);
  const title = tab === 'more' && more ? MORE_TITLES[more] : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.bgDeep }}>
        <View style={ui.between}>
          {title ? (
            <Pressable onPress={() => setMore(null)} style={ui.row} hitSlop={10}>
              <NavIcon name="back" color={colors.trim} />
              <Text style={[ui.h2, { color: colors.text }]}>{title}</Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 2, fontFamily: fonts.display }}>AEGIS</Text>
          )}
          <View style={ui.row}>
            {state.unreadReports > 0 && (
              <Pressable onPress={() => { setTab('more'); setMore('reports'); }} hitSlop={8} style={ui.row}>
                <NavIcon name="scroll" color={colors.warn} size={20} />
                <Text style={{ color: colors.warn, fontWeight: '800' }}>{state.unreadReports}</Text>
              </Pressable>
            )}
            <Gold amount={state.account.gold} />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={!dragLock}
        contentContainerStyle={ui.screen}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.trim} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
      >
        <ErrorText message={error} />
        {tab === 'gang' && <GangTab state={state} now={now} onOpen={(f) => setOpenFighter(f.id)} onNew={() => setCreating(true)} />}
        {tab === 'inventory' && <InventoryTab state={state} fighterId={fighterId} setFighterId={selectFighter} refresh={refresh} lockScroll={setDragLock} />}
        {tab === 'expeditions' && <ExpeditionsTab state={state} now={now} refresh={refresh} />}
        {tab === 'arena' && <ArenaTab state={state} fighterId={fighterId} setFighterId={selectFighter} now={now} refresh={refresh} />}
        {tab === 'market' && <MarketTab state={state} fighterId={fighterId} setFighterId={selectFighter} now={now} refresh={refresh} />}
        {tab === 'more' && !more && <MoreTab state={state} onOpen={setMore} />}
        {tab === 'more' && more === 'research' && <ResearchTab state={state} now={now} refresh={refresh} />}
        {tab === 'more' && more === 'alchemy' && <AlchemyTab state={state} refresh={refresh} />}
        {tab === 'more' && more === 'reports' && <ReportsTab refresh={refresh} />}
        {tab === 'more' && more === 'account' && <AccountTab state={state} onLegal={setLegal} onSignedOut={onSignedOut} />}
      </ScrollView>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.bgDeep, paddingBottom: 4 }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => { setTab(t.id); setMore(null); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.title}
              style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 2, borderTopWidth: 2, borderColor: on ? colors.trim : 'transparent' }}>
              <NavIcon name={t.icon} color={on ? colors.trim : colors.muted} size={22} />
              <Text style={{ color: on ? colors.text : colors.muted, fontSize: 10, fontWeight: '700' }}>{t.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
