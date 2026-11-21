/** Pixels of mouse-wheel travel that turn the wheels by one page (a usual notch is 100). */
export const PIXELS_PER_PAGE = 100;

const LINE_PIXELS = 34; // 3 lines (a notch in Firefox) just reach one page
const PAGE_PIXELS = 800;

/**
 * Adds a wheel event's travel to what is left over from before and returns the whole pages to turn
 * (positive = forward) and the rest. Fine touchpad deltas add up; a mouse notch is one page.
 * `mode` is `WheelEvent.deltaMode` (0 pixels, 1 lines, 2 pages).
 */
export function wheelSteps(
  rest: number,
  delta: number,
  mode: number,
): { readonly steps: number; readonly rest: number } {
  const pixels = delta * (mode === 1 ? LINE_PIXELS : mode === 2 ? PAGE_PIXELS : 1);
  // a change of direction drops the leftover of the other direction
  const sum = (Math.sign(rest) === -Math.sign(pixels) ? 0 : rest) + pixels;
  const steps = Math.trunc(sum / PIXELS_PER_PAGE) + 0; // + 0: no negative zero
  return { steps, rest: sum - steps * PIXELS_PER_PAGE };
}

/** Pointer this close (px) to a wheel's vertical middle line turns nothing. */
export const DEAD_ZONE = 6;

/**
 * The visual turn (radians, clockwise positive) of a wheel for `steps` notches forward, the mouse
 * wheel laid on from above: scrolling down on the right half turns it anticlockwise, on the left
 * half clockwise. `dx` is the pointer's distance right of the wheel's centre; `pageAngle` the turn
 * of one notch. Zero on the middle line.
 */
export function turnAngle(steps: number, dx: number, pageAngle: number): number {
  if (steps === 0 || Math.abs(dx) < DEAD_ZONE) return 0;
  return -Math.sign(dx) * steps * pageAngle;
}
