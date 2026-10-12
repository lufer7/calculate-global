import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text } from 'react-native';
import type { SaveGame } from '@arena/core';
import { createExportPackage } from '@arena/core';
import { PRIVACY_NOTICE_TR } from '../i18n/privacyNotice';
import { api } from '../lib/api';
import { random } from '../lib/random';
import { deleteAllLocalData } from '../storage/saveRepository';
import { colors, ui } from './theme';

export function PrivacyScreen({ save, onBack, onWiped }: { save: SaveGame | null; onBack: () => void; onWiped: () => void }) {
  const [code, setCode] = useState<string | null>(null);

  const exportOffline = async () => {
    if (!save) return;
    const pkg = createExportPackage(save, random);
    setCode(pkg.code);
    // The blob is useless without the code – share them through different channels.
    await Share.share({ message: pkg.blob });
  };

  const exportViaRelay = async () => {
    if (!save) return;
    if (!save.online.enabled) {
      Alert.alert('Çevrimiçi özellikler kapalı', 'Bulut transferi için önce çevrimiçi özellikleri açmalısın.');
      return;
    }
    const pkg = createExportPackage(save, random);
    await api.uploadTransfer(pkg.lookupId, pkg.blob);
    setCode(pkg.code);
  };

  const wipe = () =>
    Alert.alert('Tüm veriler silinsin mi?', 'İlerlemen bu cihazdan kalıcı olarak silinir. Geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const token = save?.online.ladderToken;
          if (token) await api.deleteLadderEntry(token).catch(() => undefined); // best effort; expires anyway
          await deleteAllLocalData();
          onWiped();
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Text style={ui.title}>Gizlilik ve Verilerin</Text>
      <Text style={[ui.text, { lineHeight: 22 }]}>{PRIVACY_NOTICE_TR}</Text>

      {save && (
        <>
          <Pressable style={ui.button} onPress={exportOffline}>
            <Text style={ui.buttonText}>Transfer Kodu Oluştur (çevrimdışı)</Text>
          </Pressable>
          <Pressable style={ui.ghostButton} onPress={exportViaRelay}>
            <Text style={ui.ghostButtonText}>Transfer Kodu Oluştur (bulut, 72 saat)</Text>
          </Pressable>
        </>
      )}
      {code && (
        <Text selectable style={[ui.panel, ui.text, { fontFamily: 'monospace', fontSize: 18, textAlign: 'center' }]}>
          {code}
        </Text>
      )}
      {code && <Text style={{ color: colors.muted }}>Bu kodu bir yere yaz. Kaybedersen kimse kurtaramaz — biz de.</Text>}

      <Pressable style={[ui.ghostButton, { borderColor: colors.danger }]} onPress={wipe}>
        <Text style={{ color: colors.danger }}>Tüm Verilerimi Sil</Text>
      </Pressable>
      <Pressable style={ui.ghostButton} onPress={onBack}>
        <Text style={ui.ghostButtonText}>Geri</Text>
      </Pressable>
    </ScrollView>
  );
}
