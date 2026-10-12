import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Checkbox, ErrorText, Field } from '../components/ui';
import { tr } from '../i18n/tr';
import { game } from '@arena/core';
import { LEGAL } from '../legal/texts';
import { ApiError, api } from '../lib/api';
import { LegalScreen } from './LegalScreen';
import { colors, ui } from './theme';

type Mode = 'login' | 'register' | 'verify';

export function AuthScreen({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [age, setAge] = useState(false);
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'unknown';
      setError(code === 'banned' && e instanceof ApiError
        ? `${tr.error('banned')} Gerekçe: ${String(e.data?.reason ?? '-')}${e.data?.until ? ` · Bitiş: ${new Date(Number(e.data.until)).toLocaleString('tr-TR')}` : ' · Kalıcı'}`
        : tr.error(code));
      if (code === 'not_verified') setMode('verify');
    } finally {
      setBusy(false);
    }
  };

  if (legal) return <LegalScreen which={legal} onClose={() => setLegal(null)} />;

  const link = (text: string, which: 'privacy' | 'terms') => (
    <Text style={{ color: colors.accent, textDecorationLine: 'underline' }} onPress={() => setLegal(which)}>{text}</Text>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
        <Text style={[ui.title, { fontSize: 30, letterSpacing: 1 }]}>TOZ VE DEMİR</Text>
        <Text style={ui.muted}>Arenada adını duyur, karanlık ormanlara sefer düzenle.</Text>

        {mode !== 'verify' && (
          <View style={[ui.row, { marginTop: 8 }]}>
            {(['login', 'register'] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setError(null); }} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderColor: mode === m ? colors.accent : colors.border }}>
                <Text style={{ color: mode === m ? colors.text : colors.muted, textAlign: 'center', fontWeight: '700' }}>{m === 'login' ? 'Giriş yap' : 'Kayıt ol'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {mode === 'verify' ? (
          <>
            <Text style={ui.h2}>E-postanı doğrula</Text>
            <Text style={ui.muted}>{email} adresine 6 haneli bir kod gönderdik. Kod 15 dakika geçerli.</Text>
            <Field label="Doğrulama kodu" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
            <ErrorText message={error} />
            <Button title="Doğrula ve başla" busy={busy} disabled={code.length !== 6} onPress={() => run(async () => onSignedIn((await api.verify(email, code)).token))} />
            <Button title="Geri" kind="ghost" onPress={() => setMode('register')} />
          </>
        ) : (
          <>
            <Field label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && (
              <View style={{ gap: 12 }}>
                <Text style={ui.muted}>Yalnızca e-postanı istiyoruz. Adın, telefonun veya konumun gerekmiyor.</Text>
                <Checkbox checked={privacy} onChange={setPrivacy}>
                  <Text style={ui.text}>{link('Aydınlatma Metni', 'privacy')}'ni okudum.</Text>
                </Checkbox>
                <Checkbox checked={terms} onChange={setTerms}>
                  <Text style={ui.text}>{link('Kullanım Koşulları', 'terms')}'nı kabul ediyorum.</Text>
                </Checkbox>
                <Checkbox checked={age} onChange={setAge}>
                  <Text style={ui.text}>{game.MIN_AGE} yaşından büyüğüm.</Text>
                </Checkbox>
                <Checkbox checked={marketing} onChange={setMarketing}>
                  <Text style={ui.muted}>İsteğe bağlı: Yenilikler ve etkinlikler hakkında e-posta almak istiyorum. (Bu izni vermesen de oynayabilirsin.)</Text>
                </Checkbox>
              </View>
            )}
            <ErrorText message={error} />
            {mode === 'login' ? (
              <Button title="Giriş yap" busy={busy} disabled={!email || !password} onPress={() => run(async () => {
                const r = await api.login(email, password);
                onSignedIn(r.token);
              })} />
            ) : (
              <Button title="Kayıt ol" busy={busy} disabled={!email || password.length < 10 || !terms || !privacy || !age} onPress={() => run(async () => {
                await api.register({ email, password, acceptTerms: terms, privacyNoticeAck: privacy, ageConfirmed: age, marketingConsent: marketing, termsVersion: LEGAL.versions.terms, privacyVersion: LEGAL.versions.privacy });
                setMode('verify');
              })} />
            )}
            {mode === 'register' && password.length > 0 && password.length < 10 && <Text style={ui.muted}>Şifre en az 10 karakter olmalı.</Text>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
