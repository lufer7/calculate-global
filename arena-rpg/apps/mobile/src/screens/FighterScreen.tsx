import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { game } from '@arena/core';
import { ItemIcon } from '../art/ItemIcon';
import { Portrait } from '../art/Portrait';
import { Bar, Button, Card, EnergyBar, ErrorText, Pill, SectionTitle } from '../components/ui';
import { tr } from '../i18n/tr';
import type { FighterView } from '../lib/api';
import { ApiError, api } from '../lib/api';
import { classColor, colors, ui } from './theme';

const TIER_NAMES = ['', 'Kademe 1', 'Kademe 2', 'Kademe 3', 'Ustalık'];

/** Skill tree: 3 branches, tiers unlock by points spent in that branch. All rules are re-checked by the server. */
export function FighterScreen({ fighter, onBack, onChanged, onInventory }: { fighter: FighterView; onBack: () => void; onChanged: () => Promise<void>; onInventory: () => void }) {
  const branches = game.BRANCH_IDS[fighter.class];
  const [branch, setBranch] = useState<game.BranchId>(branches[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRespec, setConfirmRespec] = useState(false);
  const skills = fighter.skills;
  const spentInBranch = game.pointsSpentInBranch(skills, branch);
  const role = (Object.entries(game.CLASSES[fighter.class].branches).find(([, b]) => b === branch)?.[0] ?? '') as string;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Button title="‹ Çete" kind="ghost" small onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Card trim style={{ flexDirection: 'row', gap: 12 }}>
        <Portrait cls={fighter.class} size={86} hpRatio={fighter.hpRatio} injured={fighter.status === 'injured'} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={ui.between}>
            <Text style={[ui.title, { fontSize: 21, flex: 1 }]} numberOfLines={1}>{fighter.name}</Text>
            <Pill text={tr.classes[fighter.class].name} color={classColor(fighter.class)} />
          </View>
          <Text style={ui.muted}>Seviye {fighter.level} · Güç {fighter.power}</Text>
          <Bar ratio={fighter.hpRatio} color={colors.hp} label={`Can ${Math.round(fighter.profile.maxHp * fighter.hpRatio)}/${fighter.profile.maxHp}`} />
          <EnergyBar energy={fighter.energy} />
          <Bar ratio={fighter.xp / fighter.xpToNext} color={colors.xp} label={`Deneyim ${fighter.xp}/${fighter.xpToNext}`} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[['Hasar', `${fighter.profile.damageMin}–${fighter.profile.damageMax}`], ['Zırh', String(fighter.profile.armor)], ['Kritik', `%${Math.round(fighter.profile.crit * 100)}`],
          ['Kaçınma', `%${Math.round(fighter.profile.evasion * 100)}`], ['İsabet', `%${Math.round(fighter.profile.accuracy * 100)}`], ['Hız', String(fighter.profile.speed)]].map(([k, v]) => (
          <View key={k} style={{ width: '32%', backgroundColor: colors.inset, borderRadius: 5, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 10 }}>{k}</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{v}</Text>
          </View>
        ))}
      </View>
      <SectionTitle right={<Button title="Çantada giydir" small kind="ghost" onPress={onInventory} />}>Ekipman</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {fighter.equipment.length === 0 ? <Text style={ui.muted}>Üzerinde bir şey yok.</Text> : fighter.equipment.map((e) => <ItemIcon key={e.id} icon={e.icon} rarity={e.rarity} size={44} upgrade={e.upgrade} />)}
      </View>
      <SectionTitle>Yetenekler</SectionTitle>
      <Card>
        <View style={ui.between}>
          <Text style={ui.text}>Kullanılabilir yetenek puanı</Text>
          <Text style={[ui.h2, { color: colors.accent }]}>{fighter.skillPoints}</Text>
        </View>
        <Text style={ui.muted}>Her seviyede +1, her 10 seviyede +1 bonus. Rütbe maliyeti: 1, 2, 2, 3, 4 puan.</Text>
      </Card>

      <View style={ui.row}>
        {branches.map((b) => (
          <Pressable key={b} onPress={() => setBranch(b)} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderColor: branch === b ? classColor(fighter.class) : colors.border }}>
            <Text style={{ color: branch === b ? colors.text : colors.muted, textAlign: 'center', fontWeight: '700' }}>{game.BRANCH_NAMES[b]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={ui.muted}>
        {role === 'combat' ? 'Savaş dalı' : role === 'signature' ? 'İmza dalı' : 'Hibrit dal'} · Bu dala harcanan: {spentInBranch} puan
      </Text>

      {([1, 2, 3, 4] as const).map((tier) => {
        const need = game.GAME_CONFIG.skill.tier_unlock_points[tier - 1]!;
        const unlocked = spentInBranch >= need;
        return (
          <View key={tier} style={{ gap: 8 }}>
            <View style={ui.between}>
              <Text style={ui.label}>{TIER_NAMES[tier]}</Text>
              {!unlocked && <Text style={ui.muted}>🔒 {need} puan gerekir</Text>}
            </View>
            {game.SKILLS.filter((s) => s.branch === branch && s.tier === tier).map((s) => {
              const rank = skills[s.id] ?? 0;
              const nextCost = rank < s.max_rank ? game.rankCost(rank + 1) : null;
              return (
                <Card key={s.id} style={!unlocked ? { opacity: 0.55 } : undefined}>
                  <View style={ui.between}>
                    <Text style={[ui.text, { fontWeight: '700', flex: 1 }]}>{s.name}</Text>
                    <Text style={ui.muted}>{rank}/{s.max_rank}</Text>
                  </View>
                  <Text style={ui.muted}>{s.description}</Text>
                  {rank > 0 && <Text style={{ color: colors.good, fontSize: 13 }}>Şu an: {formatValue(s, game.skillValue(s, rank))}</Text>}
                  {nextCost !== null && (
                    <Button
                      title={`Rütbe ${rank + 1} · ${nextCost} puan`}
                      kind="ghost"
                      busy={busy === s.id}
                      disabled={!unlocked || fighter.skillPoints < nextCost}
                      onPress={() => act(s.id, () => api.rankUp(fighter.id, s.id))}
                    />
                  )}
                </Card>
              );
            })}
          </View>
        );
      })}

      <ErrorText message={error} />
      <Card>
        <Text style={ui.h2}>Puanları sıfırla</Text>
        <Text style={ui.muted}>{fighter.respecFree ? 'İlk sıfırlama ücretsiz.' : 'Sonraki sıfırlamalar Unutma İksiri ister ve 24 saat bekleme süresi vardır.'}</Text>
        {confirmRespec ? (
          <View style={ui.row}>
            <Button title="Vazgeç" kind="ghost" onPress={() => setConfirmRespec(false)} style={{ flex: 1 }} />
            <Button title="Evet, sıfırla" kind="danger" busy={busy === 'respec'} onPress={() => act('respec', () => api.respec(fighter.id)).then(() => setConfirmRespec(false))} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button title="Unutma (puanları iade et)" kind="ghost" onPress={() => setConfirmRespec(true)} />
        )}
      </Card>
    </ScrollView>
  );
}

function formatValue(s: game.SkillDefinition, v: number): string {
  if (s.unit === 'ratio') return `%${Math.round(v * 1000) / 10}`;
  if (s.unit === 'flag') return 'Açık';
  if (s.unit === 'minutes') return `${v} dk`;
  if (s.unit === 'turns') return `${v} tur`;
  if (s.unit === 'count') return `günde ${v}`;
  return String(v);
}
