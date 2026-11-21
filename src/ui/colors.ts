import { useEffect, useState } from 'react';
import { areaOf, pathTo, type NavNode } from '../logic/tree.ts';

// Light or dark follows the device. Server rendering has no window: then light, no motion reduction.
function useMedia(query: string): boolean {
  const [match, setMatch] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia?.(query).matches) || false,
  );
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const change = (event: MediaQueryListEvent) => setMatch(event.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, [query]);
  return match;
}

export const useDark = () => useMedia('(prefers-color-scheme: dark)');
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

/** One colour per area (nine), in the order of the tree — neighbours on the wheel differ. */
const AREAS = [
  '#e0481f',
  '#2563c9',
  '#7a4fc9',
  '#1a7f37',
  '#b45309',
  '#0e7490',
  '#a21caf',
  '#4d7c0f',
  '#4338ca',
] as const;

export function areaColor(index: number): string {
  return AREAS[((index % AREAS.length) + AREAS.length) % AREAS.length] ?? AREAS[0];
}

/** Fields below an area: the area's colour, a little darker for each further field. */
export function fieldColor(color: string, index: number): string {
  const share = [100, 84, 70][index % 3] ?? 100;
  return share === 100 ? color : `color-mix(in srgb, ${color} ${share}%, black)`;
}

export interface Surfaces {
  readonly ground: string;
  readonly line: string;
  readonly empty: string;
  readonly back: string;
  readonly text: string;
  readonly quiet: string;
}

export function surfaces(dark: boolean): Surfaces {
  return dark
    ? {
        ground: '#0d1117',
        line: '#0d1117',
        empty: '#161b22',
        back: '#30363d',
        text: '#e6edf3',
        quiet: '#9da7b3',
      }
    : {
        ground: '#f6f8fa',
        line: '#f6f8fa',
        empty: '#e9edf1',
        back: '#d5dbe1',
        text: '#1d232a',
        quiet: '#5b6672',
      };
}

/** Colour of a node: its area's colour, fields below the start a little darker each. */
export function colorOf(tree: NavNode, node: NavNode): string {
  const area = areaOf(tree, node.id);
  const base = areaColor((tree.children ?? []).indexOf(area));
  if (area === node || area === tree) return base;
  const parent = pathTo(tree, node.id).at(-2);
  return fieldColor(base, (parent?.children ?? []).indexOf(node));
}

/**
 * Fields are shapes, not boxes: Safari's tap highlight and the focus ring both draw the element's
 * box — a rectangle around a wheel piece. Both off; a field reached by keyboard shows it in its own
 * outline instead.
 */
export const NO_BOX = { WebkitTapHighlightColor: 'transparent', outline: 'none' } as const;

/** Focus from the keyboard (not from a tap), which deserves a visible mark. */
export function keyboardFocus(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

export interface GearColors {
  readonly light: string;
  readonly middle: string;
  readonly dark: string;
  /** The background the shaft fades into behind the wheels. */
  readonly mist: string;
}

/** Steel greys for the gears and the shaft of the wheels, light or dark. */
export function gearColors(dark: boolean, ground: string): GearColors {
  return dark
    ? { light: '#8b949e', middle: '#484f58', dark: '#21262d', mist: ground }
    : { light: '#eef1f4', middle: '#a3acb6', dark: '#57606a', mist: ground };
}
