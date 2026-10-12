import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card, ErrorText, Field } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { LEGAL } from '../../legal/texts';
import type { GameState } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { classColor, colors, ui } from '../theme';

export function AccountTab({ state, onLegal, onSignedOut }: { state: GameState; onLegal: (w: 'privacy' | 'terms') => void; onSignedOut: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const [marketing, setMarketing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const perk = state.account.mainClassPerk;
  const main = state.account.mainClass;

  useEffect(() => {
    api.me().then((m) => { setEmail(m.email); setMarketing(m.marketingConsent); }).catch(() => undefined);
  }, []);

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={ui.label}>Oyundaki takma adın</Text>
        <Text style={ui.h2}>{state.account.displayName}</Text>
        <Text style={ui.muted}>Takma ad otomatik üretilir; diğer oyuncular seni bu adla görür.</Text>
        <Text style={ui.muted}>E-posta: {email ?? '…'}</Text>
        <Text style={ui.muted}>Hesap seviyesi {state.account.accountLevel} · Dövüşçü hakkı {state.account.fighterSlots}</Text>
      </Card>

      {main && perk && (
        <Card style={{ borderColor: classColor(main) }}>
          <Text style={[ui.label, { color: classColor(main) }]}>Ana sınıf · {tr.classes[main].name}</Text>
          <Text style={ui.h2}>{perk.title}</Text>
          {perk.lines.map((l) => <Text key={l} style={ui.text}>• {l}</Text>)}
          <Text style={ui.muted}>İlk dövüşçünün sınıfından gelir ve tüm dövüşçülerine uygulanır.</Text>
        </Card>
      )}

      <Card>
        <Text style={ui.h2}>Gizlilik</Text>
        <Button title={LEGAL.privacy.title} kind="ghost" onPress={() => onLegal('privacy')} />
        <Button title={LEGAL.terms.title} kind="ghost" onPress={() => onLegal('terms')} />
        <View style={ui.between}>
          <Text style={[ui.text, { flex: 1 }]}>Yenilik ve etkinlik e-postaları (isteğe bağlı)</Text>
          <Switch value={marketing} onValueChange={async (v) => { setMarketing(v); await api.setMarketing(v).catch(() => setMarketing(!v)); }} />
        </View>
      </Card>

      <Button title="Çıkış yap" kind="ghost" onPress={async () => { await api.logout().catch(() => undefined); onSignedOut(); }} />

      <Card style={{ borderColor: colors.danger }}>
        <Text style={[ui.h2, { color: colors.danger }]}>Hesabı sil</Text>
        <Text style={ui.muted}>Hesabın, dövüşçülerin ve tüm oyun verilerin kalıcı olarak silinir. Geri alınamaz.</Text>
        {deleting ? (
          <>
            <Field label="Onay için şifren" value={password} onChangeText={setPassword} secureTextEntry />
            <ErrorText message={error} />
            <View style={ui.row}>
              <Button title="Vazgeç" kind="ghost" onPress={() => { setDeleting(false); setPassword(''); }} style={{ flex: 1 }} />
              <Button title="Kalıcı olarak sil" kind="danger" busy={busy} disabled={!password} style={{ flex: 1 }} onPress={async () => {
                setBusy(true);
                setError(null);
                try {
                  await api.deleteAccount(password);
                  onSignedOut();
                } catch (e) {
                  setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
                } finally {
                  setBusy(false);
                }
              }} />
            </View>
          </>
        ) : (
          <Button title="Hesabımı sil" kind="danger" onPress={() => setDeleting(true)} />
        )}
      </Card>
    </View>
  );
}
