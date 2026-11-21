import type { NavNode } from '../logic/tree.ts';
import { fieldWedge, wedgePath } from '../logic/wheel.ts';
import { colorOf, surfaces, useDark } from './colors.ts';
import { DEFAULT_TEXTS, type WheelTexts } from './props.ts';
import { HALF, INNER, OUTER } from './wheelDrawing.ts';

/**
 * The wheel small on a detail page: the level the page was opened from, the page's field at the
 * top, "↩" in the middle. A tap goes back to that level.
 */
export function MiniWheel({
  tree,
  parent,
  here,
  onBack,
  texts = DEFAULT_TEXTS,
}: {
  tree: NavNode;
  parent: NavNode;
  here: NavNode;
  onBack: () => void;
  texts?: Pick<WheelTexts, 'backTo'>;
}) {
  const f = surfaces(useDark());
  const children = parent.children ?? [];
  const n = children.length;
  const i = Math.max(0, children.indexOf(here));
  const turn = n > 0 ? -i * ((2 * Math.PI) / n) : 0;
  return (
    <button
      type="button"
      aria-label={texts.backTo(parent.name)}
      title={texts.backTo(parent.name)}
      onClick={onBack}
      style={{
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 84,
        height: 84,
        padding: 0,
        border: 'none',
        borderRadius: '50%',
        background: f.ground,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
        cursor: 'pointer',
      }}
    >
      <svg
        viewBox={`${-HALF} ${-HALF} ${2 * HALF} ${2 * HALF}`}
        width={84}
        height={84}
        aria-hidden="true"
      >
        {children.map((node, j) => (
          <path
            key={node.id}
            d={wedgePath(fieldWedge(j, turn, n), OUTER + 8, INNER)}
            fill={colorOf(tree, node)}
            opacity={j === i ? 1 : 0.55}
            stroke={j === i ? f.text : f.ground}
            strokeWidth={j === i ? 6 : 4}
          />
        ))}
        <circle r={INNER} fill={f.empty} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={f.text}
          fontSize={44}
          fontWeight={700}
        >
          ↩
        </text>
      </svg>
    </button>
  );
}
