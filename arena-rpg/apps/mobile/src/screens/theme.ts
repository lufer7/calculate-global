import { StyleSheet } from 'react-native';

/**
 * "Stone & parchment" palette: slate-teal stone panels, parchment text, worn gold trim.
 * Inspired by the muted, painterly look of classic medieval MMOs – no colours or art copied.
 */
export const colors = {
  bg: '#0f1417',
  bgDeep: '#0a0e10',
  panel: '#182127',
  panelHi: '#202c33',
  inset: '#121a1f',
  border: '#2f3d45',
  trim: '#c9a55c',
  trimDim: '#7d6739',
  text: '#ece2c9',
  muted: '#9aa39f',
  faint: '#5f6b6a',
  accent: '#c9a55c',
  accentInk: '#1a140a',
  good: '#7cc47f',
  warn: '#e2b24f',
  danger: '#d9625a',
  hp: '#b8433a',
  xp: '#4f9fbf',
  energy: '#d9b84a',
  scout: '#8fbf6a',
  swordmaster: '#d4774f',
  seer: '#9a92e6',
};

export const classColor = (c: string) => (colors as Record<string, string>)[c] ?? colors.accent;

export const fonts = {
  /** System serif for titles gives the parchment / chronicle feel without bundling fonts. */
  display: 'serif',
};

export const ui = StyleSheet.create({
  screen: { padding: 14, gap: 12, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', fontFamily: fonts.display, letterSpacing: 0.5 },
  h2: { color: colors.text, fontSize: 17, fontWeight: '700', fontFamily: fonts.display },
  label: { color: colors.trim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 6, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  input: { backgroundColor: colors.inset, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 6, padding: 12, fontSize: 16 },
  error: { color: colors.danger, fontSize: 14 },
  num: { fontVariant: ['tabular-nums'] },
});
