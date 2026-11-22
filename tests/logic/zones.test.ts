// Zones: every point of the wheel screen is in exactly one zone, fixed at pointer-down; the hub
// zone is small enough to leave the teeth for turning; a drag on the teeth turns from the first
// pixels on.
import { describe, expect, it } from 'vitest';
import {
  backgroundGearAt,
  gearTrain,
  ringRadius,
  rootRadius,
  tipRadius,
  type Gear,
} from '../../src/logic/gears.ts';
import { frictionSizes } from '../../src/logic/ring.ts';
import {
  MIN_HUB_RADIUS,
  TAP_SLOP,
  TOUCH_LIFT,
  TURN_SLOP,
  copyPoint,
  dropTarget,
  gesture,
  hubRadius,
  zoneAt,
  type Zone,
  type ZoneGeometry,
} from '../../src/logic/zones.ts';

const SIZES = [
  [390, 700],
  [390, 844],
  [768, 1024],
  [1280, 800],
  [320, 480],
] as const;

/** The geometry as WheelNav builds it. */
function geometryFor(width: number, height: number): ZoneGeometry {
  const { rTop, rBottom, contact, topY, bottomY } = frictionSizes(width, height);
  const cx = width / 2;
  return {
    train: gearTrain({ x: cx, y: bottomY }, { x: cx, y: topY }),
    cx,
    contact,
    topY,
    bottomY,
    rTop,
    rBottom,
    innerTop: rTop * 0.42,
    innerBottom: rBottom * 0.42,
    width,
    height,
  };
}
const gear = (g: ZoneGeometry, name: string) => g.train.gears.find((x) => x.name === name) as Gear;
const KINDS = ['hub', 'turn', 'piece', 'none'];

describe('zones: one zone for every point', () => {
  it('a grid over several screens: every point has exactly one valid zone, the same every time', () => {
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      const seen = new Set<string>();
      // beyond the drawing on every side too
      for (let x = -20; x <= w + 20; x += 7) {
        for (let y = -20; y <= h + 20; y += 7) {
          const z = zoneAt(g, x, y);
          expect(KINDS, `${w}x${h} ${x},${y}`).toContain(z.zone);
          expect(zoneAt(g, x, y)).toEqual(z);
          if (z.zone === 'hub') expect(['bottom', 'top']).toContain(z.hub);
          if (z.zone === 'piece' || z.zone === 'turn') {
            expect(['bottom', 'top', 'behind']).toContain(z.wheel);
          }
          seen.add(z.zone);
        }
      }
      // the grid sees every kind (the hubs are hit by the grid's step only at some sizes)
      for (const kind of ['turn', 'piece', 'none']) expect(seen, `${w}x${h}`).toContain(kind);
    }
  });

  it('the centre of each hub gear (where it is on the screen) is its hub, nothing else', () => {
    let checked = 0;
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      for (const hub of ['bottom', 'top'] as const) {
        const c = gear(g, hub);
        // on a wide screen the upper hub stands above the top edge: then no point of it is touched
        if (c.y < 0 || c.y > h) {
          expect(zoneAt(g, c.x, c.y)).toEqual({ zone: 'none' });
          continue;
        }
        expect(zoneAt(g, c.x, c.y), `${w}x${h} ${hub}`).toEqual({ zone: 'hub', hub });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(SIZES.length);
  });

  it('the hub is smaller than the gear root, at least the minimum or the drawn ring', () => {
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      for (const hub of ['bottom', 'top'] as const) {
        const c = gear(g, hub);
        const r = hubRadius(c, g.train.module);
        expect(r, `${w}x${h} ${hub}`).toBeLessThan(rootRadius(c, g.train.module));
        expect(r).toBeGreaterThanOrEqual(
          Math.min(rootRadius(c, g.train.module) * 0.95, ringRadius(c, g.train.module)),
        );
        expect(r).toBeGreaterThan(0);
        if (rootRadius(c, g.train.module) > MIN_HUB_RADIUS) {
          expect(r).toBeGreaterThanOrEqual(MIN_HUB_RADIUS);
        }
      }
    }
  });

  it('the teeth and the body of a hub gear around the hub only turn, never a hub or a tap', () => {
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      for (const hub of ['bottom', 'top'] as const) {
        const c = gear(g, hub);
        const from = hubRadius(c, g.train.module) + 0.5;
        const to = tipRadius(c, g.train.module);
        for (let r = from; r <= to; r += 3) {
          for (let a = 0; a < 360; a += 15) {
            const x = c.x + r * Math.cos((a * Math.PI) / 180);
            const y = c.y + r * Math.sin((a * Math.PI) / 180);
            const z = zoneAt(g, x, y);
            // the lower gear lies inside the lower wheel's inner hole or on its first ring part:
            // either way never a hub, and never a tap zone inside the ring's hole
            expect(z.zone === 'hub', `${w}x${h} ${hub} r${r} a${a}`).toBe(false);
            if (r < (hub === 'bottom' ? g.innerBottom : g.innerTop) - 1 && z.zone !== 'none') {
              expect(z.zone, `${w}x${h} ${hub} r${r} a${a}`).toBe('turn');
            }
          }
        }
      }
    }
  });

  it('the rings are pieces, the empty middle and the outside are turn', () => {
    const g = geometryFor(390, 844);
    expect(zoneAt(g, g.cx + 5, g.contact - 30)).toEqual({ zone: 'piece', wheel: 'top' });
    expect(zoneAt(g, g.cx + 5, g.contact + 30)).toEqual({ zone: 'piece', wheel: 'bottom' });
    // the empty middle of the upper wheel, away from the hub
    expect(zoneAt(g, g.cx + g.innerTop * 0.8, g.topY)).toEqual({ zone: 'turn', wheel: 'top' });
    expect(zoneAt(g, -5, 10)).toEqual({ zone: 'none' });
    expect(zoneAt(g, 10, 900)).toEqual({ zone: 'none' });
  });

  it('beyond the wheels: a gear behind turns by itself, the bare rest turns the wheel of its half', () => {
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      let behind = 0;
      let bare = 0;
      for (let x = 0; x <= w; x += 4) {
        for (let y = 0; y <= h; y += 4) {
          const free =
            Math.hypot(x - g.cx, y - g.bottomY) > g.rBottom &&
            Math.hypot(x - g.cx, y - g.topY) > g.rTop;
          if (!free) continue;
          const z = zoneAt(g, x, y);
          const hit = backgroundGearAt(g.train, x, y);
          if (hit) {
            // a hub gear is never "behind": its own zones apply
            expect(z).toEqual({ zone: 'turn', wheel: 'behind', gear: hit.name });
            behind += 1;
          } else {
            expect(z.zone).toBe('turn');
            if (z.zone === 'turn') expect(z.wheel).toBe(y < g.contact ? 'top' : 'bottom');
            bare += 1;
          }
        }
      }
      expect(behind + bare, `${w}x${h}`).toBeGreaterThan(0);
    }
  });

  it('the idler inside the upper wheel is no hub and no gear-behind zone', () => {
    const g = geometryFor(390, 844);
    const idler = gear(g, 'idler');
    const z: Zone = zoneAt(g, idler.x, idler.y);
    expect(z.zone).not.toBe('hub');
    expect(z.zone === 'turn' && z.wheel === 'behind').toBe(false);
  });
});

describe('zones: a drag on small radii turns, a hub tap stays a tap', () => {
  it('on the teeth of the lower gear a drag of 5°, 10° or 25° turns from the first pixels', () => {
    for (const [w, h] of SIZES) {
      const g = geometryFor(w, h);
      const c = gear(g, 'bottom');
      const from = hubRadius(c, g.train.module) + 0.5;
      for (const deg of [5, 10, 25]) {
        const arc = (from * deg * Math.PI) / 180;
        // the smallest radius a turn can start on is the hub's edge: even 5° there is a turn
        expect(gesture('turn', arc), `${w}x${h} ${deg}°`).toBe('active');
      }
      expect(gesture('turn', 1)).toBe('pending');
    }
  });

  it('a hub drag of 5° or 10° on the drawn ring is still a tap, 25° grabs', () => {
    const g = geometryFor(390, 844);
    const c = gear(g, 'bottom');
    const r = ringRadius(c, g.train.module);
    const arc = (deg: number) => (r * deg * Math.PI) / 180;
    expect(gesture('hub', arc(5))).toBe('pending');
    expect(gesture('hub', arc(10))).toBe('pending');
    expect(gesture('hub', arc(25))).toBe('active');
    expect(gesture('hub', TAP_SLOP)).toBe('pending');
    expect(gesture('hub', TAP_SLOP + 0.1)).toBe('active');
  });

  it('only the hub and the pieces keep the tap tolerance; the turn zone starts at about 2 px', () => {
    expect(TURN_SLOP).toBeLessThanOrEqual(2);
    expect(gesture('turn', TURN_SLOP)).toBe('active');
    expect(gesture('piece', 5)).toBe('pending');
    expect(gesture('piece', 9)).toBe('active');
  });
});

describe('drop targets', () => {
  const g = geometryFor(390, 844);
  const near = (name: string, dx = 0) => {
    const c = gear(g, name);
    return [c.x + dx, c.y] as const;
  };

  it('the other hub gear takes the drop on its whole area, up to the tip radius', () => {
    const top = gear(g, 'top');
    expect(dropTarget(g.train, 'bottom', ...near('top'))).toBe('top');
    expect(dropTarget(g.train, 'bottom', top.x + tipRadius(top, g.train.module) - 3, top.y)).toBe(
      'top',
    );
    expect(dropTarget(g.train, 'bottom', top.x + tipRadius(top, g.train.module) + 30, top.y)).toBe(
      undefined,
    );
    expect(dropTarget(g.train, 'top', ...near('bottom', 40))).toBe('bottom');
  });

  it('a gear dropped on its own place is no target; the idler deletes', () => {
    expect(dropTarget(g.train, 'bottom', ...near('bottom'))).toBeUndefined();
    expect(dropTarget(g.train, 'top', ...near('idler'))).toBe('delete');
    expect(dropTarget(g.train, 'bottom', ...near('idler', 10))).toBe('delete');
    const idler = gear(g, 'idler');
    expect(
      dropTarget(g.train, 'bottom', idler.x + tipRadius(idler, g.train.module) + 2, idler.y),
    ).toBe(undefined);
  });

  it('the copy rides above a finger and under a mouse', () => {
    expect(copyPoint(100, 300, 'mouse')).toEqual({ x: 100, y: 300 });
    expect(copyPoint(100, 300, 'touch')).toEqual({ x: 100, y: 300 - TOUCH_LIFT });
  });
});
