// A wheel to choose from a list: field i is centred at i·w + turn (0 = top, clockwise); the one at
// the top is chosen.
import { fieldWidth } from './wheel.ts';

const FULL = 2 * Math.PI;

/** The field standing at the top when the wheel is turned by `turn`. */
export function topIndex(turn: number, n: number): number {
  if (n <= 0) return 0;
  const i = Math.round(-turn / fieldWidth(n));
  return ((i % n) + n) % n;
}

/** The turn that brings field `i` to the top, the nearest one from `turn` (no extra round). */
export function turnFor(i: number, n: number, turn: number): number {
  const target = -i * fieldWidth(n);
  return target + Math.round((turn - target) / FULL) * FULL;
}
