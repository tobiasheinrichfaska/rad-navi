// Wheel geometry for the navigation (a spinning wheel that grew into the friction wheels): angles,
// field pieces and their paths, unfolding, running on after a flick, gears. Angles in radians,
// 0 = top, clockwise positive; `turn` = how far a wheel is turned.

const FULL = 2 * Math.PI;

/** Angle of the point (x, y) seen from the centre (cx, cy): 0 at the top, clockwise, (-π, π]. */
export function wheelAngle(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(x - cx, cy - y);
}

/** The shortest signed turn from `from` to `to`, in (-π, π]. */
export function angleDiff(from: number, to: number): number {
  const d = (((to - from) % FULL) + FULL) % FULL;
  return d > Math.PI ? d - FULL : d;
}

/** Width of one field. */
export function fieldWidth(n: number): number {
  return FULL / n;
}

/** Centre angle of field `i` when the wheel is turned by `turn`. */
export function fieldMiddle(i: number, turn: number, n: number): number {
  return i * fieldWidth(n) + turn;
}

/** One field as drawn: centre angle and width. */
export interface Wedge {
  readonly middle: number;
  readonly width: number;
}

export function fieldWedge(i: number, turn: number, n: number): Wedge {
  return { middle: fieldMiddle(i, turn, n), width: fieldWidth(n) };
}

/** Ease in and out (cubic) for the morphing between levels. */
export function smooth(p: number): number {
  const q = Math.min(1, Math.max(0, p));
  return q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2;
}

/**
 * The `n` fields of a level unfolding out of the field `source` it was opened from (a smooth morph
 * between levels): at p = 0 they share `source` in order, at p = 1 they stand as the wheel turned by
 * `turn`. They stay side by side all the way, the group turns the shorter way.
 */
export function unfold(source: Wedge, n: number, turn: number, p: number): Wedge[] {
  const targetWidth = fieldWidth(n);
  const targetMiddle = turn + ((n - 1) / 2) * targetWidth;
  const group = source.middle + angleDiff(source.middle, targetMiddle) * p;
  const width = source.width / n + (targetWidth - source.width / n) * p;
  return Array.from({ length: n }, (_, j) => ({
    middle: group + (j - (n - 1) / 2) * width,
    width,
  }));
}

const num = (x: number) => (Math.abs(x) < 5e-4 ? '0' : x.toFixed(3).replace(/\.?0+$/, ''));

/**
 * SVG path of a field: a ring piece between `inner` and `outer`. Arcs are drawn in pieces of at
 * most a quarter turn — a half circle as one arc lets a renderer pick either side when rounding
 * puts the ends a hair past 180°, and a full ring (a field growing over the wheel) has no arc at all.
 */
export function wedgePath(w: Wedge, outer: number, inner: number): string {
  const width = Math.min(w.width, 2 * Math.PI);
  if (width <= 0) return '';
  const pieces = Math.max(1, Math.ceil(width / (Math.PI / 2) - 1e-9));
  const step = width / pieces;
  const from = w.middle - width / 2;
  const xy = (angle: number, r: number) =>
    `${num(r * Math.sin(angle))} ${num(-r * Math.cos(angle))}`;
  const parts = [`M${xy(from, outer)}`];
  for (let s = 1; s <= pieces; s += 1) {
    parts.push(`A${outer} ${outer} 0 0 1 ${xy(from + s * step, outer)}`);
  }
  parts.push(`L${xy(from + width, inner)}`);
  for (let s = pieces - 1; s >= 0; s -= 1) {
    parts.push(`A${inner} ${inner} 0 0 0 ${xy(from + s * step, inner)}`);
  }
  return `${parts.join(' ')}Z`;
}

/**
 * SVG path of a gear around (0, 0) with `teeth` teeth from `root` to `tip` radius, one tooth
 * centred at the top (equal teeth, equal turn).
 */
export function gearPath(teeth: number, root: number, tip: number): string {
  const pitch = (2 * Math.PI) / teeth;
  const xy = (angle: number, r: number) =>
    `${num(r * Math.sin(angle))} ${num(-r * Math.cos(angle))}`;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const middle = i * pitch;
    // a tooth a little narrower at its tip than at its root, the gap as wide as the tooth
    parts.push(
      `${i === 0 ? 'M' : 'L'}${xy(middle - pitch * 0.27, root)}`,
      `L${xy(middle - pitch * 0.17, tip)}`,
      `L${xy(middle + pitch * 0.17, tip)}`,
      `L${xy(middle + pitch * 0.27, root)}`,
    );
  }
  return `${parts.join(' ')}Z`;
}

/**
 * Speed (rad/ms) at the moment the finger lets go, from the turns of the last `window` ms. A
 * finger that rested before letting go throws nothing (regression: the wheel ran on with the speed
 * of moves made before the rest).
 */
export function throwOff(
  samples: readonly { readonly t: number; readonly turn: number }[],
  release: number,
  window = 100,
): number {
  const fresh = samples.filter((p) => release - p.t <= window);
  const first = fresh[0];
  const last = fresh[fresh.length - 1];
  if (!first || !last || last.t - first.t <= 0) return 0;
  return (last.turn - first.turn) / (last.t - first.t);
}

/**
 * One step of the wheel running on after a flick: speed `v` (rad/ms) falls by `friction` per ms.
 * Returns the new turn and speed; speed 0 once below `stop`.
 */
export function momentum(
  turn: number,
  v: number,
  ms: number,
  friction = 0.004,
  stop = 0.0004,
): { turn: number; v: number } {
  const further = v * Math.exp(-friction * ms);
  return { turn: turn + (v - further) / friction, v: Math.abs(further) < stop ? 0 : further };
}
