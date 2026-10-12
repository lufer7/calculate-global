import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { colors } from '../screens/theme';

/**
 * Dependency-free slider (works the same on Android, iOS and web).
 * Drag anywhere on the track; − / + buttons step precisely.
 */
export function Slider({ min, max, step, value, onChange, accessibilityLabel }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; accessibilityLabel?: string;
}) {
  const [width, setWidth] = useState(1);
  const live = useRef({ width, min, max, step, onChange, startValue: value });
  live.current = { ...live.current, width, min, max, step, onChange };
  const snap = (v: number) => {
    const { min: lo, max: hi, step: st } = live.current;
    return Math.max(lo, Math.min(hi, Math.round((v - lo) / st) * st + lo));
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { width: w, min: lo, max: hi } = live.current;
      const v = snap(lo + (e.nativeEvent.locationX / w) * (hi - lo));
      live.current.startValue = v;
      live.current.onChange(v);
    },
    onPanResponderMove: (_e, g) => {
      const { width: w, min: lo, max: hi, startValue } = live.current;
      live.current.onChange(snap(startValue + (g.dx / w) * (hi - lo)));
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const ratio = (value - min) / (max - min || 1);
  const stepBtn = (dir: -1 | 1) => (
    <Pressable onPress={() => onChange(snap(value + dir * step))} hitSlop={6} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Azalt' : 'Artır'}
      style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.trimDim, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inset }}>
      <Text style={{ color: colors.trim, fontSize: 18, fontWeight: '900', marginTop: -2 }}>{dir < 0 ? '−' : '+'}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {stepBtn(-1)}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
        onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
        style={{ flex: 1, height: 36, justifyContent: 'center' }}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: '#00000080', overflow: 'hidden' }}>
          <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: colors.trim }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: ratio * width - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8cc85', borderWidth: 2, borderColor: '#5a4520', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 3, elevation: 3 }} />
      </View>
      {stepBtn(1)}
    </View>
  );
}
