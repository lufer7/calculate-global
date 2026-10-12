import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import type { SaveGame } from '@arena/core';
import { createExportPackage } from '@arena/core';
import { PRIVACY_NOTICE_TR } from '../i18n/privacyNotice';
import { api } from '../lib/api';
import { random } from '../lib/random';
import { deleteAllLocalData } from '../storage/saveRepository';
import { colors, ui } from './theme';

export function PrivacyScreen({ save, onBack, onWiped }: { save: SaveGame | null; onBack: () => void; onWiped: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [blob, setBlob] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const exportOffline = async () => {
    if (!save) return;
    const pkg = createExportPackage(save, random);
    setCode(pkg.code);
    setMessage(null);
    // The blob is useless without the code – share them through different channels.
    try {
      await Share.share({ message: pkg.blob });
      setBlob(null);
    } catch {
      setBlob(pkg.blob); // no share sheet (e.g. web) – show it for manual copy
    }
  };

  const exportViaRelay = async () => {
    if (!save) return;
    if (!save.online.enabled) {
      setMessage('Bulut transferi için önce çevrimiçi özellikleri açmalısın.');
      return;
    }
    try {
      const pkg = createExportPackage(save, random);
      await api.uploadTransfer(pkg.lookupId, pkg.blob);
      setCode(pkg.code);
      setBlob(null);
      setMessage(null);
    } catch {
      setMessage('Sunucuya ulaşılamadı. Çevrimdışı transfer kodunu kullanabilirsin.');
    }
  };

  const wipe = async () => {
    const token = save?.online.ladderToken;
    if (token) await api.deleteLadderEntry(token).catch(() => undefined); // best effort; expires anyway
    await deleteAllLocalData();
    onWiped();
  };

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
      {message && <Text style={ui.error}>{message}</Text>}
      {code && (
        <View style={ui.panel}>
          <Text style={ui.label}>Transfer kodun</Text>
          <Text selectable style={[ui.text, { fontFamily: 'monospace', fontSize: 18, textAlign: 'center' }]}>
            {code}
          </Text>
          <Text style={{ color: colors.muted }}>Bu kodu bir yere yaz. Kaybedersen kimse kurtaramaz, biz de.</Text>
        </View>
      )}
      {blob && (
        <View style={ui.panel}>
          <Text style={ui.label}>Şifreli kayıt (kopyalayıp sakla)</Text>
          <Text selectable numberOfLines={4} style={{ color: colors.muted, fontFamily: 'monospace', fontSize: 11 }}>
            {blob}
          </Text>
        </View>
      )}

      {!confirmWipe ? (
        <Pressable style={[ui.ghostButton, { borderColor: colors.danger }]} onPress={() => setConfirmWipe(true)}>
          <Text style={{ color: colors.danger }}>Tüm Verilerimi Sil</Text>
        </Pressable>
      ) : (
        <View style={[ui.panel, { borderColor: colors.danger }]}>
          <Text style={ui.text}>İlerlemen bu cihazdan kalıcı olarak silinir. Geri alınamaz.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={[ui.ghostButton, { flex: 1 }]} onPress={() => setConfirmWipe(false)}>
              <Text style={ui.ghostButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable style={[ui.button, { flex: 1, backgroundColor: colors.danger }]} onPress={wipe}>
              <Text style={ui.buttonText}>Evet, sil</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Pressable style={ui.ghostButton} onPress={onBack}>
        <Text style={ui.ghostButtonText}>Geri</Text>
      </Pressable>
    </ScrollView>
  );
}
