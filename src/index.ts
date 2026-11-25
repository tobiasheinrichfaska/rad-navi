// Public entry of rad-navi: components, hooks, types and the UI-free logic.

// Components
export { WheelNav } from './ui/WheelNav.tsx';
export { Ring, RingGhost, type RingPiece } from './ui/Ring.tsx';
export { MiniWheel } from './ui/MiniWheel.tsx';
export { GearsBehind, HubCopy, HubGears } from './ui/GearTrain.tsx';
export { Frame, FadeIn, Placeholder } from './ui/Frame.tsx';

// Props, texts
export {
  DEFAULT_TEXTS,
  type ExtraAction,
  type WheelNavProps,
  type WheelTexts,
} from './ui/props.ts';

// Hooks (position, grip, history) and the inner-level registry
export {
  useGrip,
  usePosition,
  useProgress,
  useRingPath,
  type GripWheel,
  type Step,
} from './ui/position.ts';
export { browserStorage, useShortcuts } from './ui/useShortcuts.ts';
export { useHubGrab, type HubDrag } from './ui/useHubGrab.ts';
export { useBackGesture } from './ui/useBackGesture.ts';
export { closeInnerLevel, registerLevel, useInnerLevel } from './ui/innerLevels.ts';

// Colours and drawing units
export {
  NO_BOX,
  areaColor,
  colorOf,
  fieldColor,
  gearColors,
  keyboardFocus,
  surfaces,
  useDark,
  useMedia,
  useReducedMotion,
  type GearColors,
  type Surfaces,
} from './ui/colors.ts';
export { HALF, INNER, OUTER, pointAt } from './ui/wheelDrawing.ts';

// Logic: tree
export {
  areaNode,
  areaOf,
  distributor,
  nodesWithPage,
  pagesIn,
  pathTo,
  type NavNode,
  type PageInfo,
  type PageTable,
} from './logic/tree.ts';

// Logic: ring layout
export {
  TOP,
  fontSizeForRay,
  frictionSizes,
  groupMiddle,
  groupUnder,
  groupWedge,
  layoutOf,
  neighbour,
  pageAtPointer,
  pageUnder,
  pageWedge,
  pageWidth,
  positionForTurn,
  rayTextRotation,
  snapToGroup,
  snapToPage,
  swipe,
  toGroup,
  type FrictionSizes,
  type Group,
  type Layout,
  type Placement,
} from './logic/ring.ts';

// Logic: wheel geometry
export {
  angleDiff,
  fieldMiddle,
  fieldWedge,
  fieldWidth,
  gearPath,
  momentum,
  smooth,
  throwOff,
  unfold,
  wedgePath,
  wheelAngle,
  type Wedge,
} from './logic/wheel.ts';

// Logic: gear train
export {
  TOOTH_COUNTS,
  backgroundGearAt,
  gearTrain,
  mesh,
  overallRatio,
  ratioOf,
  ringRadius,
  rootRadius,
  tipRadius,
  turns,
  type Gear,
  type GearName,
  type GearTrain,
  type Point,
} from './logic/gears.ts';

// Logic: zones (what a point on the wheel screen is) and hub shortcuts
export {
  MIN_HUB_RADIUS,
  TAP_SLOP,
  TOUCH_LIFT,
  TURN_SLOP,
  copyPoint,
  dropTarget,
  gesture,
  hubRadius,
  zoneAt,
  type DropTarget,
  type Hub,
  type Zone,
  type ZoneGeometry,
  type ZoneKind,
} from './logic/zones.ts';
export {
  assign,
  cleanShortcuts,
  clear,
  fitLabel,
  hubTapAction,
  isEmpty,
  loadShortcuts,
  parseShortcuts,
  resolveShortcut,
  saveShortcuts,
  serializeShortcuts,
  type HubShortcuts,
  type HubTapAction,
  type StorageLike,
} from './logic/shortcuts.ts';

// Logic: remembered page
export { loadLastNode, saveLastNode, type NodeStorage } from './logic/lastNode.ts';

// Logic: mouse wheel
export { DEAD_ZONE, PIXELS_PER_PAGE, turnAngle, wheelSteps } from './logic/scroll.ts';

// Logic: choice wheel
export { topIndex, turnFor } from './logic/picker.ts';
