// The gear train behind the friction wheels: several gears of different size connect the two hubs
// so the two wheels look different, yet the overall ratio is exact.
//
// Lower hub gear → compound gear (two gears on one axle) → idler → upper hub gear. All gears have
// the same module (tooth size), so meshing gears stand pitch radius + pitch radius apart. The ratio
// of the train is (10/20)·(36/14)·(14/18) = 1 and three meshes reverse the turn: the upper wheel
// turns by the same angle the other way — exactly what the wheels' model does.
// Angles in radians, clockwise from the top, like the wheels.

import { wheelAngle } from './wheel.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const TOOTH_COUNTS = {
  bottom: 10,
  compoundSmall: 20,
  compoundLarge: 36,
  idler: 14,
  top: 18,
} as const;

export type GearName = 'bottom' | 'compoundSmall' | 'compoundLarge' | 'idler' | 'top';

export interface Gear {
  readonly name: GearName;
  readonly x: number;
  readonly y: number;
  readonly teeth: number;
  /** Pitch radius: module · teeth / 2. */
  readonly pitchRadius: number;
}

export interface GearTrain {
  readonly module: number;
  /** In drawing order from the back: big compound gear, idler, small compound gear, hub gears. */
  readonly gears: readonly Gear[];
}

const pitchRadius = (module: number, teeth: number) => (module * teeth) / 2;

/** The two points at distance ra from a and rb from b (none if the circles do not meet). */
function intersect(a: Point, ra: number, b: Point, rb: number): [Point, Point] | undefined {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) return undefined;
  const l = (ra * ra - rb * rb + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ra * ra - l * l));
  const mx = a.x + (l * (b.x - a.x)) / d;
  const my = a.y + (l * (b.y - a.y)) / d;
  const ox = (-h * (b.y - a.y)) / d;
  const oy = (h * (b.x - a.x)) / d;
  return [
    { x: mx + ox, y: my + oy },
    { x: mx - ox, y: my - oy },
  ];
}

/**
 * The train from the lower hub `bottom` to the upper hub `top`: the module makes the chain a little
 * longer than the way (`zigzag`), so it bends — compound gear to the right, idler to the left.
 */
export function gearTrain(bottom: Point, top: Point, zigzag = 1.12): GearTrain {
  const z = TOOTH_COUNTS;
  const distance = Math.hypot(top.x - bottom.x, top.y - bottom.y);
  const links = (z.bottom + z.compoundSmall + z.compoundLarge + 2 * z.idler + z.top) / 2;
  const module = (distance * zigzag) / links;
  const d1 = pitchRadius(module, z.bottom) + pitchRadius(module, z.compoundSmall);
  const d2 = pitchRadius(module, z.compoundLarge) + pitchRadius(module, z.idler);
  const d3 = pitchRadius(module, z.idler) + pitchRadius(module, z.top);
  const direction = wheelAngle(top.x, top.y, bottom.x, bottom.y);
  // Turn the first link away from the straight way until the rest of the chain closes.
  let compound: Point = { x: bottom.x, y: bottom.y - d1 };
  let idler: Point | undefined;
  for (let degrees = 5; degrees <= 85 && !idler; degrees += 1) {
    const w = direction + (degrees * Math.PI) / 180;
    compound = { x: bottom.x + d1 * Math.sin(w), y: bottom.y - d1 * Math.cos(w) };
    const solutions = intersect(compound, d2, top, d3);
    if (solutions) {
      // the one on the other side of the way: a zigzag, not a hook
      idler = solutions[0].x < solutions[1].x ? solutions[0] : solutions[1];
    }
  }
  const gear = (name: GearName, p: Point): Gear => ({
    name,
    x: p.x,
    y: p.y,
    teeth: z[name],
    pitchRadius: pitchRadius(module, z[name]),
  });
  const idlerAt = idler ?? { x: (compound.x + top.x) / 2, y: (compound.y + top.y) / 2 };
  return {
    module,
    gears: [
      gear('compoundLarge', compound),
      gear('idler', idlerAt),
      gear('compoundSmall', compound),
      gear('bottom', bottom),
      gear('top', top),
    ],
  };
}

/** Tip radius of a gear: pitch radius plus a little less than one module. */
export function tipRadius(gear: Gear, module: number): number {
  return gear.pitchRadius + module * 0.9;
}

/** Root radius of a gear (the bottom of its tooth gaps): pitch radius minus 1.1 modules. */
export function rootRadius(gear: Gear, module: number): number {
  return gear.pitchRadius - module * 1.1;
}

/** Radius of the ring drawn inside a gear (its spokes' ring): 62 % of the root radius. */
export function ringRadius(gear: Gear, module: number): number {
  return rootRadius(gear, module) * 0.62;
}

/** How far a gear turns when the lower hub gear turns by 1 (the sign: its direction). */
export function ratioOf(name: GearName): number {
  const z = TOOTH_COUNTS;
  const compound = -z.bottom / z.compoundSmall;
  const idler = compound * -(z.compoundLarge / z.idler);
  const values: Record<GearName, number> = {
    bottom: 1,
    compoundSmall: compound,
    compoundLarge: compound,
    idler,
    top: idler * -(z.idler / z.top),
  };
  return values[name];
}

/**
 * The gear behind the wheels under the point (x, y) — the one drawn last if several overlap — or
 * none (so the background gears can be turned by hand where they are reachable). Whether the wheels
 * in front cover the point is for the caller to decide.
 */
export function backgroundGearAt(train: GearTrain, x: number, y: number): Gear | undefined {
  return train.gears
    .filter((g) => g.name !== 'bottom' && g.name !== 'top')
    .filter((g) => Math.hypot(x - g.x, y - g.y) <= tipRadius(g, train.module))
    .at(-1);
}

/** Overall ratio upper / lower hub gear (−1 = same angle, other way). */
export function overallRatio(): number {
  const z = TOOTH_COUNTS;
  return -(z.bottom / z.compoundSmall) * -(z.compoundLarge / z.idler) * -(z.idler / z.top);
}

/**
 * Turn of `b` meshing with `a` turned by `turnA`: their pitch circles roll on each other and a
 * tooth of one stands in a gap of the other where they meet.
 */
export function mesh(a: Gear, turnA: number, b: Gear): number {
  const direction = wheelAngle(b.x, b.y, a.x, a.y);
  const pitch = (2 * Math.PI * a.pitchRadius) / a.teeth;
  const arcA = a.pitchRadius * (direction - turnA);
  return direction + Math.PI - (pitch / 2 - arcA) / b.pitchRadius;
}

/** The turn of every gear of the train (same order) when the lower hub gear is turned by `bottom`. */
export function turns(train: GearTrain, bottom: number): number[] {
  const find = (name: GearName) => train.gears.find((g) => g.name === name);
  const b = find('bottom');
  const cs = find('compoundSmall');
  const cl = find('compoundLarge');
  const id = find('idler');
  const t = find('top');
  if (!b || !cs || !cl || !id || !t) return train.gears.map(() => 0);
  const compound = mesh(b, bottom, cs);
  const idler = mesh(cl, compound, id);
  const top = mesh(id, idler, t);
  const values: Record<GearName, number> = {
    bottom,
    compoundSmall: compound,
    compoundLarge: compound,
    idler,
    top,
  };
  return train.gears.map((g) => values[g.name]);
}
