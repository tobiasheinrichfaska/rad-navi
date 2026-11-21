import { turns, tipRadius, type Gear, type GearTrain } from '../logic/gears.ts';
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
}: {
  gear: Gear;
  turn: number;
  module: number;
  color: string;
  edge: string;
  axle: string;
}) {
  const tip = tipRadius(gear, module);
  const root = gear.pitchRadius - module * 1.1;
  return (
    // where the gear stands, for the local checks
    <g data-gear={gear.name} data-x={gear.x} data-y={gear.y} data-tip={tip}>
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
        r={root * 0.62}
        fill="none"
        stroke={edge}
        strokeWidth={1}
        opacity={0.5}
      />
      <circle cx={gear.x} cy={gear.y} r={Math.max(5, module * 0.9)} fill={axle} />
    </g>
  );
}

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
}: {
  train: GearTrain;
  bottom: number;
  colors: GearColors;
  opacity: number;
}) {
  const angles = turns(train, bottom);
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}>
      {train.gears.map((gear, i) =>
        gear.name === 'bottom' || gear.name === 'top' ? (
          <GearShape
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
