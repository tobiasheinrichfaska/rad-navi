import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useBackGesture } from './useBackGesture.ts';
import { ratioOf, gearTrain, tipRadius } from '../logic/gears.ts';
import { unfold, smooth } from '../logic/wheel.ts';
import {
  TOP,
  frictionSizes,
  layoutOf,
  groupMiddle,
  snapToPage,
  groupUnder,
  groupWedge,
  pageAtPointer,
  pageUnder,
  pageWidth,
  positionForTurn,
  pageWedge,
  toGroup,
  neighbour,
  swipe,
  type Placement,
} from '../logic/ring.ts';
import { turnAngle, wheelSteps } from '../logic/scroll.ts';
import type { NavNode } from '../logic/tree.ts';
import {
  assign,
  clear,
  fitLabel,
  hubTapAction,
  resolveShortcut,
  serializeShortcuts,
  type HubShortcuts,
} from '../logic/shortcuts.ts';
import { dropTarget, zoneAt, type Hub, type Zone, type ZoneGeometry } from '../logic/zones.ts';
import {
  NO_BOX,
  colorOf,
  surfaces,
  gearColors,
  useDark,
  useMedia,
  useReducedMotion,
  type Surfaces,
} from './colors.ts';
import { HubGears, GearsBehind, HubCopy, FADED } from './GearTrain.tsx';
import { useHubGrab } from './useHubGrab.ts';
import { useShortcuts } from './useShortcuts.ts';
import { useGrip, usePosition, useRingPath, useProgress, type GripWheel } from './position.ts';
import { MiniWheel } from './MiniWheel.tsx';
import { DEFAULT_TEXTS, type WheelNavProps } from './props.ts';
import { Ring, RingGhost, type RingPiece } from './Ring.tsx';
import { FadeIn, Frame, Placeholder } from './Frame.tsx';

const OPEN_MS = 260;
/** The chosen area's outline on the lower wheel — off for a try. */
const AREA_OUTLINED = false;
const CLOSE_MS = 280;
/** How long a hub gear stays lit after a tap gave it a shortcut. */
const FLASH_MS = 500;
/** The page wheel touches the area wheel with its bottom and turns the other way. */
const PAGE_WHEEL: Placement = { offset: Math.PI, direction: -1 };

type Transition = { readonly type: 'open' | 'close'; readonly k: number };

/**
 * Two wheels coupled by friction: below the areas on a smaller wheel, above all pages; they touch
 * low on the screen. Turning the lower wheel brings the area's pages to the contact; the upper wheel
 * then turns page by page (and the lower one along). A tap on a page opens it, on an area brings it
 * to the contact. The tree, the pages and every text come in through the props.
 */
export function WheelNav({
  tree,
  pages,
  pageFor,
  fullHeight,
  startArea,
  startNode,
  jumpTarget,
  onOpenChange,
  onStep,
  onPage,
  status,
  extraAction,
  ownGestureSelector,
  shortcuts: initialShortcuts,
  onShortcutsChange,
  shortcutsStorageKey,
  texts: textOverrides,
}: WheelNavProps) {
  const texts = useMemo(() => ({ ...DEFAULT_TEXTS, ...textOverrides }), [textOverrides]);
  const reducedMotion = useReducedMotion();
  const dark = useDark();
  // a mouse is there (a touch-only device has none): its wheel may turn the wheels
  const hasMouse = useMedia('(any-hover: hover) and (any-pointer: fine)');
  const f = surfaces(dark);
  const gears = gearColors(dark, f.ground);
  // The page the app was on, so a restarted app opens there.
  const [startPage] = useState(() => {
    const k = layoutOf(tree).pages.findIndex((s) => s.node.id === startNode);
    return k >= 0 ? k : undefined;
  });
  // The first area stands whole at the pointer (the contact) on the start.
  const position = usePosition(
    reducedMotion,
    (() => {
      if (startPage !== undefined) return startPage;
      const start = layoutOf(tree);
      const i = start.groups.findIndex((g) => g.node.id === startArea);
      // an area with an even number of pages: settle on a page beside its middle
      return snapToPage(groupMiddle(start, Math.max(0, i)));
    })(),
  );
  // The hubs: the lower one jumps to the jump target; the upper one runs the extra action. Without
  // a jump target the lower one runs the extra action itself.
  const withJump = !!jumpTarget;
  const runExtra = () => extraAction?.onActivate();
  // The target by the clock: once a minute is enough (reading every frame would cost while turning).
  const [target, setTarget] = useState(() => jumpTarget?.());
  useEffect(() => {
    if (!withJump) return;
    const clock = window.setInterval(() => setTarget(jumpTarget?.()), 60000);
    return () => window.clearInterval(clock);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the function is new on every render
  }, [withJump]);
  const targetId = withJump ? target : undefined;
  const { state: transition, start } = useProgress<Transition>(reducedMotion);
  const { path, here, ringIndex, layout, open, backTo, change } = useRingPath(
    tree,
    position,
    () => onStep?.(),
    (page) => onPage?.(page),
    startPage,
  );
  const openNode = here.type === 'page' ? here.node.id : null;
  useEffect(() => onOpenChange?.(openNode), [openNode, onOpenChange]);
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 700 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [here.type]);

  const { rTop, rBottom, contact, topY, bottomY } = frictionSizes(size.w, size.h);
  const innerTop = rTop * 0.42;
  const topHubR = Math.max(18, rTop * 0.14);
  const innerBottom = rBottom * 0.42;
  const cx = size.w / 2;
  // The gear train from hub to hub (its geometry only changes with the screen).
  const train = useMemo(
    () => gearTrain({ x: cx, y: bottomY }, { x: cx, y: topY }),
    [cx, bottomY, topY],
  );
  const t = position.t;
  const pageNow = pageAtPointer(layout, t);
  const areaNow = layout.pages[pageNow]?.group ?? 0;
  // What each hub points to: the app's value or what was stored, changed by dropping a copy.
  const {
    shortcuts,
    current: shortcutsNow,
    set: setShortcuts,
  } = useShortcuts(initialShortcuts, shortcutsStorageKey, onShortcutsChange);
  // The hub that was just given a shortcut by a tap: lit for a moment (not with reduced motion).
  const [flash, setFlash] = useState<Hub | null>(null);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flash]);
  const commitShortcuts = (next: HubShortcuts) => {
    if (serializeShortcuts(next) !== serializeShortcuts(shortcutsNow.current)) setShortcuts(next);
  };
  const nameOf = (node: NavNode) => (node.page ? pages?.[node.page]?.name : undefined) ?? node.name;
  const shortcutNode = (hub: Hub) => {
    const k = resolveShortcut(layout, shortcuts[hub]);
    return k === undefined ? undefined : layout.pages[k]?.node;
  };

  const openPage = (k: number) => {
    if (transition || !layout.pages[k]) return;
    position.stop();
    if (layout.pages[k]?.node.children) {
      open(k);
      return;
    }
    // The page turns to the contact while it grows — back from it, it stands there.
    const n = layout.pages.length;
    position.glide(k + Math.round((position.now.current - k) / n) * n, OPEN_MS);
    start({ type: 'open', k }, OPEN_MS, () => open(k));
  };
  const tapLowerHub = () => {
    const nowTarget = jumpTarget?.();
    if (!nowTarget) {
      runExtra();
      return;
    }
    setTarget(nowTarget);
    const k = layout.pages.findIndex((s) => s.node.id === nowTarget);
    if (k >= 0) openPage(k);
  };
  const back = (i: number) => {
    if (transition) return;
    const k = backTo(i);
    if (k !== undefined) start({ type: 'close', k }, CLOSE_MS);
  };
  const oneLevel = () => back(path.length - 2);
  useBackGesture(openNode, oneLevel);

  // Every point is in exactly one zone (hub, turn, piece, none), see `zoneAt`.
  const geometry: ZoneGeometry = {
    train,
    cx,
    contact,
    topY,
    bottomY,
    rTop,
    rBottom,
    innerTop,
    innerBottom,
    width: size.w,
    height: size.h,
  };
  const zoneOf = (x: number, y: number) => zoneAt(geometry, x, y);
  /** The wheel (or gear behind) a zone turns; a piece of a ring also has its tap. */
  const wheelFor = (z: Zone): GripWheel | undefined => {
    if (z.zone === 'none') return undefined;
    const kind = z.zone === 'piece' ? 'piece' : 'turn';
    const which = z.zone === 'hub' ? z.hub : z.wheel;
    if (which === 'behind') {
      const behind = train.gears.find((g) => g.name === (z.zone === 'turn' ? z.gear : undefined));
      if (!behind) return undefined;
      const w = pageWidth(layout);
      return {
        cx: behind.x,
        cy: behind.y,
        placement: TOP,
        zone: 'turn',
        // its turn → the lower hub gear's turn (−t·w) → t
        dt: (angle: number) => -angle / (ratioOf(behind.name) * w),
        snap: snapToPage,
        tap: () => undefined,
      };
    }
    return which === 'top'
      ? {
          cx,
          cy: topY,
          placement: PAGE_WHEEL,
          zone: kind,
          snap: snapToPage,
          tap: (angle: number) => {
            if (kind === 'piece')
              openPage(pageUnder(layout, angle, position.now.current, PAGE_WHEEL));
          },
        }
      : {
          cx,
          cy: bottomY,
          placement: TOP,
          zone: kind,
          // Both wheels settle on every page of the upper one, not only on the areas' middles.
          snap: snapToPage,
          tap: (angle: number) => {
            if (kind !== 'piece') return;
            const i = groupUnder(layout, angle, position.now.current);
            position.glide(snapToPage(toGroup(layout, i, position.now.current)));
          },
        };
  };
  // A hub never turns by hand (its drag grabs the gear): the grip takes the other zones only.
  const wheelAt = (x: number, y: number): GripWheel | undefined => {
    const z = zoneOf(x, y);
    return z.zone === 'hub' ? undefined : wheelFor(z);
  };

  const grip = useGrip(layout, position, wheelAt, !!transition);

  const pageHere = () => layout.pages[pageAtPointer(layout, position.now.current)]?.node;
  /** Makes the page at the contact the hub's shortcut; false when there is none. */
  const assignHere = (hub: Hub): boolean => {
    const node = pageHere();
    if (!node) return false;
    commitShortcuts(assign(shortcutsNow.current, hub, node.id));
    return true;
  };
  // A tap on a hub, see `hubTapAction`: its shortcut; else what the hub always did; with neither,
  // the page at the contact becomes its shortcut (lit for a moment).
  const tapHub = (hub: Hub) => {
    const k = resolveShortcut(layout, shortcutsNow.current[hub]);
    const oldAction =
      hub === 'bottom' ? !!jumpTarget?.() || !!extraAction : withJump && !!extraAction;
    const what = hubTapAction(k !== undefined, oldAction);
    if (what === 'shortcut') {
      if (k !== undefined) openPage(k);
    } else if (what === 'old') {
      if (hub === 'bottom') tapLowerHub();
      else runExtra();
    } else if (!transition && assignHere(hub) && !reducedMotion) setFlash(hub);
  };
  const hubs = useHubGrab({
    zoneOf,
    locked: () => !!transition || grip.busy(),
    onTap: tapHub,
    onDrop: (hub, x, y) => {
      const target = dropTarget(train, hub, x, y);
      if (target === 'delete') commitShortcuts(clear(shortcutsNow.current, hub));
      else if (target) assignHere(hub);
    },
  });

  // The mouse wheel turns the wheel under the pointer (or a gear), as a roller laid on from above:
  // scrolling down on a wheel's right half turns it anticlockwise. Not on the vertical middle line.
  const wheelState = useRef({ rest: 0, target: 0, at: 0 });
  const onMouseWheel = useRef<(e: WheelEvent) => void>(() => undefined);
  onMouseWheel.current = (e) => {
    const el = area.current;
    if (!el || transition || hubs.held()) return;
    const box = el.getBoundingClientRect();
    // over a hub the roller still turns its wheel (a hub only reacts to tap and drag)
    const wheel = wheelFor(zoneOf(e.clientX - box.left, e.clientY - box.top));
    if (!wheel) return;
    e.preventDefault();
    const w = wheelState.current;
    const turn = wheelSteps(e.timeStamp - w.at > 400 ? 0 : w.rest, e.deltaY, e.deltaMode);
    w.rest = turn.rest;
    const angle = turnAngle(turn.steps, e.clientX - box.left - wheel.cx, pageWidth(layout));
    if (angle === 0) return;
    // notches in quick succession add up to the place already on its way
    const quick = e.timeStamp - w.at < 250;
    const base = quick ? w.target : position.now.current;
    const moved =
      base + (wheel.dt ? wheel.dt(angle) : positionForTurn(layout, angle, wheel.placement));
    let target = wheel.snap(moved);
    if (target === wheel.snap(base)) target = wheel.snap(base) + Math.sign(moved - base);
    w.target = target;
    w.at = e.timeStamp;
    position.glide(target, 140);
  };
  useEffect(() => {
    const el = area.current;
    if (!el || !hasMouse) return;
    const handler = (e: WheelEvent) => onMouseWheel.current(e);
    // not passive: the page behind must not scroll along
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [hasMouse, here.type]);

  if (here.type === 'page') {
    const level = path[ringIndex]?.node ?? tree;
    const areaNode = path[ringIndex + 1]?.node ?? here.node;
    const real = here.node.page ? pageFor?.(here.node.page) : undefined;
    const whole = !!here.node.page && !!fullHeight?.(here.node.page);
    // a chat divides the height itself: messages scrolling, the field at the bottom
    const sheetSize: CSSProperties = whole
      ? { height: '100%', overflow: 'hidden' }
      : { minHeight: '100%', padding: '12px 12px 112px' };
    const previous = neighbour(areaNode, here.node, -1);
    const next = neighbour(areaNode, here.node, 1);
    return (
      <Frame path={path.map((s) => s.node)} onJump={back} status={status} texts={texts}>
        <SwipeArea
          key={here.node.id}
          ownGestureSelector={ownGestureSelector}
          onSwipe={(direction) => {
            const target = direction === 1 ? next : previous;
            if (target) change(target);
          }}
        >
          <Neighbours previous={previous} next={next} onChange={change} f={f} texts={texts} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <FadeIn>
              {real ? (
                // The real page scrolls inside; room at the bottom for the small wheel. Pages may be
                // drawn for light only (white rows, inherited text): they stand on a light sheet so
                // their text stays readable in dark mode.
                <div
                  data-page-scroll=""
                  style={{
                    height: '100%',
                    overflowY: whole ? 'hidden' : 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <div
                    data-sheet="light"
                    style={{
                      maxWidth: 680,
                      boxSizing: 'border-box',
                      margin: '0 auto',
                      background: '#fff',
                      color: '#1d232a',
                      colorScheme: 'light',
                      borderRadius: '12px 12px 0 0',
                      ...sheetSize,
                    }}
                  >
                    {real}
                  </div>
                </div>
              ) : (
                <Placeholder
                  node={here.node}
                  color={colorOf(tree, here.node)}
                  back={undefined}
                  onBack={oneLevel}
                  texts={texts}
                />
              )}
            </FadeIn>
          </div>
        </SwipeArea>
        <MiniWheel tree={tree} parent={level} here={areaNode} onBack={oneLevel} texts={texts} />
      </Frame>
    );
  }

  const q = transition ? smooth(transition.p) : 1;
  const moving = transition?.move.k;
  const cover = transition ? (transition.move.type === 'open' ? 1 - q : q) : 1;
  const areas: RingPiece[] = layout.groups.map((g, i) => ({
    id: `area-${g.node.id}`,
    node: g.node,
    wedge: groupWedge(layout, i, t),
    color: colorOf(tree, g.node),
    opacity: cover,
    marked: AREA_OUTLINED && !transition && i === areaNow,
    choose: () => position.glide(snapToPage(toGroup(layout, i, position.now.current))),
  }));
  const pagePieces: RingPiece[] = layout.pages.map((s, k) => ({
    id: `page-${s.node.id}`,
    node: s.node,
    wedge: pageWedge(layout, k, t, PAGE_WHEEL),
    color: colorOf(tree, s.node),
    opacity: k === moving ? 0 : cover,
    marked: !transition && k === pageNow,
    choose: () => openPage(k),
    // a page standing in two areas: say which one
    label: `${s.node.name} · ${layout.groups[s.group]?.node.name ?? ''}`,
  }));
  const ghost = (() => {
    if (!transition || moving === undefined) return undefined;
    const s = layout.pages[moving];
    if (!s) return undefined;
    const a = transition.move.type === 'open' ? q : 1 - q;
    const wedge = pageWedge(layout, moving, t, PAGE_WHEEL);
    return {
      wedge: unfold(wedge, 1, wedge.middle, a)[0] ?? wedge,
      inner: innerTop * (1 - a),
      color: colorOf(tree, s.node),
    };
  })();
  const targetNode = targetId ? layout.pages.find((s) => s.node.id === targetId)?.node : undefined;
  const targetName = targetNode ? nameOf(targetNode) : undefined;
  const lowerDiscR = Math.max(16, rBottom * 0.14);
  const hubDiscR = (hub: Hub) => (hub === 'bottom' ? lowerDiscR : topHubR);
  // What a hub shows and says: its shortcut, else what it did before shortcuts; with neither, it
  // says what a tap does now (assign the page at the contact). Every hub has an action, so every
  // hub is a button for the keyboard and screen readers.
  const hubLook = (hub: Hub) => {
    const node = shortcutNode(hub);
    if (node) {
      const name = nameOf(node);
      return { label: name, aria: texts.shortcutFor(name), fitted: true };
    }
    const here = pageHere();
    const assignAria = here ? texts.shortcutAssign(nameOf(here)) : texts.shortcutEmpty;
    if (hub === 'bottom') {
      const old = !!targetId || !!extraAction;
      const aria = targetId ? texts.jumpToTarget : extraAction?.label;
      return {
        label: targetName ?? extraAction?.label,
        aria: old ? aria || texts.shortcutEmpty : assignAria,
        fitted: false,
      };
    }
    const label = withJump ? extraAction?.label : undefined;
    return {
      label,
      aria: label || (withJump && extraAction ? texts.shortcutEmpty : assignAria),
      fitted: false,
    };
  };
  const dragging = hubs.drag;
  const dragTarget = dragging ? dropTarget(train, dragging.hub, dragging.x, dragging.y) : undefined;
  const gearOf = (name: string) => train.gears.find((g) => g.name === name);
  const hubKeys = (hub: Hub) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      assignHere(hub);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tapHub(hub);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      commitShortcuts(clear(shortcutsNow.current, hub));
    }
  };
  /** One hub: a round label over the gear, a button for screen readers and the keyboard. */
  const hubButton = (hub: Hub) => {
    const look = hubLook(hub);
    const gear = gearOf(hub);
    if (!gear) return null;
    const r = hubDiscR(hub);
    const base = hub === 'bottom' ? Math.max(12, rBottom * 0.09) : Math.max(12, topHubR * 0.6);
    const fit = look.fitted && look.label ? fitLabel(look.label, r * 1.7, base) : undefined;
    const shown = look.label !== undefined;
    return (
      <g
        key={hub}
        role="button"
        tabIndex={0}
        aria-label={look.aria}
        onKeyDown={hubKeys(hub)}
        onClick={(e) => {
          if (e.detail === 0) tapHub(hub);
        }}
        data-hub={hub}
        style={NO_BOX}
        opacity={cover * (dragging?.hub === hub ? FADED : 1)}
      >
        {(hub === 'bottom' || shown) && (
          <circle cx={gear.x} cy={gear.y} r={r} fill={f.ground} opacity={0.9} />
        )}
        {shown && (
          <text
            x={gear.x}
            y={gear.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={f.text}
            fontSize={fit?.size ?? base}
            fontWeight={700}
            style={{ pointerEvents: 'none' }}
          >
            {fit?.text ?? look.label}
          </text>
        )}
      </g>
    );
  };
  // While a gear is carried: the gear it is over lights up, the idler waits to delete. The tint
  // lies under the carried copy, the outline and the mark (the idler is covered by the rings and
  // may be smaller than the copy) on top of everything.
  const highlight = (
    name: string,
    strong: boolean,
    color: string,
    layer: 'tint' | 'mark',
    x?: string,
  ) => {
    const gear = gearOf(name);
    if (!gear) return null;
    const tip = tipRadius(gear, train.module);
    return (
      <g
        key={`${name}-${layer}`}
        data-drop={name}
        data-lit={strong ? '' : undefined}
        style={{ pointerEvents: 'none' }}
      >
        {layer === 'tint' ? (
          <circle cx={gear.x} cy={gear.y} r={tip} fill={color} fillOpacity={strong ? 0.28 : 0.08} />
        ) : (
          <>
            <circle
              cx={gear.x}
              cy={gear.y}
              r={tip}
              fill="none"
              stroke={color}
              strokeWidth={strong ? 4 : 2}
              strokeDasharray={strong ? undefined : '6 5'}
              opacity={strong ? 1 : 0.6}
            />
            {x && (
              <text
                x={gear.x}
                y={gear.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={strong ? 64 : 48}
                fontWeight={700}
                opacity={strong ? 1 : 0.5}
                stroke={strong ? f.ground : undefined}
                strokeWidth={strong ? 3 : undefined}
                paintOrder="stroke"
              >
                {x}
              </text>
            )}
            {x && strong && (
              <text
                x={gear.x}
                y={gear.y + 46}
                textAnchor="middle"
                fill={color}
                fontSize={13}
                fontWeight={700}
                stroke={f.ground}
                strokeWidth={3}
                paintOrder="stroke"
              >
                {texts.shortcutDelete}
              </text>
            )}
          </>
        )}
      </g>
    );
  };
  const otherHub: Hub | undefined = dragging
    ? dragging.hub === 'bottom'
      ? 'top'
      : 'bottom'
    : undefined;
  const copyGear = dragging ? gearOf(dragging.hub) : undefined;
  const copyNode = dragging ? pageHere() : undefined;

  return (
    <Frame path={path.map((s) => s.node)} onJump={back} status={status} texts={texts}>
      <div ref={area} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={{
            display: 'block',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          // where the wheels stand, for the local checks
          data-contact={contact}
          data-bottom-y={bottomY}
          data-bottom-r={rBottom}
          data-top-y={topY}
          data-top-r={rTop}
          data-hub-bottom-r={lowerDiscR}
          data-hub-top-r={topHubR}
          onPointerDown={(e) => {
            if (!hubs.onPointerDown(e)) grip.onPointerDown(e);
          }}
          onPointerMove={(e) => {
            if (!hubs.onPointerMove(e)) grip.onPointerMove(e);
          }}
          onPointerUp={(e) => {
            if (!hubs.onPointerUp(e)) grip.onPointerUp(e);
          }}
          onPointerCancel={(e) => {
            if (!hubs.onPointerCancel(e)) grip.onPointerCancel();
          }}
          onLostPointerCapture={(e) => hubs.onLostPointerCapture(e)}
        >
          {/* the works behind the wheels, seen through the rings */}
          <GearsBehind
            train={train}
            bottom={-t * pageWidth(layout)}
            colors={gears}
            opacity={cover}
          />
          <Ring
            pieces={areas}
            cx={cx}
            cy={bottomY}
            inner={innerBottom}
            outer={rBottom}
            baseFont={15}
            seeThrough={0.84}
            plannedLabel={texts.planned}
            surfaces={f}
          />
          <Ring
            pieces={pagePieces}
            cx={cx}
            cy={topY}
            inner={innerTop}
            outer={rTop}
            baseFont={16}
            seeThrough={0.84}
            plannedLabel={texts.planned}
            surfaces={f}
          />
          {/* the hub gears, different in size; the train between them makes the ratio right */}
          <HubGears
            train={train}
            bottom={-t * pageWidth(layout)}
            colors={gears}
            opacity={cover}
            faded={dragging?.hub ?? undefined}
          />
          {/* the hubs: the upper middle (shortcut, or the extra action when the lower one jumps) and the
              lower middle (shortcut, or the jump target, or without one the extra action) */}
          {hubButton('top')}
          {hubButton('bottom')}
          {/* where the wheels touch: the page there and its area are the chosen ones */}
          <path
            d={`M${cx - 10} ${contact}h20M${cx} ${contact - 10}v20`}
            stroke={f.text}
            strokeWidth={2}
            opacity={transition ? 0 : 0.5}
            style={{ pointerEvents: 'none' }}
          />
          {dragging && otherHub && highlight(otherHub, dragTarget === otherHub, '#2563c9', 'tint')}
          {dragging && highlight('idler', dragTarget === 'delete', '#d1242f', 'tint')}
          {flash && highlight(flash, true, '#2563c9', 'tint')}
          {ghost && (
            <RingGhost
              wedge={ghost.wedge}
              cx={cx}
              cy={topY}
              inner={ghost.inner}
              outer={rTop}
              color={ghost.color}
              opacity={1}
            />
          )}
          {/* the carried copy of a hub gear: on top of everything */}
          {dragging && copyGear && (
            <HubCopy
              gear={copyGear}
              module={train.module}
              x={dragging.x}
              y={dragging.y}
              colors={gears}
              name={copyNode ? nameOf(copyNode) : ''}
              ground={f.ground}
              text={f.text}
              hubRadius={hubDiscR(dragging.hub)}
            />
          )}
          {dragging && otherHub && highlight(otherHub, dragTarget === otherHub, '#2563c9', 'mark')}
          {dragging && highlight('idler', dragTarget === 'delete', '#d1242f', 'mark', '×')}
          {flash && highlight(flash, true, '#2563c9', 'mark')}
        </svg>
      </div>
    </Frame>
  );
}

/**
 * A page's area for swiping to the page beside it. Not when the finger starts on something that
 * scrolls sideways itself (a wide table) or takes text.
 */
function SwipeArea({
  onSwipe,
  ownGestureSelector,
  children,
}: {
  onSwipe: (direction: -1 | 1) => void;
  ownGestureSelector: string | undefined;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onTouchStart={(e) => {
        const p = e.touches[0];
        start.current =
          e.touches.length === 1 && p && !ownGesture(e.target, e.currentTarget, ownGestureSelector)
            ? { x: p.clientX, y: p.clientY, t: e.timeStamp }
            : null;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        const p = e.changedTouches[0];
        start.current = null;
        if (!s || !p) return;
        const r = swipe(p.clientX - s.x, p.clientY - s.y, e.timeStamp - s.t);
        if (r !== 0) onSwipe(r);
      }}
    >
      {children}
    </div>
  );
}

/** The target scrolls sideways itself or is a field to type in: its own gesture. */
function ownGesture(target: EventTarget, until: Element, extra: string | undefined): boolean {
  const selector = extra
    ? `input, textarea, select, canvas, video, ${extra}`
    : 'input, textarea, select, canvas, video';
  for (
    let el = target instanceof Element ? target : null;
    el && el !== until;
    el = el.parentElement
  ) {
    if (el.matches(selector)) return true;
    // the page's own scroll box scrolls up and down only
    if (el.hasAttribute('data-page-scroll')) continue;
    const x = getComputedStyle(el).overflowX;
    if ((x === 'auto' || x === 'scroll') && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/** The pages beside this one in its area, to tap as well as to swipe to. */
function Neighbours({
  previous,
  next,
  onChange,
  f,
  texts,
}: {
  previous: NavNode | undefined;
  next: NavNode | undefined;
  onChange: (node: NavNode) => void;
  f: Surfaces;
  texts: Pick<typeof DEFAULT_TEXTS, 'neighbour'>;
}) {
  if (!previous && !next) return null;
  const button = (node: NavNode | undefined, text: string, right: boolean) => (
    <button
      type="button"
      disabled={!node}
      aria-label={node ? texts.neighbour(node.name) : undefined}
      onClick={() => node && onChange(node)}
      style={{
        ...NO_BOX,
        background: 'none',
        border: 'none',
        color: node ? f.text : 'transparent',
        fontSize: 14,
        padding: '6px 4px',
        textAlign: right ? 'right' : 'left',
        flex: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </button>
  );
  return (
    <div style={{ display: 'flex', maxWidth: 680, width: '100%', margin: '0 auto', flexShrink: 0 }}>
      {button(previous, previous ? `‹ ${previous.name}` : '', false)}
      {button(next, next ? `${next.name} ›` : '', true)}
    </div>
  );
}
