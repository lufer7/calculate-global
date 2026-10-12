import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ItemIcon } from '../../art/ItemIcon';
import { Portrait } from '../../art/Portrait';
import { ResourceSources } from '../../components/ItemSheet';
import { Button, Card, ErrorText, Gold, SectionTitle, Sheet } from '../../components/ui';
import { tr } from '../../i18n/tr';
import type { AlchemyInfo, GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const RES_NAMES: Record<string, string> = { leather: 'Deri', bone: 'Kemik', game_meat: 'Av Eti' };

/** Aktar: Seers brew potions from the hunters' resources. */
export function AlchemyTab({ state, refresh }: { state: GameState; refresh: () => Promise<void> }) {
  const [info, setInfo] = useState<AlchemyInfo | null>(null);
  const [seerId, setSeerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await api.alchemy();
      setInfo(a);
      setSeerId((cur) => cur ?? a.seers[0]?.id ?? null);
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!info) return <ErrorText message={error} />;
  const seer = info.seers.find((s) => s.id === seerId);

  return (
    <View style={{ gap: 12 }}>
      <Card trim>
        <Text style={ui.h2}>Aktar</Text>
        <Text style={ui.muted}>Müneccimler, Gözcülerin avladığı deri, kemik ve etten iksir kaynatır. İksir Yapımı rütbesi yükseldikçe yeni tarifler açılır.</Text>
      </Card>
      <SectionTitle>Malzemeler</SectionTitle>
      <View style={[ui.row, { justifyContent: 'space-around' }]}>
        {Object.entries(info.resources).map(([id, qty]) => (
          <Pressable key={id} onPress={() => setSource(id)} accessibilityRole="button" accessibilityLabel={`${RES_NAMES[id]}: nereden bulunur?`} style={{ alignItems: 'center', gap: 3 }}>
            <ItemIcon icon={id} size={48} qty={qty} />
            <Text style={ui.muted}>{RES_NAMES[id]} · {qty}</Text>
            <Text style={{ color: colors.trim, fontSize: 11 }}>ⓘ Nereden?</Text>
          </Pressable>
        ))}
      </View>
      <Sheet visible={!!source} onClose={() => setSource(null)} title={source ? RES_NAMES[source] : ''}>
        {source && (
          <View style={{ gap: 10 }}>
            <View style={ui.row}>
              <ItemIcon icon={source} size={56} qty={info.resources[source]} />
              <Text style={[ui.text, { flex: 1 }]}>Elinde {info.resources[source] ?? 0} adet var. Müneccimler bunu iksir kaynatmak için kullanır.</Text>
            </View>
            <ResourceSources templateId={source} />
          </View>
        )}
      </Sheet>
      {info.seers.length === 0 ? (
        <Card><Text style={ui.muted}>Çetende Müneccim yok. Bir Müneccim katılınca iksir kaynatabilirsin.</Text></Card>
      ) : (
        <>
          <SectionTitle>Kazanın başında</SectionTitle>
          <View style={ui.row}>
            {info.seers.map((s) => (
              <Pressable key={s.id} onPress={() => setSeerId(s.id)} style={{ alignItems: 'center', opacity: s.id === seerId ? 1 : 0.5 }}>
                <Portrait cls="seer" size={44} />
                <Text style={{ color: colors.text, fontSize: 11 }}>{s.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 10 }}>İksir Yapımı {s.rank}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <SectionTitle>Tarifler</SectionTitle>
      {info.recipes.map((r) => {
        const locked = !seer || seer.rank < r.minRank;
        const missing = Object.entries(r.inputs).some(([id, q]) => (info.resources[id] ?? 0) < q);
        return (
          <Card key={r.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', opacity: locked ? 0.55 : 1 }}>
            <ItemIcon icon={r.icon} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[ui.text, { fontWeight: '800' }]}>{r.outputName}</Text>
              <Text style={ui.muted}>{Object.entries(r.inputs).map(([id, q]) => `${q} ${RES_NAMES[id]}`).join(' · ')}</Text>
              <View style={ui.row}><Gold amount={r.gold} size={12} /><Text style={ui.muted}>· Rütbe {r.minRank}+</Text></View>
            </View>
            <Button title="Kaynat" small disabled={locked || missing || state.account.gold < r.gold} busy={busy === r.id} onPress={async () => {
              setBusy(r.id);
              setError(null);
              setMessage(null);
              try {
                const res = await api.craft(seer!.id, r.id);
                setMessage(res.qty > 1 ? `Usta işi! 2 adet ${r.outputName} çıktı.` : `${r.outputName} hazır, çantada.`);
                await Promise.all([refresh(), load()]);
              } catch (e) {
                setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
              } finally {
                setBusy(null);
              }
            }} />
          </Card>
        );
      })}
      {message && <Text style={{ color: colors.good }}>{message}</Text>}
      <ErrorText message={error} />
    </View>
  );
}
