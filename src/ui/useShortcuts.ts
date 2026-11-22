import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cleanShortcuts,
  isEmpty,
  loadShortcuts,
  saveShortcuts,
  type HubShortcuts,
  type StorageLike,
} from '../logic/shortcuts.ts';

/** The browser's localStorage, or none (server rendering, blocked storage: reaching it may throw). */
export function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The hubs' shortcuts as state. Start: the app's `initial` value, else what the package stored under
 * `storageKey`. Every change goes to `onChange` and, with a key, to the storage. Without storage
 * (or when it refuses) everything still works, the shortcuts just do not survive a restart.
 */
export function useShortcuts(
  initial: HubShortcuts | undefined,
  storageKey: string | undefined,
  onChange: ((shortcuts: HubShortcuts) => void) | undefined,
  storage: StorageLike | undefined = undefined,
) {
  const [shortcuts, setState] = useState<HubShortcuts>(() =>
    initial ? cleanShortcuts(initial) : {},
  );
  const current = useRef(shortcuts);
  const change = useRef(onChange);
  change.current = onChange;
  const given = initial !== undefined;
  // Loading waits for the mount: server rendering and the first client render agree.
  useEffect(() => {
    if (given || !storageKey) return;
    const stored = loadShortcuts(storage ?? browserStorage(), storageKey);
    if (isEmpty(stored)) return;
    current.current = stored;
    setState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per key
  }, [storageKey]);
  const set = useCallback(
    (next: HubShortcuts) => {
      current.current = next;
      setState(next);
      if (storageKey) saveShortcuts(storage ?? browserStorage(), storageKey, next);
      change.current?.(next);
    },
    [storageKey, storage],
  );
  return { shortcuts, current, set };
}
