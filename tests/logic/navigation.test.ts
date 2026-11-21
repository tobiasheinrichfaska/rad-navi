// Wheel geometry, the coupled friction wheels, the gear train between them, the swipe and the
// choice wheel. Ported 1:1 from the original suite apart from names and the test tree.
import { describe, expect, it } from 'vitest';
import {
  angleDiff,
  fieldWedge,
  fieldWidth,
  gearPath,
  momentum,
  smooth,
  throwOff,
  unfold,
  wedgePath,
  wheelAngle,
  type Wedge,
} from '../../src/logic/wheel.ts';
import {
  TOOTH_COUNTS,
  backgroundGearAt,
  gearTrain,
  overallRatio,
  ratioOf,
  tipRadius,
  turns,
  type Gear,
} from '../../src/logic/gears.ts';
import {
  TOP,
  frictionSizes,
  fontSizeForRay,
  groupMiddle,
  groupUnder,
  groupWedge,
  layoutOf,
  pageAtPointer,
  pageUnder,
  pageWedge,
  pageWidth,
  positionForTurn,
  rayTextRotation,
  snapToGroup,
  snapToPage,
  swipe,
  toGroup,
  type Placement,
} from '../../src/logic/ring.ts';
import { topIndex, turnFor } from '../../src/logic/picker.ts';
import { distributor, type NavNode } from '../../src/logic/tree.ts';
import { evenTree } from './fixtures.ts';

describe('wheel geometry', () => {
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it('angles: 0 at the top, clockwise', () => {
    near(wheelAngle(0, -10, 0, 0), 0);
    near(wheelAngle(10, 0, 0, 0), Math.PI / 2);
    near(wheelAngle(-10, 0, 0, 0), -Math.PI / 2);
    near(Math.abs(wheelAngle(0, 10, 0, 0)), Math.PI);
  });

  it('shortest turn across the top', () => {
    near(angleDiff(0.1, -0.1), -0.2);
    near(angleDiff(3, -3), 2 * Math.PI - 6);
    near(angleDiff(0, 7 * Math.PI), Math.PI);
  });

  it('a flick runs on and stops', () => {
    let run = { turn: 0, v: 0.01 };
    let steps = 0;
    while (run.v !== 0 && steps < 1000) {
      run = momentum(run.turn, run.v, 16);
      steps += 1;
    }
    expect(run.v).toBe(0);
    expect(run.turn).toBeGreaterThan(2);
    expect(run.turn).toBeLessThan(0.01 / 0.004);
    expect(momentum(1, 0, 16)).toEqual({ turn: 1, v: 0 });
  });

  it('morph: the fields unfold out of the field opened, side by side, into the wheel', () => {
    const source = fieldWedge(5, 0.3, 8);
    const start = unfold(source, 3, 0, 0);
    // p = 0: three equal pieces that fill the source field exactly.
    near(start[0]?.middle ?? 0, source.middle - source.width / 3);
    near(start[2]?.middle ?? 0, source.middle + source.width / 3);
    near(
      start.reduce((s, k) => s + k.width, 0),
      source.width,
    );
    // p = 1: the wheel turned by `turn`.
    unfold(source, 3, 0.2, 1).forEach((k, j) => {
      near(angleDiff(k.middle, fieldWedge(j, 0.2, 3).middle), 0);
      near(k.width, fieldWidth(3));
    });
    // In between they touch and keep their order.
    const between = unfold(source, 4, 0, 0.5);
    for (let j = 1; j < 4; j += 1) {
      const a = between[j - 1] as Wedge;
      const b = between[j] as Wedge;
      near(b.middle - a.middle, (a.width + b.width) / 2);
    }
    // A page opening: one field growing over the whole ring around its own centre.
    const full = unfold(source, 1, source.middle, 1)[0] as Wedge;
    near(angleDiff(full.middle, source.middle), 0);
    near(full.width, 2 * Math.PI);
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBe(0.5);
    expect(smooth(2)).toBe(1);
  });

  it('a field path never draws an arc of half a turn or more (regression: curves flipping)', () => {
    const arcs = (path: string) => path.match(/A[^A-Z]+/g) ?? [];
    for (const width of [0.3, Math.PI / 2, Math.PI, Math.PI + 1e-12, 4, 2 * Math.PI]) {
      const path = wedgePath({ middle: 1.1, width }, 96, 36);
      // every arc: small-arc flag 0, at most a quarter turn
      for (const arc of arcs(path)) expect(arc).toMatch(/^A\d+ \d+ 0 0 [01] /);
      const pieces = Math.ceil(width / (Math.PI / 2) - 1e-9);
      expect(arcs(path)).toHaveLength(2 * pieces);
    }
    // A half circle (wheel with two fields) is drawn as two quarter arcs per side.
    expect(arcs(wedgePath({ middle: 0, width: Math.PI }, 96, 36))).toHaveLength(4);
    expect(wedgePath({ middle: 0, width: 0 }, 96, 36)).toBe('');
    // Ends where it should: outer start at the left edge of the field.
    expect(
      wedgePath({ middle: 0, width: Math.PI / 2 }, 100, 40).startsWith('M-70.711 -70.711'),
    ).toBe(true);
  });

  it('letting go after a rest throws nothing (regression: the wheel ran on)', () => {
    // A quarter turn in 480 ms, the last sample at 480 ms.
    const samples = Array.from({ length: 13 }, (_, i) => ({ t: i * 40, turn: (i / 12) * 1.5708 }));
    const moving = samples.filter((p) => p.t >= 400);
    expect(throwOff(moving, 490)).toBeGreaterThan(0.003);
    // The finger rested 150 ms, then let go: no speed.
    expect(throwOff(moving, 630)).toBe(0);
    // The old way (moves counted whenever they were) would have thrown it on.
    expect(throwOff(moving, 630, Infinity)).toBeGreaterThan(0.003);
    expect(throwOff([], 10)).toBe(0);
    expect(throwOff([{ t: 5, turn: 1 }], 10)).toBe(0);
  });
});

describe('friction wheels', () => {
  const layout = layoutOf(evenTree());
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it('areas need not have three pages: an area below is as wide as its pages above', () => {
    // an area may hold 2 pages and another 4
    const page = (id: string): NavNode => ({ id, name: id, page: 'p' });
    const uneven = layoutOf(
      distributor('start', 'Start', [
        distributor('a', 'A', [page('a1'), page('a2')]),
        distributor('b', 'B', [page('b1'), page('b2'), page('b3'), page('b4')]),
        distributor('c', 'C', [page('c1'), page('c2'), page('c3')]),
      ]),
    );
    const w = pageWidth(uneven);
    near(w, (2 * Math.PI) / 9);
    expect(uneven.groups.map((g) => [g.start, g.count])).toEqual([
      [0, 2],
      [2, 4],
      [6, 3],
    ]);
    // each area below spans exactly the angle of its pages above
    uneven.groups.forEach((g, i) => {
      const area = groupWedge(uneven, i, 0);
      near(area.width, g.count * w);
      const first = pageWedge(uneven, g.start, 0);
      const last = pageWedge(uneven, g.start + g.count - 1, 0);
      near(first.middle - w / 2, area.middle - area.width / 2);
      near(last.middle + w / 2, area.middle + area.width / 2);
    });
    // settling on the areas still finds each middle (B: between its second and third page)
    expect(toGroup(uneven, 1, 0)).toBe(3.5);
    expect(snapToGroup(uneven, 3.2)).toBe(3.5);
  });

  it('an area covers exactly its pages, at the pointer when t is its middle', () => {
    const t = 4; // the middle of area 1
    const area = groupWedge(layout, 1, t);
    near(area.middle, 0);
    const pages = [3, 4, 5].map((k) => pageWedge(layout, k, t));
    near(pages[0]?.middle ?? 0, -pageWidth(layout));
    near((pages[0]?.middle ?? 0) - pageWidth(layout) / 2, area.middle - area.width / 2);
    near((pages[2]?.middle ?? 0) + pageWidth(layout) / 2, area.middle + area.width / 2);
    expect(pageAtPointer(layout, 4.4)).toBe(4);
    expect(pageAtPointer(layout, -0.6)).toBe(26);
  });

  it('what lies under an angle, on a wheel at the top and on the page wheel', () => {
    const w = pageWidth(layout);
    expect(pageUnder(layout, 0, 7)).toBe(7);
    expect(pageUnder(layout, w * 1.2, 7)).toBe(8);
    expect(groupUnder(layout, -w * 2, 7)).toBe(1);
    // The page wheel: contact at its bottom (π), counting the other way round.
    const top: Placement = { offset: Math.PI, direction: -1 };
    expect(pageUnder(layout, Math.PI, 7, top)).toBe(7);
    expect(pageUnder(layout, Math.PI + w, 7, top)).toBe(6);
    near(pageWedge(layout, 6, 7, top).middle, Math.PI + w);
  });

  it('friction: turning the area wheel turns the page wheel the other way, same angle', () => {
    const top: Placement = { offset: Math.PI, direction: -1 };
    const dt = positionForTurn(layout, 0.3, TOP);
    // the finger turns the lower wheel clockwise by 0.3: its areas follow …
    near(groupWedge(layout, 2, 6 + dt).middle - groupWedge(layout, 2, 6).middle, 0.3);
    // … and the page wheel turns by the same angle the other way
    near(pageWedge(layout, 7, 6 + dt, top).middle - pageWedge(layout, 7, 6, top).middle, -0.3);
    // turning the page wheel directly moves its pages with the finger
    const direct = positionForTurn(layout, 0.2, top);
    near(pageWedge(layout, 7, 6 + direct, top).middle - pageWedge(layout, 7, 6, top).middle, 0.2);
  });

  it('settles on an area middle (area wheel) or a page (page wheel), the shorter way', () => {
    expect(snapToGroup(layout, 5.2)).toBe(4);
    expect(snapToGroup(layout, 5.6)).toBe(7);
    expect(snapToGroup(layout, -1.4)).toBe(-2); // the last area (25) the short way round
    expect(snapToPage(5.6)).toBe(6);
    expect(toGroup(layout, 8, 1)).toBe(-2);
    expect(toGroup(layout, 1, 1)).toBe(4);
    expect(groupMiddle(layout, 8)).toBe(25);
  });

  it('the area wheel stands whole on the screen, touching the page wheel', () => {
    for (const [b, h] of [
      [390, 792],
      [360, 640],
      [820, 1100],
    ] as const) {
      const m = frictionSizes(b, h);
      expect(m.rBottom).toBeLessThan(m.rTop);
      // whole: inside the width and the height
      expect(2 * m.rBottom).toBeLessThanOrEqual(b);
      expect(m.bottomY + m.rBottom).toBeLessThanOrEqual(h);
      expect(m.bottomY - m.rBottom).toBeGreaterThan(0);
      // the wheels touch: the page wheel's bottom and the area wheel's top are the contact
      expect(m.topY + m.rTop).toBeCloseTo(m.contact, 9);
      expect(m.bottomY - m.rBottom).toBeCloseTo(m.contact, 9);
      expect(m.rTop).toBeLessThanOrEqual(b * 0.92);
    }
  });

  it('a gear: every tooth four corners, root and tip radius, one tooth at the top', () => {
    const path = gearPath(12, 30, 38);
    expect(path.match(/[ML]/g)).toHaveLength(48);
    expect(path.endsWith('Z')).toBe(true);
    const points = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) =>
      Math.hypot(Number(m[1]), Number(m[2])),
    );
    for (const r of points) expect([30, 38].some((x) => Math.abs(r - x) < 0.01)).toBe(true);
    // the tip of the first tooth straddles the top (x of its two tip corners opposite)
    const [, tipLeft, tipRight] = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(tipLeft).toBeCloseTo(-(tipRight ?? 0), 3);
  });

  it('gear train: the ratio is right — same angle, the other way', () => {
    expect(overallRatio()).toBeCloseTo(-1, 12);
    // the hub gears differ in size
    expect(TOOTH_COUNTS.bottom).not.toBe(TOOTH_COUNTS.top);
    const train = gearTrain({ x: 195, y: 616 }, { x: 195, y: 91 });
    const index = (n: string) => train.gears.findIndex((g) => g.name === n);
    for (const input of [0, 0.3, -1.7, 5]) {
      const d = turns(train, input);
      const d0 = turns(train, 0);
      // the upper hub gear turns by exactly the lower one's angle, the other way
      near((d[index('top')] ?? 0) - (d0[index('top')] ?? 0), -input);
      // the compound gear's two wheels turn together
      expect(d[index('compoundSmall')]).toBe(d[index('compoundLarge')]);
    }
  });

  it('gear train: each gear turns by its ratio to the lower hub gear (turning one turns all)', () => {
    const train = gearTrain({ x: 195, y: 616 }, { x: 195, y: 91 });
    const d0 = turns(train, 0);
    const d1 = turns(train, 0.5);
    train.gears.forEach((gear, i) => {
      near((d1[i] ?? 0) - (d0[i] ?? 0), 0.5 * ratioOf(gear.name));
    });
    expect(ratioOf('top')).toBeCloseTo(overallRatio(), 12);
    expect(ratioOf('compoundSmall')).toBe(-0.5);
  });

  it('gear train: the gear behind under a point, the one drawn last on top', () => {
    const train = gearTrain({ x: 195, y: 616 }, { x: 195, y: 91 });
    const gear = (n: string) => train.gears.find((g) => g.name === n) as Gear;
    const idler = gear('idler');
    expect(backgroundGearAt(train, idler.x, idler.y)?.name).toBe('idler');
    // on the compound axle the small gear lies in front of the big one
    const small = gear('compoundSmall');
    expect(backgroundGearAt(train, small.x, small.y)?.name).toBe('compoundSmall');
    const outer = tipRadius(gear('compoundLarge'), train.module) - 1;
    expect(backgroundGearAt(train, small.x + outer, small.y)?.name).toBe('compoundLarge');
    // the hub gears are no background gears (behind the lower hub lies the big compound gear)
    expect(backgroundGearAt(train, 195, 616)?.name).toBe('compoundLarge');
    expect(backgroundGearAt(train, -5000, -5000)).toBeUndefined();
  });

  it('gear train: meshing gears stand pitch radius + pitch radius apart, the chain closes', () => {
    const bottom = { x: 195, y: 616 };
    const top = { x: 195, y: 91 };
    const train = gearTrain(bottom, top);
    const r = (n: string) => train.gears.find((x) => x.name === n) as Gear;
    const distance = (a: Gear, b: Gear) => Math.hypot(a.x - b.x, a.y - b.y);
    const pairs = [
      ['bottom', 'compoundSmall'],
      ['compoundLarge', 'idler'],
      ['idler', 'top'],
    ] as const;
    for (const [a, b] of pairs) {
      expect(distance(r(a), r(b))).toBeCloseTo(r(a).pitchRadius + r(b).pitchRadius, 6);
    }
    expect([r('bottom').x, r('bottom').y]).toEqual([195, 616]);
    expect([r('top').x, r('top').y]).toEqual([195, 91]);
    // one tooth size for all: pitch radius / teeth is the same
    for (const gear of train.gears) {
      expect(gear.pitchRadius / gear.teeth).toBeCloseTo(train.module / 2, 9);
    }
    // zigzag: compound gear to the right of the way, idler to the left
    expect(r('compoundSmall').x).toBeGreaterThan(195);
    expect(r('idler').x).toBeLessThan(r('compoundSmall').x);
  });

  it('gear train: where two gears meet, a tooth of one stands in a gap of the other', () => {
    const train = gearTrain({ x: 195, y: 616 }, { x: 195, y: 91 });
    const i = (n: string) => train.gears.findIndex((x) => x.name === n);
    for (const input of [0, 0.41, 2.2]) {
      const d = turns(train, input);
      for (const [a, b] of [
        ['bottom', 'compoundSmall'],
        ['compoundLarge', 'idler'],
        ['idler', 'top'],
      ] as const) {
        const ra = train.gears[i(a)] as Gear;
        const rb = train.gears[i(b)] as Gear;
        const direction = Math.atan2(rb.x - ra.x, ra.y - rb.y);
        const pitch = (2 * Math.PI * ra.pitchRadius) / ra.teeth;
        const sa = ra.pitchRadius * (direction - (d[i(a)] ?? 0));
        const sb = rb.pitchRadius * (direction + Math.PI - (d[i(b)] ?? 0));
        const rest = ((((sa + sb - pitch / 2) % pitch) + pitch) % pitch) / pitch;
        expect(Math.min(rest, 1 - rest)).toBeLessThan(1e-6);
      }
    }
  });

  it('names along a ray read outward, never on their head', () => {
    expect(rayTextRotation(0)).toBe(-90); // top: reads upward
    expect(rayTextRotation(Math.PI / 2)).toBe(0); // right: reads to the right
    expect(rayTextRotation(Math.PI)).toBe(90); // bottom: reads downward
    expect(rayTextRotation(-0.2)).toBeCloseTo(-101.46, 1); // just left of the top: still upward
    // lower left: turned round to read inward
    expect(rayTextRotation((5 * Math.PI) / 4 + 0.1)).toBeCloseTo(-39.27, 1);
    for (let a = 0; a < 2 * Math.PI; a += 0.05) {
      expect(Math.abs(rayTextRotation(a))).toBeLessThanOrEqual(135);
    }
    expect(fontSizeForRay('Veranstaltungen', 150) * 0.58 * 15).toBeLessThanOrEqual(138);
    expect(fontSizeForRay('QR', 150)).toBe(16);
  });
});

describe('swiping between the pages of an area', () => {
  it('a quick sideways swipe goes on; short, slow or up/down ones do not', () => {
    expect(swipe(-120, 10, 250)).toBe(1);
    expect(swipe(120, -20, 250)).toBe(-1);
    expect(swipe(-40, 0, 200)).toBe(0);
    expect(swipe(-120, 0, 900)).toBe(0);
    expect(swipe(-100, 70, 200)).toBe(0);
  });
});

describe('wheel to choose from a list', () => {
  const w = (2 * Math.PI) / 14;

  it('the field at the top is chosen, also after many turns either way', () => {
    expect(topIndex(0, 14)).toBe(0);
    expect(topIndex(-w, 14)).toBe(1);
    expect(topIndex(w, 14)).toBe(13);
    expect(topIndex(-3 * w - 0.4 * w, 14)).toBe(3);
    expect(topIndex(-5 * 2 * Math.PI - 2 * w, 14)).toBe(2);
    expect(topIndex(0, 0)).toBe(0);
  });

  it('turning to a field takes the short way and lands exactly on it', () => {
    for (const [i, from] of [
      [3, 0],
      [13, 0],
      [2, -4 * Math.PI],
      [7, 10],
    ] as const) {
      const target = turnFor(i, 14, from);
      expect(topIndex(target, 14)).toBe(i);
      expect(Math.abs(target - from)).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});
