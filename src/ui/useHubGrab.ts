import { useRef, useState, type PointerEvent } from 'react';
import { copyPoint, gesture, type Hub, type Zone } from '../logic/zones.ts';

/** A hub gear in the hand: which one, and where its copy is drawn (SVG pixels). */
export interface HubDrag {
  readonly hub: Hub;
  readonly x: number;
  readonly y: number;
}

interface HubHold {
  readonly id: number;
  readonly hub: Hub;
  readonly x: number;
  readonly y: number;
  readonly since: number;
  grabbed: boolean;
}

/**
 * Pointer handling for the two hub gears (the hub zone of `zoneAt`): a short touch is a tap, a drag
 * grabs the gear and carries a copy of it. Each handler says whether it took the event; if not, the
 * wheels' own grip gets it. A hub never turns a wheel.
 */
export function useHubGrab(options: {
  zoneOf: (x: number, y: number) => Zone;
  locked: () => boolean;
  onTap: (hub: Hub) => void;
  onDrop: (hub: Hub, x: number, y: number) => void;
}) {
  const [drag, setDrag] = useState<HubDrag | null>(null);
  const hold = useRef<HubHold | null>(null);
  const point = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const end = () => {
    hold.current = null;
    setDrag(null);
  };
  return {
    drag,
    /** True while a hub is held (a finger on it or its copy on the way). */
    held: () => hold.current !== null,
    onPointerDown: (e: PointerEvent<SVGSVGElement>): boolean => {
      // a second finger while one holds a hub: swallowed, it must not turn a wheel
      if (hold.current) return true;
      if (options.locked()) return false;
      const { x, y } = point(e);
      const zone = options.zoneOf(x, y);
      if (zone.zone !== 'hub') return false;
      hold.current = { id: e.pointerId, hub: zone.hub, x, y, since: e.timeStamp, grabbed: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      return true;
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>): boolean => {
      const h = hold.current;
      if (!h) return false;
      if (h.id !== e.pointerId) return true;
      const { x, y } = point(e);
      if (!h.grabbed && gesture('hub', Math.hypot(x - h.x, y - h.y)) === 'active') h.grabbed = true;
      if (h.grabbed) setDrag({ hub: h.hub, ...copyPoint(x, y, e.pointerType) });
      return true;
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>): boolean => {
      const h = hold.current;
      if (!h) return false;
      if (h.id !== e.pointerId) return true;
      const { x, y } = point(e);
      end();
      if (h.grabbed) {
        const at = copyPoint(x, y, e.pointerType);
        options.onDrop(h.hub, at.x, at.y);
      } else if (e.timeStamp - h.since < 500) {
        options.onTap(h.hub);
      }
      return true;
    },
    onPointerCancel: (): boolean => {
      if (!hold.current) return false;
      end();
      return true;
    },
  };
}
