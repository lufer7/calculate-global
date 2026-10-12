import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Button, Card, ErrorText, Field, Pill } from '../../components/ui';
import { tr } from '../../i18n/tr';
import type { DataRequest } from '../../lib/api';
import { ApiError, api } from '../../lib/api';
import { colors, ui } from '../theme';

const KINDS: { id: DataRequest['kind']; label: string }[] = [
  { id: 'access', label: 'Bilgi / erişim' },
  { id: 'rectification', label: 'Düzeltme' },
  { id: 'erasure', label: 'Silme' },
  { id: 'objection', label: 'İtiraz' },
  { id: 'other', label: 'Diğer' },
];
const STATUS: Record<DataRequest['status'], string> = { open: 'Yanıt bekliyor', answered: 'Yanıtlandı', rejected: 'Reddedildi' };

type Panel = null | 'email' | 'password' | 'request';

/** KVKK md. 11 tools: download data, rectify email/password, sign out elsewhere, written applications. */
export function PrivacyTools({ onEmailChanged }: { onEmailChanged: () => void }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [code, setCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [kind, setKind] = useState<DataRequest['kind']>('access');
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [exported, setExported] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRequests = () => api.dataRequests().then((r) => setRequests(r.requests)).catch(() => undefined);
  useEffect(() => {
    void loadRequests();
  }, []);

  const open = (p: Panel) => {
    setPanel(panel === p ? null : p);
    setA(''); setB(''); setCode(''); setAwaitingCode(false); setError(null); setInfo(null);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={ui.h2}>Verilerin ve hakların</Text>
      <Text style={ui.muted}>KVKK md. 11 kapsamındaki haklarını buradan kullanabilirsin.</Text>

      <Button title="Verilerimi indir" kind="ghost" busy={busy && panel === null} onPress={() => run(async () => {
        const json = JSON.stringify(await api.exportData(), null, 2);
        try {
          await Share.share({ message: json, title: 'Aegis verilerim' });
        } catch {
          setExported(json);
        }
      })} />
      {exported && <Text selectable numberOfLines={12} style={{ color: colors.muted, fontFamily: 'monospace', fontSize: 11 }}>{exported}</Text>}

      <Button title="E-posta adresimi değiştir" kind="ghost" onPress={() => open('email')} />
      {panel === 'email' && (
        <View style={{ gap: 8 }}>
          {!awaitingCode ? (
            <>
              <Field label="Yeni e-posta" value={a} onChangeText={setA} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Şifren" value={b} onChangeText={setB} secureTextEntry />
              <Button title="Kod gönder" busy={busy} disabled={!a || !b} onPress={() => run(async () => { await api.changeEmail(a, b); setAwaitingCode(true); })} />
            </>
          ) : (
            <>
              <Text style={ui.muted}>{a} adresine gelen 6 haneli kodu gir.</Text>
              <Field label="Kod" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              <Button title="Onayla" busy={busy} disabled={code.length !== 6} onPress={() => run(async () => { await api.confirmEmail(code); setPanel(null); setInfo('E-posta adresin güncellendi.'); onEmailChanged(); })} />
            </>
          )}
        </View>
      )}

      <Button title="Şifremi değiştir" kind="ghost" onPress={() => open('password')} />
      {panel === 'password' && (
        <View style={{ gap: 8 }}>
          <Field label="Mevcut şifre" value={a} onChangeText={setA} secureTextEntry />
          <Field label="Yeni şifre (en az 10 karakter)" value={b} onChangeText={setB} secureTextEntry />
          <Button title="Şifreyi değiştir" busy={busy} disabled={!a || b.length < 10} onPress={() => run(async () => { await api.changePassword(a, b); setPanel(null); setInfo('Şifren değişti; diğer cihazlardaki oturumlar kapatıldı.'); })} />
        </View>
      )}

      <Button title="Diğer cihazlardan çıkış yap" kind="ghost" onPress={() => run(async () => { await api.revokeOtherSessions(); setInfo('Diğer cihazlardaki oturumlar kapatıldı.'); })} />

      <Button title="KVKK başvurusu yap" kind="ghost" onPress={() => open('request')} />
      {panel === 'request' && (
        <View style={{ gap: 8 }}>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            {KINDS.map((k) => (
              <Pressable key={k.id} onPress={() => setKind(k.id)} style={{ borderWidth: 1, borderColor: kind === k.id ? colors.accent : colors.border, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: kind === k.id ? colors.text : colors.muted }}>{k.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Talebin" value={a} onChangeText={setA} multiline maxLength={2000} style={[ui.input, { minHeight: 90, textAlignVertical: 'top' }]} />
          <Text style={ui.muted}>Başvurun en geç 30 gün içinde yanıtlanır. Yanıtı burada görürsün, e-postayla da haber veririz.</Text>
          <Button title="Başvuruyu gönder" busy={busy} disabled={a.trim().length < 3} onPress={() => run(async () => { await api.createDataRequest(kind, a); setPanel(null); setInfo('Başvurun alındı.'); await loadRequests(); })} />
        </View>
      )}

      {info && <Text style={{ color: colors.good }}>{info}</Text>}
      <ErrorText message={error} />

      {requests.length > 0 && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={ui.label}>KVKK başvurularım</Text>
          {requests.map((r) => (
            <View key={r.id} style={{ gap: 4, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
              <View style={ui.between}>
                <Text style={ui.text}>{KINDS.find((k) => k.id === r.kind)?.label}</Text>
                <Pill text={STATUS[r.status]} color={r.status === 'open' ? colors.warn : colors.good} />
              </View>
              <Text style={ui.muted}>{new Date(r.created_at).toLocaleDateString('tr-TR')} · son tarih {new Date(r.due_at).toLocaleDateString('tr-TR')}</Text>
              {r.answer && <Text style={ui.text}>Yanıt: {r.answer}</Text>}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
