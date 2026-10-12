import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#16130f',
  panel: '#221d17',
  border: '#3a3128',
  text: '#eae1d3',
  muted: '#a3978a',
  accent: '#d08a3c',
  danger: '#d9534f',
};

export const ui = StyleSheet.create({
  screen: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  text: { color: colors.text, fontSize: 15 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 },
  button: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#1a1410', fontWeight: '700', fontSize: 16 },
  ghostButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  ghostButtonText: { color: colors.text },
  input: { backgroundColor: colors.panel, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: colors.danger },
});
