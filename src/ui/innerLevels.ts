// Views opened inside a page of the wheel (a child from a list, a chat from a chat list): the
// system's back gesture closes the innermost of them first — the same as its own "Back" — and the
// page only when none is open. The page's one history entry stays meanwhile.
import { useEffect, useRef } from 'react';

const open: Array<{ back: () => void }> = [];

/** Marks a view as open; the returned function takes it off again. */
export function registerLevel(back: () => void): () => void {
  const level = { back };
  open.push(level);
  return () => {
    const i = open.indexOf(level);
    if (i >= 0) open.splice(i, 1);
  };
}

/** Closes the view opened last; false when no view inside the page is open. */
export function closeInnerLevel(): boolean {
  const top = open.at(-1);
  if (!top) return false;
  top.back();
  return true;
}

/** While `isOpen`, the system's back gesture calls `back`. */
export function useInnerLevel(isOpen: boolean, back: () => void): void {
  const current = useRef(back);
  useEffect(() => {
    current.current = back;
  });
  useEffect(() => (isOpen ? registerLevel(() => current.current()) : undefined), [isOpen]);
}
