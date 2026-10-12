import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card, ErrorText, useNow } from '../components/ui';
import { tr } from '../i18n/tr';
import type { FighterView, GameState } from '../lib/api';
import { ApiError, api } from '../lib/api';
import { CreateFighterScreen } from './CreateFighterScreen';
import { FighterScreen } from './FighterScreen';
import { LegalScreen } from './LegalScreen';
import { AccountTab } from './tabs/AccountTab';
import { ComingSoonTab } from './tabs/ComingSoonTab';
import { ExpeditionsTab } from './tabs/ExpeditionsTab';
import { FightersTab } from './tabs/FightersTab';
import { ReportsTab } from './tabs/ReportsTab';
import { ResearchTab } from './tabs/ResearchTab';
import { colors, ui } from './theme';

const TABS = [
  { id: 'fighters', title: 'Dövüşçüler' },
  { id: 'expeditions', title: 'Seferler' },
  { id: 'research', title: 'Kafa Kazanı' },
  { id: 'market', title: 'Salı Pazarı' },
  { id: 'inventory', title: 'Envanter' },
  { id: 'arena', title: 'Arena' },
  { id: 'reports', title: 'Raporlar' },
  { id: 'account', title: 'Hesap' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function MainScreen({ initial, onSignedOut }: { initial: GameState; onSignedOut: () => void }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<TabId>('fighters');
  const [fighterId, setFighterId] = useState<string | null>(null);
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
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);
  const nextDue = Math.min(...state.expeditions.map((e) => e.endsAt), state.account.activeResearch?.until ?? Infinity, ...state.fighters.map((f) => f.statusUntil ?? Infinity));
  useEffect(() => {
    if (Number.isFinite(nextDue) && now >= nextDue) void refresh();
  }, [now >= nextDue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (legal) return <LegalScreen which={legal} onClose={() => setLegal(null)} />;
  if (creating) return <CreateFighterScreen isFirst={false} onCreated={async () => { setCreating(false); await refresh(); }} onCancel={() => setCreating(false)} />;
  const fighter: FighterView | undefined = state.fighters.find((f) => f.id === fighterId);
  if (fighter) return <FighterScreen fighter={fighter} onBack={() => setFighterId(null)} onChanged={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 2, borderBottomWidth: 1, borderColor: colors.border }}>
        <View style={ui.between}>
          <Text style={[ui.h2, { letterSpacing: 1 }]}>TOZ VE DEMİR</Text>
          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16, fontVariant: ['tabular-nums'] }}>◉ {state.account.gold}</Text>
        </View>
        <Text style={ui.muted}>{state.account.displayName} · Hesap Sv {state.account.accountLevel}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderColor: colors.border }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}
            style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2, borderColor: tab === t.id ? colors.accent : 'transparent' }}>
            <Text style={{ color: tab === t.id ? colors.text : colors.muted, fontWeight: '700' }}>
              {t.title}{t.id === 'reports' && state.unreadReports > 0 ? ` (${state.unreadReports})` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={ui.screen}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
      >
        <ErrorText message={error} />
        {tab === 'fighters' && <FightersTab state={state} now={now} onOpen={(f) => setFighterId(f.id)} onNew={() => setCreating(true)} />}
        {tab === 'expeditions' && <ExpeditionsTab state={state} now={now} refresh={refresh} />}
        {tab === 'research' && <ResearchTab state={state} now={now} refresh={refresh} />}
        {tab === 'market' && (
          <ComingSoonTab title="Salı Pazarı" lines={[
            'NPC pazarcıdan yiyecek: arenada azalan canı doldurur, stok her saat yenilenir.',
            'Dövüşçüler için farklı faydalar sağlayan ekipmanlar.',
            'İksirler (Şifa, Hız, Şans, Unutma) ve Avcı kaynakları.',
          ]} />
        )}
        {tab === 'inventory' && (
          <ComingSoonTab title="Envanter" lines={[
            'Karakter giydirme penceresi ve envanter aynı ekranda.',
            'Ekipmanı sürükle-bırak ya da dokunarak değiştir, giyili eşyayla yan yana karşılaştır.',
            'Demirci: onarım ve güçlendirme (Kılıç Ustalarına indirim).',
          ]} />
        )}
        {tab === 'arena' && (
          <ComingSoonTab title="Arena ve PvP" lines={[
            'Sıra tabanlı düellolar ve sıralama.',
            'Arenada yaralanma veya altın kaybı yok; yalnızca can azalır.',
            'Diğer oyunculara saldırı, yağma ve casusluk (Gözcü).',
          ]} />
        )}
        {tab === 'reports' && <ReportsTab refresh={refresh} />}
        {tab === 'account' && <AccountTab state={state} onLegal={setLegal} onSignedOut={onSignedOut} />}
        {tab === 'fighters' && state.account.mainClass === null && (
          <Card><Text style={ui.muted}>Ana sınıfın henüz belirlenmedi.</Text></Card>
        )}
      </ScrollView>
    </View>
  );
}
