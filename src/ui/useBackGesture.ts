// The system's back (Android's back gesture or button, a swipe in the iPhone app) while a page of the
// wheel is open: one level back, not out of the app. Opening a page leaves one entry in the
// browser's history; closing it by the app's own "Back" takes that entry away again. A view open
// inside the page (innerLevels) closes first.
import { useEffect, useRef } from 'react';
import { closeInnerLevel } from './innerLevels.ts';

const ENTRY = { radNavi: 'page' };

export function useBackGesture(open: string | null, back: () => void): void {
  const entry = useRef(false);
  const ownBack = useRef(false);
  const current = useRef(back);
  useEffect(() => {
    current.current = back;
  });
  useEffect(() => {
    if (open && !entry.current) {
      history.pushState(ENTRY, '');
      entry.current = true;
    } else if (!open && entry.current) {
      // closed in the app: the entry goes, the popstate it causes is ours
      entry.current = false;
      ownBack.current = true;
      history.back();
    }
  }, [open]);
  useEffect(() => {
    const onBack = () => {
      if (ownBack.current) {
        ownBack.current = false;
        return;
      }
      if (!entry.current) return;
      if (closeInnerLevel()) {
        // a view inside the page closed — the page stays, and so does its entry
        history.pushState(ENTRY, '');
        return;
      }
      entry.current = false;
      current.current();
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
}
