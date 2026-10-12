import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { TextInputProps, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { NavIcon } from '../art/NavIcon';
import { colors, fonts, ui } from '../screens/theme';

/** Gold "forged" button for primary actions, stone for secondary, red outline for destructive. */
export function Button({ title, onPress, kind = 'primary', disabled, busy, style, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; busy?: boolean; style?: ViewStyle; small?: boolean;
}) {
  const pad = small ? 8 : 12;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        { borderRadius: 5, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: pad, paddingHorizontal: 12 },
        kind === 'primary' ? { borderColor: '#e6c77f' } : kind === 'danger' ? { borderColor: colors.danger, backgroundColor: '#2a1614' } : { borderColor: colors.border, backgroundColor: colors.panelHi },
        (disabled || busy) && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {kind === 'primary' && (
        <Svg style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
          <Defs>
            <LinearGradient id="btn-gold" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e8c879" />
              <Stop offset="1" stopColor="#a17c3a" />
            </LinearGradient>
          </Defs>
          <Rect width={10} height={10} fill="url(#btn-gold)" />
        </Svg>
      )}
      {busy ? <ActivityIndicator color={kind === 'primary' ? colors.accentInk : colors.text} />
        : <Text style={{ color: kind === 'primary' ? colors.accentInk : kind === 'danger' ? colors.danger : colors.text, fontWeight: '800', fontSize: small ? 13 : 15, letterSpacing: 0.3 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.faint} autoCorrect={false} style={ui.input} {...props} />
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={[ui.row, { alignItems: 'flex-start' }]}>
      <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: checked ? colors.trim : colors.muted, backgroundColor: checked ? colors.trim : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {checked && <Text style={{ color: colors.accentInk, fontWeight: '900', fontSize: 14 }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Pill({ text, color = colors.muted }: { text: string; color?: string }) {
  return (
    <View style={{ borderColor: color, borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#00000030' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/** Stone panel with a thin gold inner trim. */
export function Card({ children, style, trim }: { children: ReactNode; style?: ViewStyle; trim?: boolean }) {
  return (
    <View style={[ui.panel, trim && { borderColor: colors.trimDim }, style]}>
      {trim && <View pointerEvents="none" style={{ position: 'absolute', left: 3, right: 3, top: 3, bottom: 3, borderWidth: 1, borderColor: '#c9a55c22', borderRadius: 4 }} />}
      {children}
    </View>
  );
}

/** Ribbon-style section heading. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={[ui.between, { marginTop: 4 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <View style={{ width: 14, height: 1, backgroundColor: colors.trim }} />
        <Text style={[ui.label, { fontSize: 12 }]}>{children}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.trimDim, opacity: 0.5 }} />
      </View>
      {right}
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={ui.error} accessibilityRole="alert">{message}</Text>;
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

export function Bar({ ratio, color = colors.trim, height = 6, label }: { ratio: number; color?: string; height?: number; label?: string }) {
  return (
    <View style={{ height: label ? 16 : height, backgroundColor: colors.bgDeep, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#00000060', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: color }} />
      {label && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 2 }}>{label}</Text>}
    </View>
  );
}

export function Gold({ amount, size = 15 }: { amount: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <NavIcon name="coin" color={colors.trim} size={size + 2} />
      <Text style={[{ color: colors.trim, fontWeight: '800', fontSize: size }, ui.num]}>{amount.toLocaleString('tr-TR')}</Text>
    </View>
  );
}

/** Bottom sheet for item details, confirmations and pickers. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000000a0' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.panel, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: 2, borderColor: colors.trimDim, maxHeight: '85%' }}>
        <View style={[ui.between, { paddingHorizontal: 16, paddingTop: 12 }]}>
          <Text style={[ui.h2, { flex: 1 }]}>{title ?? ''}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Kapat"><NavIcon name="close" color={colors.muted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function StatRow({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <View style={ui.between}>
      <Text style={ui.muted}>{label}</Text>
      <Text style={[ui.text, ui.num, { fontWeight: '700' }]}>
        {value}
        {delta !== undefined && delta !== 0 && <Text style={{ color: delta > 0 ? colors.good : colors.danger, fontSize: 13 }}>{`  ${delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta * 10) / 10)}`}</Text>}
      </Text>
    </View>
  );
}

export const titleFont = { fontFamily: fonts.display };
