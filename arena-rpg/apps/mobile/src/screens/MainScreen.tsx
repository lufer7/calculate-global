import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, RefreshControl, ScrollView, Text, ToastAndroid, View } from 'react-native';
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
import { CamiTab } from './tabs/CamiTab';
import { ClanTab } from './tabs/ClanTab';
import { ExpeditionsTab } from './tabs/ExpeditionsTab';
import { ExplorationTab } from './tabs/ExplorationTab';
import { HomeTab } from './tabs/HomeTab';
import { InventoryTab } from './tabs/InventoryTab';
import { MarketTab } from './tabs/MarketTab';
import { ReportsTab } from './tabs/ReportsTab';
import { ResearchTab } from './tabs/ResearchTab';
import { colors, ui } from './theme';

/** Two rows so every screen is one tap away (rev3): play actions on top, gang/services below. */
const ROW1 = [
  { id: 'home', title: 'Ana Sayfa', icon: 'home' },
  { id: 'inventory', title: 'Çanta', icon: 'bag' },
  { id: 'expeditions', title: 'Sefer', icon: 'map' },
  { id: 'exploration', title: 'Keşif', icon: 'compass' },
  { id: 'arena', title: 'Arena', icon: 'swords' },
  { id: 'market', title: 'Pazar', icon: 'market' },
] as const;
const ROW2 = [
  { id: 'clan', title: 'Sancak', icon: 'banner' },
  { id: 'research', title: 'Rasathane', icon: 'telescope' },
  { id: 'alchemy', title: 'Aktar', icon: 'mortar' },
  { id: 'cami', title: 'Cami', icon: 'cami' },
  { id: 'reports', title: 'Raporlar', icon: 'scroll' },
  { id: 'account', title: 'Hesap', icon: 'user' },
] as const;
type TabId = (typeof ROW1)[number]['id'] | (typeof ROW2)[number]['id'];
const TITLES: Record<TabId, string> = Object.fromEntries([...ROW1, ...ROW2].map((t) => [t.id, t.title])) as Record<TabId, string>;

export function MainScreen({ initial, onSignedOut }: { initial: GameState; onSignedOut: () => void }) {
  const [state, setState] = useState(initial);
  const [tab, setTabState] = useState<TabId>('home');
  // Android back walks back through the screens instead of closing the game.
  const history = useRef<TabId[]>([]);
  const lastBack = useRef(0);
  const setTab = useCallback((next: TabId) => {
    setTabState((cur) => {
      if (cur !== next) history.current = [...history.current.filter((t) => t !== next), cur].slice(-10);
      return next;
    });
  }, []);
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
    ...state.explorations.map((e) => e.endsAt),
    state.account.activeResearch?.until ?? Infinity,
    ...state.fighters.map((f) => f.statusUntil ?? Infinity),
  );
  useEffect(() => {
    if (Number.isFinite(nextDue) && now >= nextDue) void refresh();
  }, [now >= nextDue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (legal) return setLegal(null), true;
      if (creating) return setCreating(false), true;
      if (openFighter) return setOpenFighter(null), true;
      const prev = history.current.pop();
      if (prev) return setTabState(prev), true;
      if (tab !== 'home') return setTabState('home'), true;
      // On the home screen: a second press within 2 s leaves the game.
      const t = Date.now();
      if (t - lastBack.current < 2000) return false;
      lastBack.current = t;
      if (Platform.OS === 'android') ToastAndroid.show('Çıkmak için tekrar bas', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [legal, creating, openFighter, tab]);

  if (legal) return <LegalScreen which={legal} onClose={() => setLegal(null)} />;
  if (creating) return <CreateFighterScreen isFirst={false} onCreated={async () => { setCreating(false); await refresh(); }} onCancel={() => setCreating(false)} />;
  const fighter: FighterView | undefined = state.fighters.find((f) => f.id === openFighter);
  if (fighter) return <FighterScreen fighter={fighter} onBack={() => setOpenFighter(null)} onChanged={refresh} onInventory={() => { setFighterId(fighter.id); setOpenFighter(null); setTab('inventory'); }} />;

  const selectFighter = (id: string) => setFighterId(id);

  const tabButton = (t: { id: TabId; title: string; icon: string }, compact: boolean) => {
    const on = tab === t.id;
    const badge = t.id === 'reports' ? state.unreadReports : 0;
    return (
      <Pressable key={t.id} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.title}
        style={{ flex: 1, alignItems: 'center', paddingTop: compact ? 5 : 7, paddingBottom: compact ? 4 : 3, gap: 1, borderTopWidth: 2, borderColor: on ? colors.trim : 'transparent', backgroundColor: on ? '#c9a55c14' : 'transparent' }}>
        <View>
          <NavIcon name={t.icon} color={on ? colors.trim : colors.muted} size={compact ? 18 : 21} />
          {badge > 0 && (
            <View style={{ position: 'absolute', right: -9, top: -4, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={{ color: on ? colors.text : colors.muted, fontSize: compact ? 9.5 : 10, fontWeight: '700' }}>{t.title}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.bgDeep }}>
        <View style={ui.between}>
          <Text style={[ui.h2, { color: colors.text }]}>{TITLES[tab]}</Text>
          <Gold amount={state.account.gold} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={!dragLock}
        contentContainerStyle={ui.screen}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.trim} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
      >
        <ErrorText message={error} />
        {tab === 'home' && <HomeTab state={state} now={now} onOpen={(f) => setOpenFighter(f.id)} onNew={() => setCreating(true)} onGo={setTab} />}
        {tab === 'inventory' && <InventoryTab state={state} fighterId={fighterId} setFighterId={selectFighter} refresh={refresh} lockScroll={setDragLock} />}
        {tab === 'expeditions' && <ExpeditionsTab state={state} fighterId={fighterId} setFighterId={selectFighter} refresh={refresh} />}
        {tab === 'exploration' && <ExplorationTab state={state} now={now} refresh={refresh} />}
        {tab === 'arena' && <ArenaTab state={state} fighterId={fighterId} setFighterId={selectFighter} now={now} refresh={refresh} />}
        {tab === 'market' && <MarketTab state={state} fighterId={fighterId} setFighterId={selectFighter} now={now} refresh={refresh} />}
        {tab === 'clan' && <ClanTab state={state} now={now} refresh={refresh} />}
        {tab === 'research' && <ResearchTab state={state} now={now} refresh={refresh} />}
        {tab === 'alchemy' && <AlchemyTab state={state} refresh={refresh} />}
        {tab === 'cami' && <CamiTab state={state} now={now} refresh={refresh} />}
        {tab === 'reports' && <ReportsTab refresh={refresh} />}
        {tab === 'account' && <AccountTab state={state} onLegal={setLegal} onSignedOut={onSignedOut} />}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderColor: colors.trimDim, backgroundColor: colors.bgDeep, paddingBottom: 2 }}>
        <View style={{ flexDirection: 'row' }}>{ROW1.map((t) => tabButton(t, false))}</View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border }}>{ROW2.map((t) => tabButton(t, true))}</View>
      </View>
    </View>
  );
}
