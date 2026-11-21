// Drawing units of the wheel, shared by the big wheel and the small one on detail pages: the wheel
// lives in a square of 2 × HALF around its centre. Paths come from `wedgePath` (logic).

export const OUTER = 96;
export const INNER = 36;
export const HALF = 110;

export const pointAt = (angle: number, radius: number) => ({
  x: radius * Math.sin(angle),
  y: -radius * Math.cos(angle),
});
