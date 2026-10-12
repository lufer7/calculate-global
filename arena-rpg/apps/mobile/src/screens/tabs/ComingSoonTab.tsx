import { Text, View } from 'react-native';
import { Card } from '../../components/ui';
import { ui } from '../theme';

/** Planned tabs are shown honestly as "coming soon" with what they will contain. */
export function ComingSoonTab({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={ui.h2}>{title}</Text>
        <Text style={ui.label}>Yakında</Text>
        {lines.map((l) => <Text key={l} style={ui.text}>• {l}</Text>)}
      </Card>
    </View>
  );
}
