// Where a finger or pointer is on the wheel screen, as ONE zone. Every point belongs to exactly one
// zone, decided once at pointer-down and kept until pointer-up, so tap, grab and turn can never
// fight over the same spot:
//
//  - hub:   the ring drawn inside a hub gear. A tap is the hub's shortcut, a drag grabs the gear. It
//           never turns the wheel.
//  - turn:  gear teeth and body, the rest of a wheel's disc and the space around it, the empty middle
//           of the upper wheel, the gears behind: turning only. Never a tap action, never a grab.
//  - piece: a piece of a ring: a tap opens the page / brings the area to the contact, a drag turns.
//  - none:  outside the drawing.
//
// UI-free: the caller passes the geometry of the screen.

import {
  backgroundGearAt,
  ringRadius,
  rootRadius,
  tipRadius,
  type Gear,
  type GearName,
  type GearTrain,
} from './gears.ts';

export type Hub = 'bottom' | 'top';

/** Where the wheels stand (the numbers of `frictionSizes` plus the inner radii of the rings). */
export interface ZoneGeometry {
  readonly train: GearTrain;
  readonly cx: number;
  readonly contact: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly rTop: number;
  readonly rBottom: number;
  readonly innerTop: number;
  readonly innerBottom: number;
  /** Size of the drawing; points outside it belong to no zone. Without it everything is inside. */
  readonly width?: number;
  readonly height?: number;
}

export type Zone =
  | { readonly zone: 'hub'; readonly hub: Hub }
  | {
      readonly zone: 'turn';
      readonly wheel: Hub | 'behind';
      /** The gear behind that is turned (only with `wheel: 'behind'`). */
      readonly gear?: GearName;
    }
  | { readonly zone: 'piece'; readonly wheel: Hub }
  | { readonly zone: 'none' };

export type ZoneKind = Zone['zone'];

/** Smallest radius (px) of a hub, so a finger can hit it. */
export const MIN_HUB_RADIUS = 32;
/** Movement (px) inside a hub or a piece that is still a tap; beyond it a grab or a turn. */
export const TAP_SLOP = 8;
/** Movement (px) on the turn zone from which the wheel follows (it has no tap to tell apart). */
export const TURN_SLOP = 2;

/**
 * Radius of a hub gear's hit zone: the drawn ring inside the gear, at least `MIN_HUB_RADIUS`, but
 * always smaller than the gear's root radius (the teeth stay for turning).
 */
export function hubRadius(gear: Gear, module: number): number {
  return Math.min(
    rootRadius(gear, module) * 0.95,
    Math.max(ringRadius(gear, module), MIN_HUB_RADIUS),
  );
}

const gearOf = (train: GearTrain, name: GearName) => train.gears.find((g) => g.name === name);

/** The one zone of the point (x, y). */
export function zoneAt(g: ZoneGeometry, x: number, y: number): Zone {
  if (
    (g.width !== undefined && (x < 0 || x > g.width)) ||
    (g.height !== undefined && (y < 0 || y > g.height))
  ) {
    return { zone: 'none' };
  }
  for (const hub of ['bottom', 'top'] as const) {
    const gear = gearOf(g.train, hub);
    if (gear && Math.hypot(x - gear.x, y - gear.y) <= hubRadius(gear, g.train.module)) {
      return { zone: 'hub', hub };
    }
  }
  // Gears behind, where neither wheel covers them, turn too (by their own ratio).
  const free =
    Math.hypot(x - g.cx, y - g.bottomY) > g.rBottom && Math.hypot(x - g.cx, y - g.topY) > g.rTop;
  const behind = free ? backgroundGearAt(g.train, x, y) : undefined;
  if (behind) return { zone: 'turn', wheel: 'behind', gear: behind.name };
  const upper = y < g.contact;
  const distance = Math.hypot(x - g.cx, y - (upper ? g.topY : g.bottomY));
  const inner = upper ? g.innerTop : g.innerBottom;
  const outer = upper ? g.rTop : g.rBottom;
  const wheel = upper ? 'top' : 'bottom';
  return distance >= inner && distance <= outer
    ? { zone: 'piece', wheel }
    : { zone: 'turn', wheel };
}

/**
 * Has a pointer that moved `moved` px since pointer-down left the tap? In a hub or a piece a tap may
 * wobble by `TAP_SLOP`; on the turn zone there is no tap, so the wheel follows from `TURN_SLOP` on.
 */
export function gesture(zone: ZoneKind, moved: number): 'pending' | 'active' {
  return (zone === 'turn' ? moved >= TURN_SLOP : moved > TAP_SLOP) ? 'active' : 'pending';
}

/** What a dragged hub gear is dropped on: the other hub gear, the idler (delete), or nothing. */
export type DropTarget = Hub | 'delete';

/**
 * The drop target under the point (x, y) for a gear dragged from `from`: the whole other hub gear
 * (up to its tip radius), or the idler gear (delete). Where tips overlap, the nearer centre wins.
 */
export function dropTarget(
  train: GearTrain,
  from: Hub,
  x: number,
  y: number,
): DropTarget | undefined {
  const other: Hub = from === 'bottom' ? 'top' : 'bottom';
  const candidates: [DropTarget, Gear | undefined][] = [
    [other, gearOf(train, other)],
    ['delete', gearOf(train, 'idler')],
  ];
  let best: DropTarget | undefined;
  let share = Infinity;
  for (const [target, gear] of candidates) {
    if (!gear) continue;
    const s = Math.hypot(x - gear.x, y - gear.y) / tipRadius(gear, train.module);
    if (s <= 1 && s < share) {
      share = s;
      best = target;
    }
  }
  return best;
}

/** How far (px) the copy of a grabbed gear rides above a finger, so the finger does not hide it. */
export const TOUCH_LIFT = 56;

/** Where the copy of a grabbed gear is drawn: under a mouse pointer, a little above a finger. */
export function copyPoint(x: number, y: number, pointerType: string): { x: number; y: number } {
  return pointerType === 'mouse' ? { x, y } : { x, y: y - TOUCH_LIFT };
}
