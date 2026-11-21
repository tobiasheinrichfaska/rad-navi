// Wheels with two rings: the areas of a level and their pages. „Rays“: the pages as a second ring
// outside their area; „friction wheels“: the pages on a wheel of their own above the areas, turned
// along by friction (turn the main menu below and the circle of submenus above turns with it).
//
// One model for both: the level's pages in a row, page k at coordinate k, each area spanning its
// pages. A single position `t` (in pages) turns everything — page k stands at the pointer when
// t = k, an area when t is its middle. A wheel draws page k at angle offset + direction·(k − t)·w.

import type { NavNode } from './tree.ts';
import { angleDiff, type Wedge } from './wheel.ts';

export interface Group {
  readonly node: NavNode;
  /** Coordinate of its first page. */
  readonly start: number;
  readonly count: number;
}

export interface Layout {
  readonly groups: readonly Group[];
  readonly pages: readonly { readonly node: NavNode; readonly group: number }[];
}

/** Areas = the level's fields; their fields are the pages (a field without any is its own page). */
export function layoutOf(level: NavNode): Layout {
  const groups: Group[] = [];
  const pages: { node: NavNode; group: number }[] = [];
  for (const node of level.children ?? []) {
    const parts = node.children?.length ? node.children : [node];
    groups.push({ node, start: pages.length, count: parts.length });
    for (const part of parts) pages.push({ node: part, group: groups.length - 1 });
  }
  return { groups, pages };
}

/** Angle one page takes. */
export function pageWidth(layout: Layout): number {
  return (2 * Math.PI) / Math.max(1, layout.pages.length);
}

/** Coordinate of an area's middle. */
export function groupMiddle(layout: Layout, i: number): number {
  const g = layout.groups[i];
  return g ? g.start + (g.count - 1) / 2 : 0;
}

/** How a wheel lies: where coordinate t stands (`offset`, 0 = top) and which way it counts. */
export interface Placement {
  readonly offset: number;
  readonly direction: 1 | -1;
}

export const TOP: Placement = { offset: 0, direction: 1 };

export function pageWedge(layout: Layout, k: number, t: number, placement: Placement = TOP): Wedge {
  const w = pageWidth(layout);
  return { middle: placement.offset + placement.direction * (k - t) * w, width: w };
}

export function groupWedge(
  layout: Layout,
  i: number,
  t: number,
  placement: Placement = TOP,
): Wedge {
  const w = pageWidth(layout);
  const g = layout.groups[i];
  return {
    middle: placement.offset + placement.direction * (groupMiddle(layout, i) - t) * w,
    width: (g?.count ?? 0) * w,
  };
}

const round = (k: number, n: number) => ((Math.round(k) % n) + n) % n;

/** The page at the pointer. */
export function pageAtPointer(layout: Layout, t: number): number {
  return round(t, Math.max(1, layout.pages.length));
}

/** The page under the angle `angle` of a wheel lying as `placement`. */
export function pageUnder(
  layout: Layout,
  angle: number,
  t: number,
  placement: Placement = TOP,
): number {
  const k = t + angleDiff(placement.offset, angle) / (placement.direction * pageWidth(layout));
  return round(k, Math.max(1, layout.pages.length));
}

/** The area under the angle (areas are runs of pages, so: the area of the page under it). */
export function groupUnder(
  layout: Layout,
  angle: number,
  t: number,
  placement: Placement = TOP,
): number {
  return layout.pages[pageUnder(layout, angle, t, placement)]?.group ?? 0;
}

/** The position nearest to t at which area i stands at the pointer (the shorter way round). */
export function toGroup(layout: Layout, i: number, t: number): number {
  const n = Math.max(1, layout.pages.length);
  const target = groupMiddle(layout, i);
  // Whole turns added to the middle itself, so a settled wheel stands exactly there.
  return target + Math.round((t - target) / n) * n;
}

/** Where a wheel turned by the areas settles: the nearest area middle. */
export function snapToGroup(layout: Layout, t: number): number {
  let best = t;
  let distance = Infinity;
  layout.groups.forEach((_, i) => {
    const candidate = toGroup(layout, i, t);
    if (Math.abs(candidate - t) < distance) {
      distance = Math.abs(candidate - t);
      best = candidate;
    }
  });
  return best;
}

/** Where a wheel turned by the pages settles: the nearest page. */
export function snapToPage(t: number): number {
  return Math.round(t);
}

/**
 * Turning the finger by `angle` on a wheel lying as `placement` moves t by this much: the pages
 * follow the finger.
 */
export function positionForTurn(layout: Layout, angle: number, placement: Placement = TOP): number {
  return -angle / (placement.direction * pageWidth(layout));
}

/** Where the two coupled wheels stand on a screen `width` × `height` (px). */
export interface FrictionSizes {
  readonly rTop: number;
  readonly rBottom: number;
  /** Height of the contact. */
  readonly contact: number;
  readonly topY: number;
  readonly bottomY: number;
}

/**
 * The area wheel is small enough to stand whole on the screen, at its bottom; the page wheel above
 * touches it and shows its pages near the contact. Both turn by the same angle — an area below
 * brings exactly its pages to the contact (the gears in their hubs have equal teeth).
 */
export function frictionSizes(width: number, height: number, margin = 10): FrictionSizes {
  const rBottom = Math.max(90, Math.min(width / 2 - margin, height * 0.21));
  const bottomY = height - rBottom - margin;
  const contact = bottomY - rBottom;
  const rTop = Math.max(150, Math.min(width * 0.92, height * 0.62));
  return { rTop, rBottom, contact, topY: contact - rTop, bottomY };
}

/**
 * Rotation (degrees, SVG) of a name written along a ray at `angle`: it reads outward on the upper
 * half and the right; in the lower left it would stand on its head, so there it reads inward.
 */
export function rayTextRotation(angle: number): number {
  const degrees = (angle * 180) / Math.PI - 90;
  const normal = ((((degrees + 180) % 360) + 360) % 360) - 180;
  if (normal > 135) return normal - 180;
  if (normal < -135) return normal + 180;
  return normal;
}

/** Font size for a name written along a ray of this length (px). */
export function fontSizeForRay(name: string, length: number, base = 16): number {
  return Math.min(base, (length - 12) / (0.58 * Math.max(1, name.length)));
}

/**
 * A swipe on a page: +1 = the next page of the area (finger to the left), -1 = the one before,
 * 0 = no swipe (too short, too slow, or more up/down than sideways).
 */
export function swipe(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > 800 || Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** The page beside `page` in its area, or none at the area's end (no wrap around). */
export function neighbour(area: NavNode, page: NavNode, direction: -1 | 1): NavNode | undefined {
  const pages = area.children ?? [];
  const i = pages.indexOf(page);
  return i < 0 ? undefined : pages[i + direction];
}
