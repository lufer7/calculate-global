import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../screens/theme';

type Pt = [number, number];
const pts = (...p: Pt[]) => p;

/** Node positions on a 100×135 board, from the bottom (stage 1) to the top (boss). */
const NODES: [number, number][] = [[50, 124], [24, 110], [44, 96], [74, 86], [58, 72], [26, 62], [36, 46], [68, 38], [52, 24], [50, 9]];

const THEMES: Record<string, { ground: [string, string]; path: string; deco: () => ReactNode }> = {
  dark_forest: {
    ground: ['#13241e', '#29453a'], path: '#8a7a55',
    deco: () => pts([8, 20], [86, 14], [14, 80], [88, 62], [80, 110], [10, 130], [30, 28], [92, 96], [70, 8], [6, 50]).map(([x, y], i) => (
      <G key={i}><Path d={`M${x} ${y} l4 -11 l4 11 Z M${x + 1} ${y - 4} l3 -9 l3 9 Z`} fill={i % 2 ? '#0e1d18' : '#1c3a2f'} /></G>
    )),
  },
  misty_marsh: {
    ground: ['#3a4640', '#66756a'], path: '#a7a38a',
    deco: () => [
      ...pts([16, 30], [82, 52], [12, 100], [84, 118], [30, 76], [70, 20]).map(([x, y], i) => <Ellipse key={`p${i}`} cx={x} cy={y} rx={9} ry={3.5} fill="#2b3a35" opacity={0.8} />),
      ...pts([6, 60], [92, 80], [20, 14], [78, 132], [90, 34]).map(([x, y], i) => <Path key={`r${i}`} d={`M${x} ${y} q1 -6 0 -10 M${x + 2} ${y} q1 -7 2 -11 M${x + 4} ${y} q0 -5 -1 -8`} stroke="#1f2a24" strokeWidth={0.8} fill="none" />),
      <Rect key="fog" y={40} width={100} height={22} fill="#dfe6d8" opacity={0.12} />,
    ],
  },
  abandoned_mines: {
    ground: ['#2a2228', '#4a3c3a'], path: '#7a6a5a',
    deco: () => [
      ...pts([10, 20], [86, 44], [14, 92], [88, 104], [80, 8], [6, 128]).map(([x, y], i) => <Path key={`k${i}`} d={`M${x} ${y} l6 -8 l6 3 l3 7 Z`} fill="#3a3036" />),
      ...pts([20, 52], [82, 72], [34, 116]).map(([x, y], i) => <Circle key={`l${i}`} cx={x} cy={y} r={1.6} fill="#ffcf7a" />),
    ],
  },
  lost_lands: {
    ground: ['#1c1436', '#432d5e'], path: '#b9a0d9',
    deco: () => [
      ...pts([12, 22], [86, 50], [16, 96], [84, 116], [30, 6], [74, 70]).map(([x, y], i) => <Rect key={`c${i}`} x={x} y={y - 10} width={3} height={10} fill="#5a4870" />),
      ...pts([40, 14], [90, 20], [8, 70], [60, 130], [94, 92]).map(([x, y], i) => <Circle key={`s${i}`} cx={x} cy={y} r={0.8} fill="#fff4ff" />),
    ],
  },
};

/** Minimal themed trail map: tap a reachable stage to plan an expedition there. */
export function TrailMap({ zoneId, cleared, selected, width, onSelect, activeStages }: {
  zoneId: string; cleared: number; selected: number; width: number; onSelect: (stage: number) => void; activeStages: number[];
}) {
  const theme = THEMES[zoneId] ?? THEMES.dark_forest!;
  const height = width * 1.35;
  const d = NODES.map(([x, y], i) => `${i === 0 ? 'M' : 'Q'}${i === 0 ? '' : `${(NODES[i - 1]![0] + x) / 2 + (i % 2 ? 12 : -12)} ${(NODES[i - 1]![1] + y) / 2} `}${x} ${y}`).join(' ');
  return (
    <View style={{ width, height, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.trimDim }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Svg pointerEvents="none" width={width} height={height} viewBox="0 0 100 135">
          <Defs>
            <LinearGradient id={`tm-${zoneId}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.ground[0]} />
              <Stop offset="1" stopColor={theme.ground[1]} />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={135} fill={`url(#tm-${zoneId})`} />
          {theme.deco()}
          <Path d={d} stroke="#00000060" strokeWidth={4.4} fill="none" strokeLinecap="round" />
          <Path d={d} stroke={theme.path} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeDasharray="1 2.2" />
        </Svg>
      </View>
      {NODES.map(([x, y], i) => {
        const stage = i + 1;
        const done = stage <= cleared;
        const next = stage === cleared + 1;
        const open = done || next;
        const boss = stage === NODES.length;
        const size = boss ? 40 : 30;
        const on = selected === stage;
        return (
          <Pressable
            key={stage}
            disabled={!open}
            onPress={() => onSelect(stage)}
            accessibilityRole="button"
            accessibilityLabel={`Bölüm ${stage}`}
            hitSlop={8}
            style={{
              position: 'absolute', left: (x / 100) * width - size / 2, top: (y / 135) * height - size / 2,
              width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
              backgroundColor: done ? colors.trim : next ? '#1d2a31' : '#151b1f',
              borderWidth: on ? 3 : 2, borderColor: on ? '#ffffff' : next ? colors.trim : done ? '#f4e2ad' : '#3a464d',
              opacity: open ? 1 : 0.55,
              shadowColor: next ? colors.trim : '#000', shadowOpacity: next ? 0.9 : 0.4, shadowRadius: next ? 8 : 3, elevation: next ? 6 : 2,
            }}
          >
            <Text style={{ color: done ? colors.accentInk : open ? colors.text : colors.faint, fontWeight: '900', fontSize: boss ? 15 : 12 }}>
              {boss ? '☠' : done ? '✓' : stage}
            </Text>
            {activeStages.includes(stage) && <View style={{ position: 'absolute', right: -4, top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.warn, borderWidth: 1, borderColor: '#000' }} />}
          </Pressable>
        );
      })}
    </View>
  );
}
