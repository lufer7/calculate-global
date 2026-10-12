import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import type { SaveGame } from '@arena/core';
import { CreateCharacterScreen } from './src/screens/CreateCharacterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { loadSave } from './src/storage/saveRepository';
import { colors } from './src/screens/theme';

type Route = 'loading' | 'create' | 'home' | 'privacy' | 'error';

/** Minimal state-machine router – no navigation dependency needed for a menu game skeleton. */
export default function App() {
  const [route, setRoute] = useState<Route>('loading');
  const [save, setSave] = useState<SaveGame | null>(null);

  useEffect(() => {
    loadSave()
      .then((s) => {
        setSave(s);
        setRoute(s ? 'home' : 'create');
      })
      .catch(() => setRoute('error'));
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {route === 'loading' && <ActivityIndicator color={colors.accent} style={{ marginTop: 64 }} />}
      {route === 'error' && <Text style={styles.error}>Kayıt okunamadı. Ayarlardan verileri sıfırlayabilirsin.</Text>}
      {route === 'create' && (
        <CreateCharacterScreen
          onCreated={(s) => {
            setSave(s);
            setRoute('home');
          }}
        />
      )}
      {route === 'home' && save && <HomeScreen save={save} onOpenPrivacy={() => setRoute('privacy')} />}
      {(route === 'privacy' || route === 'error') && (
        <PrivacyScreen
          save={save}
          onBack={() => setRoute(save ? 'home' : 'create')}
          onWiped={() => {
            setSave(null);
            setRoute('create');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, padding: 24 },
});
