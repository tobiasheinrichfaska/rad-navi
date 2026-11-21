import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { NavNode } from '../logic/tree.ts';
import { NO_BOX, surfaces, useDark, useReducedMotion } from './colors.ts';
import { DEFAULT_TEXTS, type WheelTexts } from './props.ts';

const borderless: CSSProperties = {
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  color: 'inherit',
  padding: '6px 4px',
  cursor: 'pointer',
};

/** The navigation over the whole screen: the way from the start at the top (each step tappable). */
export function Frame({
  path,
  onJump,
  status,
  texts = DEFAULT_TEXTS,
  children,
}: {
  path: readonly NavNode[];
  onJump: (index: number) => void;
  /** One short line at the right of the way (for example a sync in the background). */
  status?: string | undefined;
  texts?: Pick<WheelTexts, 'navigation' | 'path'>;
  children: ReactNode;
}) {
  const f = surfaces(useDark());
  return (
    <div
      role="dialog"
      aria-label={texts.navigation}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        background: f.ground,
        color: f.text,
        fontFamily: 'system-ui, sans-serif',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        overscrollBehavior: 'none',
        // Inherited by every field: no tap box (see NO_BOX).
        WebkitTapHighlightColor: NO_BOX.WebkitTapHighlightColor,
      }}
    >
      <nav
        aria-label={texts.path}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px 4px 10px' }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: 16,
          }}
        >
          {path.map((k, i) => (
            <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: f.quiet, padding: '0 2px' }}>›</span>}
              {i < path.length - 1 ? (
                <button
                  type="button"
                  style={{ ...borderless, textDecoration: 'underline' }}
                  onClick={() => onJump(i)}
                >
                  {k.name}
                </button>
              ) : (
                <strong style={{ padding: '6px 4px' }}>{k.name}</strong>
              )}
            </span>
          ))}
        </div>
        {status && (
          <span
            role="status"
            title={status}
            style={{
              fontSize: 12,
              color: f.quiet,
              maxWidth: '45%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 6px',
            }}
          >
            {status}
          </span>
        )}
      </nav>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
    </div>
  );
}

/** A page appears out of the field that grew over the screen: it fades in, a little from below. */
export function FadeIn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    ref.current?.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'ease-out' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the page appears
  }, []);
  return (
    <div ref={ref} style={{ height: '100%' }}>
      {children}
    </div>
  );
}

/** A page the app does not draw (yet): its name on its area's colour. */
export function Placeholder({
  node,
  color,
  back,
  onBack,
  texts = DEFAULT_TEXTS,
}: {
  node: NavNode;
  color: string;
  back: NavNode | undefined;
  onBack: () => void;
  texts?: Pick<WheelTexts, 'placeholder' | 'placeholderPlanned' | 'backButton'>;
}) {
  const f = surfaces(useDark());
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '0 12px 12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: color,
          color: '#fff',
          borderRadius: 14,
          padding: '28px 18px',
          fontSize: 30,
          fontWeight: 700,
          opacity: node.planned ? 0.6 : 1,
        }}
      >
        {node.name}
      </div>
      <p style={{ margin: 0, fontSize: 17 }}>
        {node.planned ? texts.placeholderPlanned : texts.placeholder(node.name)}
      </p>
      <div style={{ flex: 1 }} />
      {back && (
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '16px',
            fontSize: 18,
            borderRadius: 12,
            border: 'none',
            background: f.back,
            color: f.text,
          }}
        >
          {texts.backButton(back.name)}
        </button>
      )}
    </div>
  );
}
