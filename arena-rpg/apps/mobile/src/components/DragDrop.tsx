import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import type { ViewStyle } from 'react-native';

/**
 * Small drag & drop kit for the bag and paper doll.
 * Hold an item for a moment to pick it up (a quick tap still opens the item sheet,
 * and a quick swipe still scrolls the page), drag it, drop it on a zone.
 */
type Rect = { x: number; y: number; w: number; h: number };

interface DragApi<P> {
  begin: (payload: P, ghost: ReactNode, size: number, winX: number, winY: number) => void;
  move: (winX: number, winY: number) => void;
  end: (winX: number, winY: number) => void;
  cancel: () => void;
  zone: (id: string) => (v: View | null) => void;
  over: string | null;
  dragging: P | null;
  canDrop: (id: string) => boolean;
}

const Ctx = createContext<DragApi<unknown> | null>(null);

export function DragArea<P>({ children, onDrop, accepts, onDragChange, style }: {
  children: ReactNode;
  onDrop: (payload: P, zoneId: string) => void;
  accepts: (payload: P, zoneId: string) => boolean;
  onDragChange?: (dragging: boolean) => void;
  style?: ViewStyle;
}) {
  const root = useRef<View>(null);
  const zones = useRef(new Map<string, View>());
  const rects = useRef(new Map<string, Rect>());
  const origin = useRef({ x: 0, y: 0 });
  const half = useRef(0);
  const pos = useRef(new Animated.ValueXY()).current;
  const [drag, setDrag] = useState<{ payload: P; ghost: ReactNode; size: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const overRef = useRef<string | null>(null);
  const live = useRef({ onDrop, accepts, onDragChange, payload: null as P | null });
  live.current.onDrop = onDrop;
  live.current.accepts = accepts;
  live.current.onDragChange = onDragChange;

  const api = useMemo<DragApi<P>>(() => {
    const hit = (x: number, y: number): string | null => {
      const p = live.current.payload;
      if (p === null) return null;
      let best: string | null = null;
      for (const [id, r] of rects.current) {
        if (x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6 && live.current.accepts(p, id)) {
          // prefer the smallest zone (a slot inside the doll wins over the doll)
          if (!best || r.w * r.h < rects.current.get(best)!.w * rects.current.get(best)!.h) best = id;
        }
      }
      return best;
    };
    const place = (x: number, y: number) => pos.setValue({ x: x - origin.current.x - half.current, y: y - origin.current.y - half.current });
    const setOverId = (id: string | null) => {
      if (overRef.current !== id) {
        overRef.current = id;
        setOver(id);
      }
    };
    const stop = () => {
      live.current.payload = null;
      setDrag(null);
      setOverId(null);
      live.current.onDragChange?.(false);
    };
    return {
      begin: (payload, ghost, size, x, y) => {
        live.current.payload = payload;
        half.current = size / 2;
        rects.current.clear();
        root.current?.measureInWindow((rx, ry) => {
          origin.current = { x: rx, y: ry };
          place(x, y);
        });
        for (const [id, v] of zones.current) v.measureInWindow((zx, zy, w, h) => rects.current.set(id, { x: zx, y: zy, w, h }));
        place(x, y);
        setDrag({ payload, ghost, size });
        live.current.onDragChange?.(true);
      },
      move: (x, y) => {
        place(x, y);
        setOverId(hit(x, y));
      },
      end: (x, y) => {
        const p = live.current.payload;
        const id = hit(x, y);
        stop();
        if (p !== null && id) live.current.onDrop(p, id);
      },
      cancel: stop,
      zone: (id) => (v) => {
        if (v) zones.current.set(id, v);
        else zones.current.delete(id);
      },
      over: null,
      dragging: null,
      canDrop: () => false,
    };
  }, [pos]);

  const value = useMemo<DragApi<P>>(() => ({
    ...api,
    over,
    dragging: drag?.payload ?? null,
    canDrop: (id) => (drag ? live.current.accepts(drag.payload, id) : false),
  }), [api, over, drag]);

  return (
    <Ctx.Provider value={value as DragApi<unknown>}>
      <View ref={root} collapsable={false} style={style}>
        {children}
        {drag && (
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 100, elevation: 12, opacity: 0.92, transform: [...pos.getTranslateTransform(), { scale: 1.15 }], shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 8 }}
          >
            {drag.ghost}
          </Animated.View>
        )}
      </View>
    </Ctx.Provider>
  );
}

export function useDrag<P>() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDrag outside DragArea');
  return ctx as DragApi<P>;
}

/** A drop target; highlights while a droppable item hovers over it. */
export function DropZone({ id, children, style, round }: { id: string; children: ReactNode; style?: ViewStyle; round?: number }) {
  const dd = useDrag();
  const can = dd.dragging !== null && dd.canDrop(id);
  const hot = dd.over === id;
  return (
    <View ref={dd.zone(id)} collapsable={false} testID={`drop-${id}`} style={style}>
      {children}
      {can && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: -3, right: -3, top: -3, bottom: -3, borderRadius: round ?? 8, borderWidth: 2, borderStyle: hot ? 'solid' : 'dashed', borderColor: hot ? '#ffe9a8' : '#c9a55c99', backgroundColor: hot ? '#ffe9a822' : 'transparent' }}
        />
      )}
    </View>
  );
}

const HOLD_MS = 220;

/** Hold to pick up; a plain tap calls onTap. */
export function Draggable<P>({ payload, size, children, onTap, accessibilityLabel }: {
  payload: P; size: number; children: ReactNode; onTap: () => void; accessibilityLabel?: string;
}) {
  const dd = useDrag<P>();
  const self = useRef<View>(null);
  const st = useRef<{ timer: ReturnType<typeof setTimeout> | null; active: boolean; moved: boolean; offset: { x: number; y: number } }>({ timer: null, active: false, moved: false, offset: { x: 0, y: 0 } });
  const latest = useRef({ payload, children, size, onTap, dd });
  latest.current = { payload, children, size, onTap, dd };
  const [lifted, setLifted] = useState(false);

  const responder = useMemo(() => {
    const clear = () => {
      if (st.current.timer) clearTimeout(st.current.timer);
      st.current.timer = null;
    };
    // Finger position in window coordinates: page coords plus a per-gesture calibration.
    const win = (pageX: number, pageY: number) => ({ x: pageX + st.current.offset.x, y: pageY + st.current.offset.y });
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => st.current.active,
      onShouldBlockNativeResponder: () => false,
      onPanResponderTerminationRequest: () => !st.current.active,
      onPanResponderGrant: (e) => {
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        st.current.moved = false;
        st.current.offset = { x: 0, y: 0 };
        self.current?.measureInWindow((x, y) => {
          st.current.offset = { x: x + locationX - pageX, y: y + locationY - pageY };
        });
        clear();
        st.current.timer = setTimeout(() => {
          st.current.timer = null;
          st.current.active = true;
          setLifted(true);
          const p = win(pageX, pageY);
          const l = latest.current;
          l.dd.begin(l.payload, l.children, l.size, p.x, p.y);
        }, HOLD_MS);
      },
      onPanResponderMove: (e, g) => {
        if (st.current.active) {
          const p = win(e.nativeEvent.pageX, e.nativeEvent.pageY);
          latest.current.dd.move(p.x, p.y);
        } else if (Math.abs(g.dx) + Math.abs(g.dy) > 8) {
          st.current.moved = true;
          clear();
        }
      },
      onPanResponderRelease: (e) => {
        clear();
        if (st.current.active) {
          st.current.active = false;
          setLifted(false);
          const p = win(e.nativeEvent.pageX, e.nativeEvent.pageY);
          latest.current.dd.end(p.x, p.y);
        } else if (!st.current.moved) {
          latest.current.onTap();
        }
      },
      onPanResponderTerminate: () => {
        clear();
        if (st.current.active) {
          st.current.active = false;
          setLifted(false);
          latest.current.dd.cancel();
        }
      },
    });
  }, []);

  return (
    <View ref={self} collapsable={false} accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={{ opacity: lifted ? 0.3 : 1 }} {...responder.panHandlers}>
      {children}
    </View>
  );
}
