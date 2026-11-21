import type { KeyboardEvent } from 'react';
import type { NavNode } from '../logic/tree.ts';
import { wedgePath, type Wedge } from '../logic/wheel.ts';
import { fontSizeForRay, rayTextRotation } from '../logic/ring.ts';
import { NO_BOX, type Surfaces } from './colors.ts';
import { DEFAULT_TEXTS } from './props.ts';
import { pointAt } from './wheelDrawing.ts';

/** A page growing out of its piece over the wheel, or shrinking back into it (no name, no taps). */
export function RingGhost({
  wedge,
  cx,
  cy,
  inner,
  outer,
  color,
  opacity,
}: {
  wedge: Wedge;
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  color: string;
  opacity: number;
}) {
  return (
    <path
      transform={`translate(${cx} ${cy})`}
      d={wedgePath(wedge, outer, inner)}
      fill={color}
      opacity={opacity}
      style={{ pointerEvents: 'none' }}
    />
  );
}

export interface RingPiece {
  readonly id: string;
  readonly node: NavNode;
  readonly wedge: Wedge;
  readonly color: string;
  readonly opacity?: number;
  /** Opacity of the name (0 hides it). */
  readonly labelOpacity?: number;
  readonly marked?: boolean;
  /** Name for screen readers when the piece's name alone is ambiguous (a page in two areas). */
  readonly label?: string;
  /** Keyboard and screen readers open it (pointer taps go through the wheel). */
  readonly choose?: () => void;
}

/**
 * One ring of a wheel drawn in pixels around (cx, cy): pieces with their names along the ray. Marked
 * pieces get their outline above the neighbours.
 */
export function Ring({
  pieces,
  cx,
  cy,
  inner,
  outer,
  baseFont,
  seeThrough = 1,
  plannedLabel = DEFAULT_TEXTS.planned,
  surfaces,
}: {
  pieces: readonly RingPiece[];
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  baseFont: number;
  /** Fill opacity of the pieces: below 1 something behind the ring shows through. */
  seeThrough?: number;
  plannedLabel?: string;
  surfaces: Surfaces;
}) {
  const middle = (inner + outer) / 2;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {pieces.map((s) => {
        const text = pointAt(s.wedge.middle, middle);
        const keyboard = s.choose
          ? {
              role: 'button',
              tabIndex: 0,
              style: NO_BOX,
              'aria-label': `${s.label ?? s.node.name}${s.node.planned ? plannedLabel : ''}`,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  s.choose?.();
                }
              },
              onClick: (e: { detail: number }) => {
                if (e.detail === 0) s.choose?.();
              },
            }
          : {};
        return (
          <g key={s.id} {...keyboard} opacity={(s.opacity ?? 1) * (s.node.planned ? 0.5 : 1)}>
            <path
              d={wedgePath(s.wedge, outer, inner)}
              fill={s.color}
              fillOpacity={seeThrough}
              stroke={surfaces.ground}
              strokeWidth={s.wedge.width > 6.2 ? 0 : 1.5}
              strokeLinejoin="round"
            />
            {(s.labelOpacity ?? 1) > 0 && (
              <text
                x={text.x}
                y={text.y}
                transform={`rotate(${rayTextRotation(s.wedge.middle)} ${text.x} ${text.y})`}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                opacity={s.labelOpacity ?? 1}
                fontSize={fontSizeForRay(s.node.name, outer - inner, baseFont)}
                fontWeight={s.marked ? 700 : 600}
                style={{ pointerEvents: 'none' }}
              >
                {s.node.name}
              </text>
            )}
          </g>
        );
      })}
      {pieces
        .filter((s) => s.marked)
        .map((s) => (
          <path
            key={`outline-${s.id}`}
            d={wedgePath(s.wedge, outer, inner)}
            fill="none"
            stroke={surfaces.text}
            strokeWidth={2.5}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        ))}
    </g>
  );
}
