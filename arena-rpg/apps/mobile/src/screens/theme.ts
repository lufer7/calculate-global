import { StyleSheet } from 'react-native';

/** Placeholder palette – dusk over an old harbour. Swap when the Albion-style art arrives. */
export const colors = {
  bg: '#14110e',
  panel: '#201b16',
  panelHi: '#2a231c',
  border: '#3d3329',
  text: '#ece3d4',
  muted: '#a39684',
  accent: '#d08a3c',
  accentInk: '#1b140d',
  good: '#7fbf7a',
  warn: '#e0a83c',
  danger: '#e0675f',
  scout: '#7fb48a',
  swordmaster: '#d0704a',
  seer: '#8f8fd8',
};

export const classColor = (c: string) => (colors as Record<string, string>)[c] ?? colors.accent;

export const ui = StyleSheet.create({
  screen: { padding: 16, gap: 14, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  input: { backgroundColor: colors.panel, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: colors.danger, fontSize: 14 },
});
