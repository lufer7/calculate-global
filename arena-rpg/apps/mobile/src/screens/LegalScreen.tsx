import { ScrollView, Text } from 'react-native';
import { Button } from '../components/ui';
import { LEGAL } from '../legal/texts';
import { ui } from './theme';

export function LegalScreen({ which, onClose }: { which: 'privacy' | 'terms'; onClose: () => void }) {
  const doc = LEGAL[which];
  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Text style={ui.title}>{doc.title}</Text>
      <Text style={ui.muted}>Sürüm {which === 'privacy' ? LEGAL.versions.privacy : LEGAL.versions.terms}</Text>
      <Text style={ui.text}>{doc.body}</Text>
      <Button title="Kapat" kind="ghost" onPress={onClose} />
    </ScrollView>
  );
}
