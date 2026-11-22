import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { NavNode } from '../logic/tree.ts';
import { gesture } from '../logic/zones.ts';
import { throwOff, wheelAngle, angleDiff, momentum } from '../logic/wheel.ts';
import {
  layoutOf,
  groupMiddle,
  pageAtPointer,
  positionForTurn,
  toGroup,
  type Layout,
  type Placement,
} from '../logic/ring.ts';

/** A step of the way: a level shown as rings, an area on it, or a page. */
export interface Step {
  readonly node: NavNode;
  readonly type: 'ring' | 'group' | 'page';
}

/**
 * The way through a tree shown as rings: a tap opens a page of the ring shown (its area joins the
 * way, so the way at the top reads "Start › Training › Today"); a page with pages of its own is
 * shown as rings in turn. Back to an area shows its ring turned to it.
 */
export function useRingPath(
  tree: NavNode,
  position: ReturnType<typeof usePosition>,
  onStep: () => void,
  onPage: (page: string) => void,
  /** A page (index in the top ring's row) open from the start — where the app was. */
  startPage?: number,
) {
  const [path, setPath] = useState<readonly Step[]>(() => {
    const layout0 = layoutOf(tree);
    const s = startPage === undefined ? undefined : layout0.pages[startPage];
    if (!s || s.node.children) return [{ node: tree, type: 'ring' }];
    const g = layout0.groups[s.group];
    return [
      { node: tree, type: 'ring' },
      ...(g && g.node !== s.node ? [{ node: g.node, type: 'group' as const }] : []),
      { node: s.node, type: 'page' },
    ];
  });
  // Where each ring was turned when a deeper one opened — back there it stands as it was.
  const tStack = useRef<number[]>([]);
  let ringIndex = 0;
  path.forEach((s, i) => {
    if (s.type === 'ring') ringIndex = i;
  });
  const ring = path[ringIndex]?.node ?? tree;
  const layout = useMemo(() => layoutOf(ring), [ring]);
  const here = path[path.length - 1] ?? { node: tree, type: 'ring' as const };

  const open = (k: number) => {
    const s = layout.pages[k];
    if (!s) return;
    const g = layout.groups[s.group];
    const next: Step[] = path.slice(0, ringIndex + 1);
    if (g && g.node !== s.node) next.push({ node: g.node, type: 'group' });
    next.push({ node: s.node, type: s.node.children ? 'ring' : 'page' });
    if (s.node.children) {
      tStack.current[ringIndex] = position.now.current;
      position.setT(groupMiddle(layoutOf(s.node), 0));
    }
    setPath(next);
    onStep();
    if (s.node.page) onPage(s.node.page);
  };

  /**
   * Back to step `i`; returns the page left behind when coming back from it to its own ring (it
   * shrinks into its piece).
   */
  const backTo = (i: number): number | undefined => {
    const target = path[i];
    if (!target || i >= path.length - 1) return undefined;
    const toRing = target.type === 'group' ? i - 1 : i;
    const newRing = path[toRing]?.node ?? tree;
    const layoutNew = layoutOf(newRing);
    if (toRing < ringIndex) position.setT(tStack.current[toRing] ?? groupMiddle(layoutNew, 0));
    const page =
      here.type === 'page' && toRing === ringIndex
        ? layoutNew.pages.findIndex((s) => s.node === here.node)
        : -1;
    setPath(path.slice(0, toRing + 1));
    onStep();
    if (target.type === 'group') {
      const gi = layoutNew.groups.findIndex((g) => g.node === target.node);
      const stands = layoutNew.pages[pageAtPointer(layoutNew, position.now.current)]?.group === gi;
      if (gi >= 0 && !stands) position.glide(toGroup(layoutNew, gi, position.now.current));
    }
    return page >= 0 ? page : undefined;
  };

  /** Another page of the same area in place of the open one (a swipe); the wheel turns along. */
  const change = (node: NavNode) => {
    const k = layout.pages.findIndex((s) => s.node === node);
    if (k < 0 || here.type !== 'page') return;
    position.setT(k);
    setPath([...path.slice(0, -1), { node, type: 'page' }]);
    onStep();
    if (node.page) onPage(node.page);
  };

  return { path, here, ring, ringIndex, layout, open, backTo, change };
}

/**
 * Position `t` (in pages) of the wheels with two rings: glide to a place, run on after a flick and
 * settle. One position turns both rings — and both coupled wheels.
 */
export function usePosition(reducedMotion: boolean, initial = 0) {
  const [t, setTState] = useState(initial);
  const now = useRef(initial);
  const run = useRef<number | undefined>(undefined);
  const setT = useCallback((value: number) => {
    now.current = value;
    setTState(value);
  }, []);
  const stop = useCallback(() => {
    if (run.current !== undefined) cancelAnimationFrame(run.current);
    run.current = undefined;
  }, []);
  useEffect(() => stop, [stop]);

  const glide = (target: number, ms = 200) => {
    stop();
    if (reducedMotion) {
      setT(target);
      return;
    }
    const from = now.current;
    let begin: number | undefined;
    const step = (time: number) => {
      begin ??= time;
      const share = Math.min(1, (time - begin) / ms);
      setT(from + (target - from) * (1 - (1 - share) ** 3));
      run.current = share < 1 ? requestAnimationFrame(step) : undefined;
    };
    run.current = requestAnimationFrame(step);
  };

  /** Runs on with `v` (pages/ms, at most `vMax`), then settles where `snap` says. */
  const coast = (v: number, vMax: number, snap: (t: number) => number) => {
    stop();
    if (reducedMotion) {
      glide(snap(now.current));
      return;
    }
    let speed = Math.max(-vMax, Math.min(vMax, v));
    let last: number | undefined;
    const step = (time: number) => {
      const s = momentum(now.current, speed, last === undefined ? 16 : time - last);
      last = time;
      speed = s.v;
      setT(s.turn);
      if (speed === 0) glide(snap(now.current), 160);
      else run.current = requestAnimationFrame(step);
    };
    run.current = requestAnimationFrame(step);
  };

  return { t, now, setT, stop, glide, coast };
}

/** A change between page and wheel in progress: what `move` describes, how far (`p`, 0 … 1). */
export function useProgress<M>(reducedMotion: boolean) {
  const [state, setState] = useState<{ move: M; p: number } | null>(null);
  const run = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (run.current !== undefined) cancelAnimationFrame(run.current);
    },
    [],
  );
  const start = (move: M, ms: number, after?: () => void) => {
    if (run.current !== undefined) cancelAnimationFrame(run.current);
    if (reducedMotion) {
      setState(null);
      after?.();
      return;
    }
    setState({ move, p: 0 });
    let begin: number | undefined;
    const step = (time: number) => {
      begin ??= time;
      const p = Math.min(1, (time - begin) / ms);
      if (p < 1) {
        setState({ move, p });
        run.current = requestAnimationFrame(step);
        return;
      }
      run.current = undefined;
      setState(null);
      after?.();
    };
    run.current = requestAnimationFrame(step);
  };
  return { state, start };
}

/** One wheel a finger may hold: centre, how it lies, where it settles, what a tap does. */
export interface GripWheel {
  readonly cx: number;
  readonly cy: number;
  readonly placement: Placement;
  /** `piece`: a short touch is a tap on it; `turn`: it only turns (no tap action, no grab). */
  readonly zone: 'turn' | 'piece';
  readonly snap: (t: number) => number;
  /** What a tap does (a `turn` zone has none). */
  readonly tap: (angle: number, distance: number) => void;
  /** How far t moves for a turn of the finger by `angle` (a gear behind turns at its ratio). */
  readonly dt?: (angle: number) => number;
}

interface Grip {
  readonly id: number;
  readonly wheel: GripWheel;
  /** The finger's angle at the last move; until the turn starts, the angle at pointer-down. */
  last: number;
  readonly x: number;
  readonly y: number;
  readonly since: number;
  far: boolean;
  samples: { t: number; turn: number }[];
}

/**
 * Pointer handling for wheels in one SVG drawn in pixels: `wheelAt` says which wheel a finger at
 * (x, y) holds. Turning moves t with the finger, a short touch is a tap.
 */
export function useGrip(
  layout: Layout,
  position: ReturnType<typeof usePosition>,
  wheelAt: (x: number, y: number) => GripWheel | undefined,
  locked: boolean,
) {
  const grip = useRef<Grip | null>(null);
  const point = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return {
    /** True while a finger holds a wheel. */
    busy: () => grip.current !== null,
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      if (locked) return;
      const { x, y } = point(e);
      const wheel = wheelAt(x, y);
      if (!wheel) return;
      position.stop();
      const g: Grip = {
        id: e.pointerId,
        wheel,
        last: wheelAngle(x, y, wheel.cx, wheel.cy),
        x,
        y,
        since: e.timeStamp,
        far: false,
        samples: [{ t: e.timeStamp, turn: position.now.current }],
      };
      grip.current = g;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const g = grip.current;
      if (!g || g.id !== e.pointerId) return;
      const { x, y } = point(e);
      if (!g.far && gesture(g.wheel.zone, Math.hypot(x - g.x, y - g.y)) === 'active') g.far = true;
      if (g.far) {
        // The turn counts from the angle at pointer-down: nothing of the first pixels is lost.
        const angle = wheelAngle(x, y, g.wheel.cx, g.wheel.cy);
        // Near a centre the angle jumps: turn only with the finger well away from it.
        if (Math.hypot(x - g.wheel.cx, y - g.wheel.cy) > 30) {
          const d = angleDiff(g.last, angle);
          position.setT(
            position.now.current +
              (g.wheel.dt ? g.wheel.dt(d) : positionForTurn(layout, d, g.wheel.placement)),
          );
        }
        g.last = angle;
      }
      g.samples = [
        ...g.samples.filter((p) => e.timeStamp - p.t < 100),
        { t: e.timeStamp, turn: position.now.current },
      ];
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => {
      const g = grip.current;
      // another finger lifted: the one turning keeps its grip and still settles
      if (!g || g.id !== e.pointerId) return;
      grip.current = null;
      const { x, y } = point(e);
      if (!g.far && g.wheel.zone === 'turn') {
        // a touch on the turn zone: no action, but a wheel that was running on settles
        position.glide(g.wheel.snap(position.now.current), 160);
        return;
      }
      if (!g.far && e.timeStamp - g.since < 500) {
        g.wheel.tap(
          wheelAngle(x, y, g.wheel.cx, g.wheel.cy),
          Math.hypot(x - g.wheel.cx, y - g.wheel.cy),
        );
        return;
      }
      const v = throwOff(g.samples, e.timeStamp);
      const w = (2 * Math.PI) / Math.max(1, layout.pages.length);
      // At most about half a turn of running on: a menu, not a game of chance.
      if (Math.abs(v) * w < 0.0008) position.glide(g.wheel.snap(position.now.current), 160);
      else position.coast(v, 0.015 / w, g.wheel.snap);
    },
    onPointerCancel: () => {
      const g = grip.current;
      grip.current = null;
      if (g) position.glide(g.wheel.snap(position.now.current), 160);
    },
  };
}
