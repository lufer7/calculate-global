import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { game } from '@arena/core';
import { Banner, SYMBOL_NAMES } from '../../art/Banner';
import { Portrait } from '../../art/Portrait';
import { Scene } from '../../art/Scene';
import { Bar, Button, Card, Checkbox, ErrorText, Field, Gold, Pill, SectionTitle, Sheet } from '../../components/ui';
import { formatDuration, tr } from '../../i18n/tr';
import type { ClanCard, ClanDetail, ClanRole, GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const ROLE: Record<ClanRole, string> = { leader: 'Sancaktar', officer: 'Subay', member: 'Er' };
type Section = 'raid' | 'help' | 'members' | 'treasury' | 'log';
const SECTIONS: [Section, string][] = [['raid', 'Av'], ['help', 'Yardım'], ['members', 'Üyeler'], ['treasury', 'Hazine'], ['log', 'Kayıt']];

/** Sancak: clans without chat — create/join, boss raids, helping each other, a shared treasury. */
export function ClanTab({ state, now, refresh }: { state: GameState; now: number; refresh: () => Promise<void> }) {
  const [detail, setDetail] = useState<ClanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await api.clan());
      setError(null);
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, state.clan?.id]);

  const reload = async () => {
    await Promise.all([load(), refresh()]);
  };

  if (!detail) return error ? <ErrorText message={error} /> : <ActivityIndicator color={colors.trim} />;
  if (!detail.clan) return <NoClan state={state} now={now} onJoined={reload} />;
  return <MyClan state={state} now={now} d={detail} reload={reload} />;
}

// ------------------------------------------------------------------ not in a clan

function NoClan({ state, now, onJoined }: { state: GameState; now: number; onJoined: () => Promise<void> }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<(ClanCard & { requested: boolean })[] | null>(null);
  const [cost, setCost] = useState(500);
  const [blocked, setBlocked] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    try {
      const r = await api.clans(query);
      setList(r.clans);
      setCost(r.createCost);
      setBlocked(r.joinBlockedUntil);
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await search(q);
      await onJoined();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Scene name="camp" height={110}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>Sancak</Text>
          <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Diğer çetelerle aynı sancak altında birleş</Text>
        </View>
      </Scene>
      <Card trim>
        <Text style={ui.text}>Bir sancak altında:</Text>
        {['Birlikte dev canavarlara saldırır, ganimeti hasara göre paylaşırsınız.', 'Birbirinizin araştırma, sefer ve keşiflerini hızlandırırsınız (her yardım kalan sürenin %5\'i).', 'Hazineye bağışla sancak seviye atlar: daha çok üye, seferlerde ve keşiflerde daha çok altın.', 'Aynı sancaktakiler arenada birbirine saldırmaz.'].map((l) => <Text key={l} style={ui.muted}>• {l}</Text>)}
        <Text style={[ui.muted, { fontSize: 12 }]}>Oyunda sohbet yoktur; sancak üyeleri oyun içi eylemlerle birlikte oynar.</Text>
      </Card>
      {blocked && blocked > now && <Text style={{ color: colors.warn }}>Sancaktan yeni ayrıldın. Yeni bir sancağa {formatDuration(blocked - now)} sonra katılabilirsin.</Text>}
      <Button title={`Kendi sancağını kur (${cost} altın)`} kind={creating ? 'ghost' : 'primary'} onPress={() => setCreating(!creating)} />
      {creating && <CreateClan cost={cost} gold={state.account.gold} onCreated={async () => { setCreating(false); await onJoined(); }} />}
      <SectionTitle>Sancak ara</SectionTitle>
      <TextInput value={q} onChangeText={setQ} placeholder="Ad ya da kısaltma" placeholderTextColor={colors.faint} style={ui.input} autoCorrect={false} />
      <ErrorText message={error} />
      {!list ? <ActivityIndicator color={colors.trim} /> : list.length === 0 ? <Text style={ui.muted}>Sancak bulunamadı. İlk sancağı sen kur!</Text> : list.map((c) => (
        <Card key={c.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Banner color={c.color} symbol={c.symbol} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>{c.name} <Text style={{ color: colors.trim }}>[{c.tag}]</Text></Text>
            <Text style={ui.muted}>Seviye {c.level} · {c.members}/{c.maxMembers} üye · {c.policy === 'open' ? 'Herkese açık' : 'Başvuru ile'}</Text>
          </View>
          {c.requested ? (
            <Button title="Başvuruyu geri al" kind="ghost" small busy={busy === c.id} onPress={() => act(c.id, () => api.cancelClanRequest(c.id))} />
          ) : (
            <Button title={c.policy === 'open' ? 'Katıl' : 'Başvur'} small disabled={c.members >= c.maxMembers || (!!blocked && blocked > now)} busy={busy === c.id} onPress={() => act(c.id, () => api.joinClan(c.id))} />
          )}
        </Card>
      ))}
    </View>
  );
}

function EmblemPicker({ color, symbol, onColor, onSymbol }: { color: number; symbol: number; onColor: (c: number) => void; onSymbol: (s: number) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {game.EMBLEM_COLORS.map((c, i) => (
          <Pressable key={c} onPress={() => onColor(i)} accessibilityLabel={`Renk ${i + 1}`} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: 2, borderColor: i === color ? '#fff' : '#00000060' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {game.EMBLEM_SYMBOLS.map((s, i) => (
          <Pressable key={s} onPress={() => onSymbol(i)} accessibilityLabel={SYMBOL_NAMES[s]} style={{ alignItems: 'center', padding: 2, borderRadius: 6, borderWidth: 1, borderColor: i === symbol ? colors.trim : 'transparent' }}>
            <Banner color={color} symbol={i} size={28} />
            <Text style={{ color: colors.muted, fontSize: 9 }}>{SYMBOL_NAMES[s]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CreateClan({ cost, gold, onCreated }: { cost: number; gold: number; onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [color, setColor] = useState(0);
  const [symbol, setSymbol] = useState(0);
  const [requestOnly, setRequestOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card trim>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Banner color={color} symbol={symbol} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={ui.h2}>{name.trim() || 'Sancak adı'}</Text>
          <Text style={{ color: colors.trim, fontWeight: '800' }}>[{tag || 'KSA'}]</Text>
        </View>
      </View>
      <Field label="Sancak adı (3-20 karakter)" value={name} onChangeText={setName} maxLength={20} />
      <Field label="Kısaltma (2-4 harf)" value={tag} onChangeText={(t) => setTag(t.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ]/g, '').slice(0, 4))} autoCapitalize="characters" />
      <Text style={ui.label}>Sancak</Text>
      <EmblemPicker color={color} symbol={symbol} onColor={setColor} onSymbol={setSymbol} />
      <Checkbox checked={requestOnly} onChange={setRequestOnly}><Text style={ui.text}>Katılım başvuru ile olsun (sen ya da subaylar onaylar)</Text></Checkbox>
      <Text style={[ui.muted, { fontSize: 12 }]}>Ad ve kısaltma herkese görünür. Hakaret, nefret söylemi, siyasi/ideolojik ya da başkasını taklit eden adlar yasaktır; uygunsuz adlar yönetim tarafından değiştirilir.</Text>
      <ErrorText message={error} />
      <Button title={`Sancağı dik (${cost} altın)`} disabled={gold < cost || name.trim().length < 3 || tag.length < 2} busy={busy} onPress={async () => {
        setBusy(true);
        setError(null);
        try {
          await api.createClan({ name, tag, color, symbol, policy: requestOnly ? 'request' : 'open' });
          await onCreated();
        } catch (e) {
          setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
        } finally {
          setBusy(false);
        }
      }} />
    </Card>
  );
}

// ------------------------------------------------------------------ my clan

function MyClan({ state, now, d, reload }: { state: GameState; now: number; d: ClanDetail; reload: () => Promise<void> }) {
  const [section, setSection] = useState<Section>('raid');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [member, setMember] = useState<NonNullable<ClanDetail['members']>[number] | null>(null);
  const [settings, setSettings] = useState(false);
  const c = d.clan!;
  const me = d.me!;
  const manage = me.role !== 'member';
  const pendingHelps = (d.helps ?? []).filter((h) => !h.helped && h.helps < (d.rules?.maxHelps ?? 10));

  const act = async (key: string, fn: () => Promise<unknown>, ok?: (r: unknown) => string | null) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const r = await fn();
      setNotice(ok?.(r) ?? null);
      await reload();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  const levelRatio = c.nextLevelXp ? (c.xp - c.levelXp) / (c.nextLevelXp - c.levelXp) : 1;

  return (
    <View style={{ gap: 12 }}>
      <Card trim style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Banner color={c.color} symbol={c.symbol} size={58} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={ui.h2}>{c.name} <Text style={{ color: colors.trim }}>[{c.tag}]</Text></Text>
          <Text style={ui.muted}>Seviye {c.level} · {c.members}/{c.maxMembers} üye · {ROLE[me.role]}</Text>
          <Bar ratio={levelRatio} color={colors.trim} label={c.nextLevelXp ? `Şan ${c.xp} / ${c.nextLevelXp}` : `Şan ${c.xp} · en yüksek seviye`} />
          <Text style={{ color: colors.good, fontSize: 12 }}>Sancak avantajı: seferlerde ve keşiflerde +%{Math.round(c.goldBonus * 100)} altın</Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {SECTIONS.map(([id, label]) => {
          const on = section === id;
          const badge = id === 'help' ? pendingHelps.length : id === 'members' ? d.requests?.length ?? 0 : 0;
          return (
            <Pressable key={id} onPress={() => setSection(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: on ? '#c9a55c26' : colors.panel }}>
              <Text style={{ color: on ? colors.text : colors.muted, fontWeight: '800', fontSize: 12 }}>{label}{badge > 0 ? ` (${badge})` : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText message={error} />
      {notice && <Text style={{ color: colors.good, fontWeight: '700' }}>{notice}</Text>}

      {section === 'raid' && <RaidSection state={state} now={now} d={d} manage={manage} busy={busy} act={act} />}

      {section === 'help' && (
        <View style={{ gap: 10 }}>
          <Card>
            <Text style={ui.muted}>Sancak arkadaşlarının süren işlerine yardım et: her yardım kalan sürenin %{Math.round((d.rules?.helpCut ?? 0.05) * 100)}'ini keser (bir işe en fazla {d.rules?.maxHelps ?? 10} yardım). Her yardım sancağa şan kazandırır.</Text>
            <Button title={pendingHelps.length ? `Hepsine yardım et (${pendingHelps.length})` : 'Şu an yardım bekleyen yok'} disabled={!pendingHelps.length} busy={busy === 'help-all'}
              onPress={() => act('help-all', () => api.clanHelp({ all: true }), (r) => `${(r as { helped: number }).helped} işe yardım ettin.`)} />
          </Card>
          {(d.helps ?? []).map((h) => (
            <Card key={`${h.kind}:${h.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: h.helped ? 0.6 : 1 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ui.text, { fontWeight: '700' }]}>{h.owner}</Text>
                <Text style={ui.muted}>{h.kind === 'research' ? 'Rasathane' : h.kind === 'expedition' ? 'Sefer' : 'Keşif'} · {h.label} · {formatDuration(h.endsAt - now)}</Text>
                <Text style={{ color: colors.faint, fontSize: 11 }}>{h.helps} / {d.rules?.maxHelps ?? 10} yardım</Text>
              </View>
              <Button title={h.helped ? 'Yardım edildi' : 'Yardım et'} small disabled={h.helped || h.helps >= (d.rules?.maxHelps ?? 10)} busy={busy === h.id}
                onPress={() => act(h.id, () => api.clanHelp({ kind: h.kind, id: h.id }), () => `${h.owner} adlı arkadaşına yardım ettin.`)} />
            </Card>
          ))}
        </View>
      )}

      {section === 'members' && (
        <View style={{ gap: 8 }}>
          {manage && (d.requests ?? []).length > 0 && <SectionTitle>Başvurular</SectionTitle>}
          {manage && (d.requests ?? []).map((r) => (
            <Card key={r.accountId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700' }]}>{r.name}</Text>
                <Text style={ui.muted}>En güçlü dövüşçü Sv {r.topLevel}</Text>
              </View>
              <Button title="Kabul" small busy={busy === `a${r.accountId}`} onPress={() => act(`a${r.accountId}`, () => api.clanRequest(r.accountId, true))} />
              <Button title="Ret" small kind="ghost" busy={busy === `r${r.accountId}`} onPress={() => act(`r${r.accountId}`, () => api.clanRequest(r.accountId, false))} />
            </Card>
          ))}
          <SectionTitle>Üyeler</SectionTitle>
          {(d.members ?? []).map((m) => (
            <Pressable key={m.accountId} onPress={() => setMember(m)} accessibilityRole="button">
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, ...(m.me ? { borderColor: colors.trimDim } : {}) }}>
                {m.top ? <Portrait cls={m.top.class} size={40} /> : <View style={{ width: 40 }} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ui.text, { fontWeight: '800' }]}>{m.name}{m.me ? ' (sen)' : ''}</Text>
                  <Text style={ui.muted}>{m.top ? `${m.top.name} · Sv ${m.top.level}` : '—'} · {m.fighters} dövüşçü</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Pill text={ROLE[m.role]} color={m.role === 'leader' ? colors.trim : m.role === 'officer' ? colors.xp : colors.muted} />
                  <Text style={{ color: colors.faint, fontSize: 11 }}>Katkı {m.contribution}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
          {me.role === 'leader' && <Button title="Sancak ayarları" kind="ghost" onPress={() => setSettings(true)} />}
          <Button title="Sancaktan ayrıl" kind="danger" busy={busy === 'leave'} onPress={() => act('leave', () => api.leaveClan())} />
        </View>
      )}

      {section === 'treasury' && (
        <Card trim>
          <Text style={ui.text}>Hazineye bağış</Text>
          <Text style={ui.muted}>Her {d.rules?.donationGoldPerXp ?? 10} altın sancağa 1 şan kazandırır. Şan seviyeyi yükseltir: her seviye +%1 sefer/keşif altını, +2 üye yeri ve daha güçlü av canavarları.</Text>
          <View style={ui.row}><Text style={ui.muted}>Altının:</Text><Gold amount={state.account.gold} size={13} /></View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[100, 500, 1000, 5000].map((g) => (
              <Button key={g} title={`${g} bağışla`} small disabled={state.account.gold < g} busy={busy === `d${g}`} style={{ flexGrow: 1 }}
                onPress={() => act(`d${g}`, () => api.donate(g), (r) => `Sancağa +${(r as { xp: number }).xp} şan kazandırdın.`)} />
            ))}
          </View>
          <Text style={ui.muted}>Senin katkın: {me.contribution}</Text>
        </Card>
      )}

      {section === 'log' && (
        <Card>
          {(d.log ?? []).length === 0 ? <Text style={ui.muted}>Henüz kayıt yok.</Text> : (d.log ?? []).map((l, i) => (
            <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i === d.log!.length - 1 ? 0 : 1, borderColor: colors.border }}>
              <Text style={ui.text}>{l.text}</Text>
              <Text style={{ color: colors.faint, fontSize: 11 }}>{new Date(l.at).toLocaleString('tr-TR')}</Text>
            </View>
          ))}
        </Card>
      )}

      <Sheet visible={!!member} onClose={() => setMember(null)} title={member?.name}>
        {member && (
          <View style={{ gap: 10 }}>
            <Text style={ui.muted}>{ROLE[member.role]} · katkı {member.contribution} · katılış {new Date(member.joinedAt).toLocaleDateString('tr-TR')}</Text>
            {member.top && <Text style={ui.text}>En güçlü dövüşçü: {member.top.name} ({tr.classes[member.top.class].name}, Sv {member.top.level})</Text>}
            {!member.me && me.role === 'leader' && member.role === 'member' && <Button title="Subay yap" kind="ghost" onPress={() => { setMember(null); void act('p', () => api.clanMember(member.accountId, 'promote')); }} />}
            {!member.me && me.role === 'leader' && member.role === 'officer' && <Button title="Er yap" kind="ghost" onPress={() => { setMember(null); void act('p', () => api.clanMember(member.accountId, 'demote')); }} />}
            {!member.me && me.role === 'leader' && <Button title="Sancağı devret" kind="ghost" onPress={() => { setMember(null); void act('t', () => api.clanMember(member.accountId, 'transfer')); }} />}
            {!member.me && manage && member.role !== 'leader' && !(me.role === 'officer' && member.role === 'officer') && (
              <Button title="Sancaktan çıkar" kind="danger" onPress={() => { setMember(null); void act('k', () => api.clanMember(member.accountId, 'kick')); }} />
            )}
          </View>
        )}
      </Sheet>
      {settings && <SettingsSheet c={c} onClose={() => setSettings(false)} onSaved={reload} />}
    </View>
  );
}

function SettingsSheet({ c, onClose, onSaved }: { c: ClanCard; onClose: () => void; onSaved: () => Promise<void> }) {
  const [color, setColor] = useState(c.color);
  const [symbol, setSymbol] = useState(c.symbol);
  const [requestOnly, setRequestOnly] = useState(c.policy === 'request');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible onClose={onClose} title="Sancak ayarları">
      <View style={{ alignItems: 'center' }}><Banner color={color} symbol={symbol} size={64} /></View>
      <EmblemPicker color={color} symbol={symbol} onColor={setColor} onSymbol={setSymbol} />
      <Checkbox checked={requestOnly} onChange={setRequestOnly}><Text style={ui.text}>Katılım başvuru ile olsun</Text></Checkbox>
      <Button title="Kaydet" busy={busy} onPress={async () => {
        setBusy(true);
        try {
          await api.clanSettings({ color, symbol, policy: requestOnly ? 'request' : 'open' });
          await onSaved();
          onClose();
        } finally {
          setBusy(false);
        }
      }} />
    </Sheet>
  );
}

function RaidSection({ state, now, d, manage, busy, act }: {
  state: GameState; now: number; d: ClanDetail; manage: boolean; busy: string | null;
  act: (key: string, fn: () => Promise<unknown>, ok?: (r: unknown) => string | null) => Promise<void>;
}) {
  const raid = d.raid;
  const active = raid?.state === 'active' && raid.endsAt > now;
  const boss = raid ? game.RAID_BOSSES_BY_ID.get(raid.bossId) : undefined;
  const ready = new Map((d.myFighters ?? []).map((f) => [f.id, f.raidReadyAt]));
  return (
    <View style={{ gap: 10 }}>
      {active && raid && boss ? (
        <>
          <Scene name={boss.level < 20 ? 'dark_forest' : boss.level < 35 ? 'misty_marsh' : boss.level < 55 ? 'abandoned_mines' : 'lost_lands'} height={120}>
            <View style={{ flex: 1, justifyContent: 'flex-end', padding: 10, gap: 4 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 }}>☠ {boss.name}</Text>
              <Bar ratio={raid.hp / raid.maxHp} color={colors.hp} label={`${raid.hp.toLocaleString('tr-TR')} / ${raid.maxHp.toLocaleString('tr-TR')}`} />
              <Text style={{ color: '#f2e6cc', fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 }}>Kaçmasına {formatDuration(raid.endsAt - now)} · Sv {boss.level}</Text>
            </View>
          </Scene>
          <Text style={ui.muted}>Her dövüşçün saatte bir saldırabilir (canı en az %{Math.round((d.rules?.raidMinHp ?? 0.15) * 100)} olmalı). Canavar düşünce ganimet, verilen hasara göre herkese paylaşılır.</Text>
          {state.fighters.map((f) => {
            const until = ready.get(f.id) ?? null;
            const cooling = until !== null && until > now;
            const weak = f.hpRatio < (d.rules?.raidMinHp ?? 0.15);
            return (
              <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Portrait cls={f.class} size={40} hpRatio={f.hpRatio} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>{f.name} <Text style={ui.muted}>Sv {f.level}</Text></Text>
                  <Bar ratio={f.hpRatio} color={colors.hp} height={5} />
                </View>
                <Button title={f.status !== 'idle' ? tr.status[f.status] ?? 'Meşgul' : cooling ? formatDuration(until! - now) : weak ? 'Canı az' : 'Saldır'} small
                  disabled={f.status !== 'idle' || cooling || weak} busy={busy === `hit${f.id}`}
                  onPress={() => act(`hit${f.id}`, () => api.raidAttack(f.id), (r) => {
                    const x = r as { damage: number; won: boolean };
                    return x.won ? `${f.name} son darbeyi vurdu: ${boss.name} yenildi! Ganimet raporlarda.` : `${f.name} ${x.damage.toLocaleString('tr-TR')} hasar verdi.`;
                  })} />
              </Card>
            );
          })}
          {raid.hits.length > 0 && <SectionTitle>Hasar sıralaması</SectionTitle>}
          {raid.hits.map((h, i) => (
            <View key={i} style={[ui.between, { paddingVertical: 4 }]}>
              <Text style={[ui.text, h.me && { color: colors.trim, fontWeight: '800' }]}>{i + 1}. {h.name}</Text>
              <Text style={[ui.muted, ui.num]}>{h.damage.toLocaleString('tr-TR')} · {h.hits} saldırı</Text>
            </View>
          ))}
        </>
      ) : (
        <>
          {raid && raid.state !== 'active' && boss && (
            <Card><Text style={ui.text}>Son av: {boss.name} — {raid.state === 'won' ? 'yenildi ✓' : 'kaçtı ✗'}</Text></Card>
          )}
          <Text style={ui.muted}>{manage ? 'Bir canavar seç ve avı başlat. Sancağın 24 saat içinde onu yere sermeli.' : 'Av başlatmak sancaktar ve subayların işi. Av başladığında burada saldırabilirsin.'}</Text>
          {(d.bosses ?? []).map((b) => (
            <Card key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: b.unlocked ? 1 : 0.55 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ui.text, { fontWeight: '800' }]}>☠ {b.name}</Text>
                <Text style={ui.muted}>Sv {b.level} · {b.hp.toLocaleString('tr-TR')} can · {b.unlocked ? 'açık' : `sancak seviyesi ${b.clanLevel} gerekir`}</Text>
                <View style={ui.row}><Text style={ui.muted}>Ganimet:</Text><Gold amount={b.gold} size={12} /><Text style={ui.muted}>+ nadir eşya şansı</Text></View>
              </View>
              {manage && <Button title="Avı başlat" small disabled={!b.unlocked} busy={busy === b.id} onPress={() => act(b.id, () => api.startRaid(b.id), () => `${b.name} avı başladı!`)} />}
            </Card>
          ))}
        </>
      )}
    </View>
  );
}
