// Shortcuts on the two hub gears: each hub may point to one page (by node id). Pure and UI-free:
// assigning, clearing, finding the page in a layout, and a strict, versioned text form so the
// shortcuts survive a restart. Storage is passed in (`StorageLike`), never reached for here.

import type { Layout } from './ring.ts';
import type { Hub } from './zones.ts';

export interface HubShortcuts {
  readonly top?: string;
  readonly bottom?: string;
}

/** The parts of `Storage` used here, so a test (or an app) can pass its own. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const VERSION = 1;
/** Longest node id accepted from stored text. */
const MAX_ID = 300;

/** The shortcuts with `hub` pointing to `nodeId`. */
export function assign(shortcuts: HubShortcuts, hub: Hub, nodeId: string): HubShortcuts {
  return nodeId ? { ...shortcuts, [hub]: nodeId } : clear(shortcuts, hub);
}

/** The shortcuts without the one of `hub`. */
export function clear(shortcuts: HubShortcuts, hub: Hub): HubShortcuts {
  const { [hub]: _gone, ...rest } = shortcuts;
  return rest;
}

/** Index (in `layout.pages`) of the page a shortcut points to, or none (unset, or no longer there). */
export function resolveShortcut(layout: Layout, nodeId: string | undefined): number | undefined {
  if (!nodeId) return undefined;
  const k = layout.pages.findIndex((s) => s.node.id === nodeId);
  return k >= 0 ? k : undefined;
}

export const isEmpty = (s: HubShortcuts): boolean => s.top === undefined && s.bottom === undefined;

const validId = (v: unknown): v is string =>
  typeof v === 'string' && v !== '' && v.length <= MAX_ID;

/**
 * Takes anything (an app's value, parsed text) and returns clean shortcuts: only `top` and `bottom`,
 * only valid ids. Anything else — wrong type, unknown field, bad id — gives empty shortcuts.
 */
export function cleanShortcuts(value: unknown): HubShortcuts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'top' && key !== 'bottom') return {};
  }
  const { top, bottom } = record;
  if ((top !== undefined && !validId(top)) || (bottom !== undefined && !validId(bottom))) return {};
  return {
    ...(top !== undefined ? { top: top as string } : {}),
    ...(bottom !== undefined ? { bottom: bottom as string } : {}),
  };
}

/** The shortcuts as versioned JSON text (`{"v":1,"top":…,"bottom":…}`). */
export function serializeShortcuts(shortcuts: HubShortcuts): string {
  const { top, bottom } = cleanShortcuts(shortcuts);
  return JSON.stringify({
    v: VERSION,
    ...(top !== undefined ? { top } : {}),
    ...(bottom !== undefined ? { bottom } : {}),
  });
}

/** Strict reverse of `serializeShortcuts`: garbage, another version, unknown fields → empty. Never throws. */
export function parseShortcuts(text: unknown): HubShortcuts {
  if (typeof text !== 'string') return {};
  try {
    const data: unknown = JSON.parse(text);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const { v, ...fields } = data as Record<string, unknown>;
    return v === VERSION ? cleanShortcuts(fields) : {};
  } catch {
    return {};
  }
}

/** Loads shortcuts from `storage` under `key`; no storage, nothing stored, or any error → empty. */
export function loadShortcuts(storage: StorageLike | undefined, key: string): HubShortcuts {
  try {
    return parseShortcuts(storage?.getItem(key));
  } catch {
    return {};
  }
}

/** Saves shortcuts (empty ones remove the entry); false when there is no storage or it refused. */
export function saveShortcuts(
  storage: StorageLike | undefined,
  key: string,
  shortcuts: HubShortcuts,
): boolean {
  if (!storage) return false;
  try {
    if (isEmpty(shortcuts)) storage.removeItem(key);
    else storage.setItem(key, serializeShortcuts(shortcuts));
    return true;
  } catch {
    return false;
  }
}

/**
 * A name made to fit a hub of `width` px: the font shrinks down to `minSize`, then the text is cut
 * with an ellipsis. (Letters are taken as 0.58 of the font size wide.)
 */
export function fitLabel(
  name: string,
  width: number,
  size: number,
  minSize = 8,
): { readonly text: string; readonly size: number } {
  const chars = Math.max(1, name.length);
  const fitting = Math.min(size, width / (0.58 * chars));
  if (fitting >= minSize) return { text: name, size: fitting };
  const room = Math.max(1, Math.floor(width / (0.58 * minSize)));
  return { text: room >= chars ? name : `${name.slice(0, Math.max(1, room - 1))}…`, size: minSize };
}
