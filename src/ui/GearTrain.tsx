import {
  turns,
  tipRadius,
  ringRadius,
  rootRadius,
  type Gear,
  type GearName,
  type GearTrain,
} from '../logic/gears.ts';
import { fitLabel } from '../logic/shortcuts.ts';
import { gearPath } from '../logic/wheel.ts';
import type { GearColors } from './colors.ts';

// The coupling of the wheels as a gear train behind them: the rings are a little see-through, the
// train shows behind them like the works behind an open dial.

function GearShape({
  gear,
  turn,
  module,
  color,
  edge,
  axle,
  opacity = 1,
}: {
  gear: Gear;
  turn: number;
  module: number;
  color: string;
  edge: string;
  axle: string;
  opacity?: number;
}) {
  const tip = tipRadius(gear, module);
  const root = rootRadius(gear, module);
  return (
    // where the gear stands, for the local checks
    <g data-gear={gear.name} data-x={gear.x} data-y={gear.y} data-tip={tip} opacity={opacity}>
      <path
        transform={`translate(${gear.x} ${gear.y}) rotate(${(turn * 180) / Math.PI})`}
        d={gearPath(gear.teeth, root, tip)}
        fill={color}
        stroke={edge}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* spokes' ring and axle */}
      <circle
        cx={gear.x}
        cy={gear.y}
        r={ringRadius(gear, module)}
        fill="none"
        stroke={edge}
        strokeWidth={1}
        opacity={0.5}
      />
      <circle cx={gear.x} cy={gear.y} r={Math.max(5, module * 0.9)} fill={axle} />
    </g>
  );
}

/** Opacity of the original hub gear while its copy is carried. */
export const FADED = 0.3;

/** The gears behind the wheels (big compound gear, idler, small compound gear). */
export function GearsBehind({
  train,
  bottom,
  colors,
  opacity,
}: {
  train: GearTrain;
  /** Turn of the lower hub gear (= the lower wheel's turn). */
  bottom: number;
  colors: GearColors;
  opacity: number;
}) {
  const angles = turns(train, bottom);
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}>
      {train.gears.map((gear, i) =>
        gear.name === 'bottom' || gear.name === 'top' ? null : (
          <GearShape
            key={gear.name}
            gear={gear}
            turn={angles[i] ?? 0}
            module={train.module}
            color={gear.name === 'compoundLarge' ? colors.dark : colors.middle}
            edge={gear.name === 'compoundLarge' ? colors.middle : colors.dark}
            axle={colors.light}
          />
        ),
      )}
    </g>
  );
}

/** The hub gears, in front: each turns with its wheel. */
export function HubGears({
  train,
  bottom,
  colors,
  opacity,
  faded,
}: {
  train: GearTrain;
  bottom: number;
  colors: GearColors;
  opacity: number;
  /** A hub gear in the hand: the original stands see-through while its copy is carried. */
  faded?: GearName | undefined;
}) {
  const angles = turns(train, bottom);
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}>
      {train.gears.map((gear, i) =>
        gear.name === 'bottom' || gear.name === 'top' ? (
          <GearShape
            opacity={gear.name === faded ? FADED : 1}
            key={gear.name}
            gear={gear}
            turn={angles[i] ?? 0}
            module={train.module}
            color={colors.middle}
            edge={colors.dark}
            axle={colors.dark}
          />
        ) : null,
      )}
    </g>
  );
}

/**
 * The copy of a hub gear carried by a finger or the mouse: full colour, opaque, drawn on top of
 * everything, with the name of the page it would point to on its hub.
 */
export function HubCopy({
  gear,
  module,
  x,
  y,
  colors,
  name,
  ground,
  text,
  hubRadius,
}: {
  gear: Gear;
  module: number;
  x: number;
  y: number;
  colors: GearColors;
  name: string;
  ground: string;
  text: string;
  hubRadius: number;
}) {
  const tip = tipRadius(gear, module);
  const root = rootRadius(gear, module);
  const label = fitLabel(name, hubRadius * 1.7, Math.max(12, hubRadius * 0.6));
  return (
    <g data-copy={gear.name} transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      <circle r={tip} cy={5} fill="#000" opacity={0.22} />
      <path
        d={gearPath(gear.teeth, root, tip)}
        fill={colors.middle}
        stroke={colors.dark}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle r={ringRadius(gear, module)} fill="none" stroke={colors.dark} strokeWidth={1} />
      <circle r={hubRadius} fill={ground} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill={text}
        fontSize={label.size}
        fontWeight={700}
      >
        {label.text}
      </text>
    </g>
  );
}
