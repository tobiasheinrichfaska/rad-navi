// Guards for the navigation's look: Safari's tap highlight and the focus ring draw the element's
// box — a rectangle around a wheel piece. Every tappable field switches both off.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NO_BOX } from '../../src/ui/colors.ts';

const source = (name: string) =>
  readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');

describe('Navigation: no boxes around fields', () => {
  it('the shared style switches off tap highlight and focus ring', () => {
    expect(NO_BOX).toEqual({ WebkitTapHighlightColor: 'transparent', outline: 'none' });
  });

  it('the frame passes the transparent tap highlight down to every field', () => {
    expect(source('Frame.tsx')).toMatch(/WebkitTapHighlightColor: NO_BOX\.WebkitTapHighlightColor/);
  });

  it('every tappable field carries the style', () => {
    for (const name of ['Ring.tsx', 'WheelNav.tsx']) {
      const text = source(name);
      const buttons = (text.match(/role(?::|=\{)[^,\n]*'button'|role="button"/g) ?? []).length;
      // every use beside the import
      const withStyle = (text.match(/NO_BOX/g) ?? []).length - 1;
      expect(buttons, name).toBeGreaterThan(0);
      expect(withStyle, name).toBeGreaterThanOrEqual(buttons);
    }
  });
});

// The pages an app draws may be made for light only (white rows, inherited text); in dark mode the
// wheel's light text would sit on their white rows.
describe('Navigation: the real pages stay readable in dark mode', () => {
  it('a real page stands on a light sheet with its own dark text', () => {
    const sheet =
      /data-sheet="light"\s*style=\{\{([^}]*)\}\}/.exec(source('WheelNav.tsx'))?.[1] ?? '';
    expect(sheet).toMatch(/background: '#fff'/);
    expect(sheet).toMatch(/color: '#1d232a'/);
    expect(sheet).toMatch(/colorScheme: 'light'/);
  });
});
