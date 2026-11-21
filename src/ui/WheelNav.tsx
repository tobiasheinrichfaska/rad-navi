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
import { backgroundGearAt, ratioOf, gearTrain } from '../logic/gears.ts';
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
  pageWedge,
  toGroup,
  neighbour,
  swipe,
  type Placement,
} from '../logic/ring.ts';
import type { NavNode } from '../logic/tree.ts';
import {
  NO_BOX,
  colorOf,
  surfaces,
  gearColors,
  useDark,
  useReducedMotion,
  type Surfaces,
} from './colors.ts';
import { HubGears, GearsBehind } from './GearTrain.tsx';
import { useGrip, usePosition, useRingPath, useProgress } from './position.ts';
import { MiniWheel } from './MiniWheel.tsx';
import { DEFAULT_TEXTS, type WheelNavProps } from './props.ts';
import { Ring, RingGhost, type RingPiece } from './Ring.tsx';
import { FadeIn, Frame, Placeholder } from './Frame.tsx';

const OPEN_MS = 260;
/** The chosen area's outline on the lower wheel — off for a try. */
const AREA_OUTLINED = false;
const CLOSE_MS = 280;
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
  texts: textOverrides,
}: WheelNavProps) {
  const texts = useMemo(() => ({ ...DEFAULT_TEXTS, ...textOverrides }), [textOverrides]);
  const reducedMotion = useReducedMotion();
  const dark = useDark();
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

  const grip = useGrip(
    layout,
    position,
    (x, y) => {
      // Gears behind, where neither wheel covers them, turn too.
      const free = Math.hypot(x - cx, y - bottomY) > rBottom && Math.hypot(x - cx, y - topY) > rTop;
      const behind = free ? backgroundGearAt(train, x, y) : undefined;
      if (behind) {
        const w = pageWidth(layout);
        return {
          cx: behind.x,
          cy: behind.y,
          placement: TOP,
          // its turn → the lower hub gear's turn (−t·w) → t
          dt: (angle: number) => -angle / (ratioOf(behind.name) * w),
          snap: snapToPage,
          tap: () => undefined,
        };
      }
      return y < contact
        ? {
            cx,
            cy: topY,
            placement: PAGE_WHEEL,
            snap: snapToPage,
            tap: (angle: number, distance: number) => {
              if (distance < topHubR && withJump && extraAction) runExtra();
              else if (distance >= innerTop && distance <= rTop) {
                openPage(pageUnder(layout, angle, position.now.current, PAGE_WHEEL));
              }
            },
          }
        : {
            cx,
            cy: bottomY,
            placement: TOP,
            // Both wheels settle on every page of the upper one, not only on the areas' middles.
            snap: snapToPage,
            tap: (angle: number, distance: number) => {
              if (distance < innerBottom) tapLowerHub();
              else if (distance <= rBottom) {
                const i = groupUnder(layout, angle, position.now.current);
                position.glide(snapToPage(toGroup(layout, i, position.now.current)));
              }
            },
          };
    },
    !!transition,
  );

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
  const targetName = targetNode
    ? ((targetNode.page ? pages?.[targetNode.page]?.name : undefined) ?? targetNode.name)
    : undefined;
  const lowerLabel = targetName ?? extraAction?.label;
  const lowerAria = targetId ? texts.jumpToTarget : extraAction?.label;

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
          {...grip}
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
          <HubGears train={train} bottom={-t * pageWidth(layout)} colors={gears} opacity={cover} />
          {/* the upper middle: the extra action, when the lower one jumps */}
          {withJump && extraAction && (
            <g
              role="button"
              tabIndex={0}
              aria-label={extraAction.label}
              style={NO_BOX}
              opacity={cover}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  runExtra();
                }
              }}
              onClick={(e) => {
                if (e.detail === 0) runExtra();
              }}
            >
              <circle cx={cx} cy={topY} r={topHubR} fill={f.ground} opacity={0.9} />
              <text
                x={cx}
                y={topY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={f.text}
                fontSize={Math.max(12, topHubR * 0.6)}
                fontWeight={700}
                style={{ pointerEvents: 'none' }}
              >
                {extraAction.label}
              </text>
            </g>
          )}
          {/* the lower middle: the jump target (without one: the extra action, if any) */}
          <g
            {...(lowerAria
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': lowerAria,
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tapLowerHub();
                    }
                  },
                  onClick: (e: { detail: number }) => {
                    if (e.detail === 0) tapLowerHub();
                  },
                }
              : {})}
            style={NO_BOX}
            opacity={cover}
          >
            <circle
              cx={cx}
              cy={bottomY}
              r={Math.max(16, rBottom * 0.14)}
              fill={f.ground}
              opacity={0.9}
            />
            <text
              x={cx}
              y={bottomY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={f.text}
              fontSize={Math.max(12, rBottom * 0.09)}
              fontWeight={700}
              style={{ pointerEvents: 'none' }}
            >
              {lowerLabel}
            </text>
          </g>
          {/* where the wheels touch: the page there and its area are the chosen ones */}
          <path
            d={`M${cx - 10} ${contact}h20M${cx} ${contact - 10}v20`}
            stroke={f.text}
            strokeWidth={2}
            opacity={transition ? 0 : 0.5}
            style={{ pointerEvents: 'none' }}
          />
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
