// Remember the page the wheels were on: only the page's node id, under a key the app chooses.
// Pure and UI-free; the storage is passed in, never reached for here. Nothing here throws: blocked
// or full storage just means the navigation starts on its first page.

/** The parts of `Storage` used here (`localStorage` fits). */
export interface NodeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Longest node id read back from storage. */
const MAX_ID = 300;

/**
 * The stored node id, if there is one and `isValid` accepts it (the tree is the app's, so a page
 * that is gone is not opened); otherwise none. No storage, a refusing storage or a throwing
 * `isValid` all give none.
 */
export function loadLastNode(
  storage: NodeStorage | undefined,
  key: string,
  isValid: (nodeId: string) => boolean,
): string | undefined {
  try {
    const raw = storage?.getItem(key);
    return raw && raw.length <= MAX_ID && isValid(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Stores the node id; the wheel (null) and an empty id are ignored. False when nothing was stored. */
export function saveLastNode(
  storage: NodeStorage | undefined,
  key: string,
  nodeId: string | null,
): boolean {
  if (!storage || !nodeId) return false;
  try {
    storage.setItem(key, nodeId);
    return true;
  } catch {
    return false;
  }
}
