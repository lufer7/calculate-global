import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { game } from '@arena/core';
import { ItemIcon } from '../../art/ItemIcon';
import { NavIcon } from '../../art/NavIcon';
import { Card, ErrorText, Gold, Pill, Sheet } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { Report } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

interface FighterResult { id: string; name: string; xp: number; levelsGained: number; newLevel: number; injuredUntil: number | null }
interface LootItem { name: string; rarity: game.Rarity; icon: string; qty: number; kept: boolean }

const ICON: Record<string, string> = { expedition: 'map', expedition_recalled: 'map', exploration: 'compass', exploration_recalled: 'compass', raid: 'banner', research: 'telescope', alchemy: 'mortar' };
const KIND_NAME: Record<string, string> = { expedition: 'Sefer', expedition_recalled: 'Sefer', exploration: 'Keşif', exploration_recalled: 'Keşif', raid: 'Sancak avı', research: 'Rasathane', alchemy: 'Aktar' };

/** Inbox: compact rows; tapping one opens the full report (loot, gold, XP, injuries). */
export function ReportsTab({ refresh }: { refresh: () => Promise<void> }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [open, setOpen] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.reports()
      .then(async (r) => {
        setReports(r.reports);
        if (r.reports.some((x) => !x.read)) {
          await api.markReportsRead();
          await refresh();
        }
      })
      .catch((e) => setError(tr.error(e instanceof ApiError ? e.code : 'unknown')));
  }, [refresh]);

  if (error) return <ErrorText message={error} />;
  if (!reports) return <ActivityIndicator color={colors.accent} />;
  if (reports.length === 0) return <Card><Text style={ui.muted}>Henüz rapor yok. Bir sefer ya da keşif gönder; döndüğünde raporu burada okursun.</Text></Card>;

  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.muted}>Ayrıntıları görmek için bir rapora dokun.</Text>
      {reports.map((r) => {
        const gold = summaryGold(r);
        const items = lootOf(r);
        return (
          <Pressable key={r.id} onPress={() => setOpen(r)} accessibilityRole="button" accessibilityLabel={r.title}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.8 : 1, ...(!r.read ? { borderColor: colors.accent } : {}) }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.inset, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.trimDim }}>
                  <NavIcon name={ICON[r.kind] ?? 'scroll'} color={colors.trim} size={22} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[ui.text, { fontWeight: '800' }]} numberOfLines={2}>{r.title}</Text>
                  <View style={[ui.row, { flexWrap: 'wrap' }]}>
                    <Text style={[ui.muted, { fontSize: 12 }]}>{KIND_NAME[r.kind] ?? 'Rapor'} · {new Date(r.at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    {gold > 0 && <Gold amount={gold} size={12} />}
                    {items.length > 0 && <Text style={{ color: colors.muted, fontSize: 12 }}>· {items.length} eşya</Text>}
                  </View>
                </View>
                {!r.read && <Pill text="Yeni" color={colors.accent} />}
                <Text style={{ color: colors.trim, fontSize: 20 }}>›</Text>
              </Card>
            )}
          </Pressable>
        );
      })}
      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open ? KIND_NAME[open.kind] ?? 'Rapor' : ''}>
        {open && <ReportDetail r={open} />}
      </Sheet>
    </View>
  );
}

function summaryGold(r: Report): number {
  return Number(r.body.gold ?? 0) || 0;
}

function lootOf(r: Report): LootItem[] {
  if (Array.isArray(r.body.items)) return r.body.items as LootItem[];
  if (Array.isArray(r.body.finds)) return (r.body.finds as { items: LootItem[] }[]).flatMap((f) => f.items);
  return [];
}

export function ReportDetail({ r }: { r: Report }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={ui.h2}>{r.title}</Text>
      <Text style={ui.muted}>{new Date(r.at).toLocaleString('tr-TR')}</Text>
      {r.kind === 'expedition' && <ExpeditionBody body={r.body} at={r.at} />}
      {r.kind === 'exploration' && <ExplorationBody body={r.body} at={r.at} />}
      {r.kind === 'raid' && <RaidBody body={r.body} />}
      {r.kind === 'research' && <Text style={ui.text}>{game.RESEARCH[String(r.body.researchId)]?.name ?? 'Araştırma'} artık seviye {Number(r.body.level)}. {game.RESEARCH[String(r.body.researchId)]?.description ?? ''}</Text>}
      {r.kind === 'expedition_recalled' && <Text style={ui.text}>Sefer geri çağrıldı; dövüşçüler eli boş döndü ama yaralanmadılar.</Text>}
      {r.kind === 'exploration_recalled' && <Text style={ui.text}>Keşif yarıda bırakıldı; dövüşçüler eli boş döndü.</Text>}
    </View>
  );
}

function Loot({ items }: { items: LootItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it, i) => (
        <View key={i} style={{ alignItems: 'center', width: 72, gap: 2 }}>
          <ItemIcon icon={it.icon} rarity={it.rarity} size={46} qty={it.qty} dim={!it.kept} />
          <Text style={{ color: game.RARITY_INFO[it.rarity].color, fontSize: 10, textAlign: 'center' }} numberOfLines={2}>{it.kept ? it.name : 'Çanta doluydu'}</Text>
        </View>
      ))}
    </View>
  );
}

function Fighters({ list, at }: { list: FighterResult[]; at: number }) {
  return (
    <View style={{ gap: 2 }}>
      {list.map((f) => (
        <Text key={f.id} style={ui.muted}>
          {f.name}: +{f.xp} deneyim{f.levelsGained > 0 ? ` · Seviye ${f.newLevel}!` : ''}{f.injuredUntil ? ` · Yaralandı (${formatDuration(f.injuredUntil - at)})` : ''}
        </Text>
      ))}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={[ui.between, { backgroundColor: colors.inset, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 }]}>
      <Text style={ui.muted}>{label}</Text>
      {children}
    </View>
  );
}

function ExpeditionBody({ body, at }: { body: Record<string, unknown>; at: number }) {
  const fighters = (body.fighters ?? []) as FighterResult[];
  const reward = String(body.reward);
  return (
    <View style={{ gap: 8 }}>
      {typeof body.success === 'boolean' && (
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Text style={{ fontWeight: '900', color: body.success ? colors.good : colors.danger }}>{body.success ? '✓ Bölüm geçildi' : '✗ Bölüm geçilemedi'}</Text>
          <Text style={ui.muted}>(şans %{Number(body.chance)})</Text>
          {body.firstBossClear === true && <Text style={{ color: colors.trim, fontWeight: '800' }}>☠ Patron ilk kez yenildi!</Text>}
        </View>
      )}
      {body.success === false && <Text style={ui.muted}>Ekip geri çekildi; yalnızca az bir altın ve deneyim getirdi. Daha güçlü bir ekip ya da daha iyi eşyalarla tekrar dene.</Text>}
      <Text style={ui.text}>{tr.events[String(body.event)] ?? ''}</Text>
      <Row label="Altın"><View style={ui.row}><Gold amount={Number(body.gold)} size={14} />{Number(body.rewardMultiplier) > 1 && <Text style={ui.muted}>(kehanet ×{Number(body.rewardMultiplier).toFixed(2)})</Text>}</View></Row>
      <Row label="Ganimet kademesi">
        <Text style={{ fontWeight: '700', color: reward === 'nothing' ? colors.muted : colors.accent }}>{tr.tiers[reward] ?? '—'}{body.extraReward ? ` + ${tr.tiers[String(body.extraReward)]}` : ''}</Text>
      </Row>
      <Loot items={(body.items ?? []) as LootItem[]} />
      <Fighters list={fighters} at={at} />
    </View>
  );
}

const FIND_NAME: Record<string, string> = { equipment: 'Eşya', cache: 'Altın zulası', potions: 'İksirler', supplies: 'Erzak', nothing: 'Boş çıktı' };

function ExplorationBody({ body, at }: { body: Record<string, unknown>; at: number }) {
  const finds = (body.finds ?? []) as { kind: string; gold: number; items: LootItem[] }[];
  return (
    <View style={{ gap: 8 }}>
      <Row label="Yol (gidiş + dönüş)"><Text style={ui.text}>{formatDuration(Number(body.travelMs) * 2)}</Text></Row>
      <Row label="Keşifte geçen süre"><Text style={ui.text}>{Number(body.exploreMs) > 0 ? formatDuration(Number(body.exploreMs)) : "hemen döndü"}</Text></Row>
      <Row label="Toplam altın"><Gold amount={Number(body.gold)} size={14} /></Row>
      <Text style={[ui.label, { fontSize: 11 }]}>Buluntular ({finds.length})</Text>
      {finds.map((f, i) => (
        <View key={i} style={{ gap: 6, borderLeftWidth: 2, borderColor: colors.trimDim, paddingLeft: 8 }}>
          <View style={ui.row}>
            <Text style={[ui.text, { fontWeight: '700' }]}>{i + 1}. {FIND_NAME[f.kind] ?? f.kind}</Text>
            {f.gold > 0 && <Gold amount={f.gold} size={12} />}
          </View>
          <Loot items={f.items} />
        </View>
      ))}
      <Fighters list={(body.fighters ?? []) as FighterResult[]} at={at} />
    </View>
  );
}

function RaidBody({ body }: { body: Record<string, unknown> }) {
  if (body.won !== true) return <Text style={ui.text}>Canavar süre dolmadan yenilemedi ve kaçtı. Kalan can: {Number(body.hp).toLocaleString('tr-TR')} / {Number(body.maxHp).toLocaleString('tr-TR')}.</Text>;
  return (
    <View style={{ gap: 8 }}>
      <Row label="Verdiğin hasar"><Text style={[ui.text, ui.num]}>{Number(body.damage).toLocaleString('tr-TR')} (%{Number(body.share)})</Text></Row>
      <Row label="Sıralama"><Text style={ui.text}>{Number(body.rank)}. / {Number(body.participants)} kişi</Text></Row>
      <Row label="Altın payın"><Gold amount={Number(body.gold)} size={14} /></Row>
      <Loot items={(body.items ?? []) as LootItem[]} />
    </View>
  );
}
