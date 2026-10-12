import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { Button } from './src/components/ui';
import { tr } from './src/i18n/tr';
import type { GameState } from './src/lib/api';
import { ApiError, api, setToken } from './src/lib/api';
import { session } from './src/lib/session';
import { AuthScreen } from './src/screens/AuthScreen';
import { CreateFighterScreen } from './src/screens/CreateFighterScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { MainScreen } from './src/screens/MainScreen';
import { colors, ui } from './src/screens/theme';

type Phase =
  | { kind: 'loading' }
  | { kind: 'auth' }
  | { kind: 'first-fighter' }
  | { kind: 'game'; state: GameState }
  | { kind: 'error'; message: string };

const MIN_SPLASH_MS = 1200;

export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  const enter = useCallback(async () => {
    setPhase({ kind: 'loading' });
    const started = Date.now();
    const wait = () => new Promise((r) => setTimeout(r, Math.max(0, MIN_SPLASH_MS - (Date.now() - started))));
    try {
      const token = await session.get();
      if (!token) {
        await wait();
        return setPhase({ kind: 'auth' });
      }
      setToken(token);
      const state = await api.state();
      await wait();
      setPhase(state.fighters.length === 0 ? { kind: 'first-fighter' } : { kind: 'game', state });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'unknown';
      if (code === 'unauthorized' || code === 'banned') {
        await signOut();
      } else {
        setPhase({ kind: 'error', message: tr.error(code) });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    setToken(null);
    await session.clear();
    setPhase({ kind: 'auth' });
  }, []);

  useEffect(() => {
    void enter();
  }, [enter]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {phase.kind === 'loading' && <LoadingScreen />}
      {phase.kind === 'auth' && (
        <AuthScreen onSignedIn={async (token) => { await session.set(token); setToken(token); await enter(); }} />
      )}
      {phase.kind === 'first-fighter' && <CreateFighterScreen isFirst onCreated={enter} />}
      {phase.kind === 'game' && <MainScreen initial={phase.state} onSignedOut={signOut} />}
      {phase.kind === 'error' && (
        <SafeAreaView style={[ui.screen, { flex: 1, justifyContent: 'center' }]}>
          <Text style={ui.h2}>Bağlantı sorunu</Text>
          <Text style={ui.text}>{phase.message}</Text>
          <Button title="Tekrar dene" onPress={enter} />
          <Button title="Çıkış yap" kind="ghost" onPress={signOut} />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
