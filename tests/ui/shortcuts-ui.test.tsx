// Shortcuts in the first render (server rendering: no gestures, no storage) and the source guards
// that keep the zones apart.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXTS, WheelNav, browserStorage } from '../../src/index.ts';
import { evenTree, smallTree } from '../logic/fixtures.ts';

const render = (props: Partial<Parameters<typeof WheelNav>[0]> = {}) =>
  renderToString(createElement(WheelNav, { tree: evenTree(), ...props }));
const source = (name: string) =>
  readFileSync(new URL(`../../src/${name}`, import.meta.url), 'utf8');

describe('WheelNav shortcuts: first render', () => {
  it('without shortcuts both hubs say so and nothing else changes', () => {
    const html = render();
    expect(html.split(`aria-label="${DEFAULT_TEXTS.shortcutEmpty}"`)).toHaveLength(3);
    expect(html).not.toContain('Shortcut to');
    expect(html).not.toContain('data-copy');
    expect(html).not.toContain('data-drop');
  });

  it('with initial shortcuts the hubs carry the target name', () => {
    const html = render({ shortcuts: { top: 'a3/a3p1', bottom: 'a5/a5p0' } });
    expect(html).toContain('aria-label="Shortcut to Page 3.1"');
    expect(html).toContain('aria-label="Shortcut to Page 5.0"');
    expect(html).toContain('>Page 3.1<');
    expect(html).toContain('>Page 5.0<');
    expect(html).not.toContain(`aria-label="${DEFAULT_TEXTS.shortcutEmpty}"`);
  });

  it('a name from the pages table wins over the node name, like the jump target', () => {
    const html = render({
      tree: smallTree(),
      shortcuts: { bottom: 'one/alpha' },
      pages: { alpha: { name: 'Alpha (table)' } },
    });
    expect(html).toContain('aria-label="Shortcut to Alpha (table)"');
  });

  it('a stale id keeps the old behaviour: the hub shows what it always did', () => {
    const html = render({
      shortcuts: { bottom: 'gone', top: 'gone' },
      jumpTarget: () => 'a2/a2p0',
      extraAction: { label: 'Extra', onActivate: () => undefined },
    });
    expect(html).toContain(`aria-label="${DEFAULT_TEXTS.jumpToTarget}"`);
    expect(html).toContain('aria-label="Extra"');
    expect(html).not.toContain('Shortcut to');
  });

  it('a shortcut wins over the jump target and the extra action on its hub only', () => {
    const html = render({
      shortcuts: { bottom: 'a1/a1p1' },
      jumpTarget: () => 'a2/a2p0',
      extraAction: { label: 'Extra', onActivate: () => undefined },
    });
    expect(html).toContain('aria-label="Shortcut to Page 1.1"');
    expect(html).not.toContain(`aria-label="${DEFAULT_TEXTS.jumpToTarget}"`);
    expect(html).toContain('aria-label="Extra"');
  });

  it('garbage from the app is ignored, a storage key without a window does not throw', () => {
    const bad = { top: 5, extra: true } as never;
    expect(render({ shortcuts: bad })).not.toContain('Shortcut to');
    expect(() => render({ shortcutsStorageKey: 'k' })).not.toThrow();
    expect(browserStorage()).toBeUndefined();
  });

  it('the texts can be replaced', () => {
    const html = render({
      shortcuts: { top: 'a0/a0p0' },
      texts: { shortcutFor: (n) => `Kurzbefehl ${n}`, shortcutEmpty: 'leer' },
    });
    expect(html).toContain('aria-label="Kurzbefehl Page 0.0"');
    expect(html).toContain('aria-label="leer"');
  });
});

// Guards: one source of truth for zones, no second tap box on the lower hub, no lag in the turn.
describe('zones: source guards', () => {
  const nav = source('ui/WheelNav.tsx');
  const grab = source('ui/useHubGrab.ts');
  const position = source('ui/position.ts');

  it('WheelNav decides tap, grab and turn through zoneAt only', () => {
    expect(nav).toMatch(/zoneAt\(/);
    // the old whole-area tap zone of the lower hub is gone
    expect(nav).not.toMatch(/distance < innerBottom/);
    expect(nav).not.toMatch(/backgroundGearAt/);
  });

  it('the grip has no private 8 px threshold and keeps the angle from pointer-down', () => {
    expect(position).not.toMatch(/> 8\b/);
    expect(position).toMatch(/gesture\(/);
  });

  it('the zone is decided at pointer-down only and kept until pointer-up', () => {
    // the grip keeps the wheel it got at pointer-down, the hub grab its hub; moves never ask again
    const moveGrip = position.slice(
      position.indexOf('onPointerMove'),
      position.indexOf('onPointerUp'),
    );
    expect(moveGrip).not.toMatch(/wheelAt|zoneOf|zoneAt/);
    const moveHub = grab.slice(grab.indexOf('onPointerMove'), grab.indexOf('onPointerUp'));
    expect(moveHub).not.toMatch(/zoneOf|zoneAt/);
  });

  it('grabbing a hub never touches the position of the wheels', () => {
    expect(grab).not.toMatch(/position|usePosition|useGrip|setT|glide/);
  });

  it('the hubs are buttons that carry the no-box style', () => {
    expect(nav).toMatch(/role="button"[^>]*\n?[^>]*/);
    expect(nav).toMatch(/aria-label=\{look\.aria\}/);
    expect(nav).toMatch(/style=\{NO_BOX\}/);
  });

  it('the copy is drawn after the rings and the hub gears (on top of everything)', () => {
    const iCopy = nav.indexOf('<HubCopy');
    expect(iCopy).toBeGreaterThan(nav.indexOf('<HubGears'));
    expect(iCopy).toBeGreaterThan(nav.indexOf('<Ring'));
    expect(nav).toMatch(/pointerEvents: 'none'/);
  });
});
