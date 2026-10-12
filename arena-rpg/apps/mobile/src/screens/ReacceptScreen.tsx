import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button, Checkbox, ErrorText } from '../components/ui';
import { tr } from '../i18n/tr';
import { LEGAL } from '../legal/texts';
import { ApiError, api } from '../lib/api';
import { LegalScreen } from './LegalScreen';
import { colors, ui } from './theme';

/** Shown when the legal texts changed since the player last accepted them. */
export function ReacceptScreen({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (legal) return <LegalScreen which={legal} onClose={() => setLegal(null)} />;
  const link = (text: string, which: 'privacy' | 'terms') => <Text style={{ color: colors.accent, textDecorationLine: 'underline' }} onPress={() => setLegal(which)}>{text}</Text>;
  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Text style={ui.title}>Metinlerimiz güncellendi</Text>
      <Text style={ui.text}>Oynamaya devam etmek için güncel metinleri okuyup onaylaman gerekiyor. Onaylamak istemezsen hesabını Hesap sekmesinden silebilir ya da çıkış yapabilirsin.</Text>
      <Checkbox checked={privacy} onChange={setPrivacy}><Text style={ui.text}>{link('Aydınlatma Metni', 'privacy')}'ni okudum.</Text></Checkbox>
      <Checkbox checked={terms} onChange={setTerms}><Text style={ui.text}>{link('Kullanım Koşulları', 'terms')}'nı kabul ediyorum.</Text></Checkbox>
      <ErrorText message={error} />
      <Button title="Onayla ve devam et" busy={busy} disabled={!terms || !privacy} onPress={async () => {
        setBusy(true);
        try {
          await api.acceptLegal();
          onDone();
        } catch (e) {
          setError(tr.error(e instanceof ApiError ? e.code : 'unknown'));
        } finally {
          setBusy(false);
        }
      }} />
      <Button title="Çıkış yap" kind="ghost" onPress={onSignOut} />
      <Text style={ui.muted}>Sürüm: koşullar {LEGAL.versions.terms}, aydınlatma {LEGAL.versions.privacy}</Text>
    </ScrollView>
  );
}
