import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps, ViewStyle } from 'react-native';
import { colors, ui } from '../screens/theme';

export function Button({ title, onPress, kind = 'primary', disabled, busy, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; busy?: boolean; style?: ViewStyle;
}) {
  const base: ViewStyle = { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1 };
  const look: ViewStyle =
    kind === 'primary' ? { backgroundColor: colors.accent, borderColor: colors.accent }
      : kind === 'danger' ? { borderColor: colors.danger }
        : { borderColor: colors.border };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [base, look, (disabled || busy) && { opacity: 0.45 }, pressed && { opacity: 0.8 }, style]}
    >
      {busy ? <ActivityIndicator color={kind === 'primary' ? colors.accentInk : colors.text} />
        : <Text style={{ color: kind === 'primary' ? colors.accentInk : kind === 'danger' ? colors.danger : colors.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} autoCorrect={false} style={ui.input} {...props} />
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={[ui.row, { alignItems: 'flex-start' }]}>
      <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: checked ? colors.accent : colors.muted, backgroundColor: checked ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {checked && <Text style={{ color: colors.accentInk, fontWeight: '900', fontSize: 14 }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Pill({ text, color = colors.muted }: { text: string; color?: string }) {
  return (
    <View style={{ borderColor: color, borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[ui.panel, style]}>{children}</View>;
}

export function ErrorText({ code, message }: { code?: string | null; message?: string | null }) {
  if (!message) return null;
  return <Text style={ui.error} accessibilityRole="alert">{message}{code ? '' : ''}</Text>;
}

/** Ticks once a second; `offset` aligns the device clock with server time for countdowns. */
export function useNow(offset = 0) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);
  return now;
}

export function Bar({ ratio, color = colors.accent }: { ratio: number; color?: string }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}
