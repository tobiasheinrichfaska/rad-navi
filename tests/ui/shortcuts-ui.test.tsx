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
  const hubTag = (html: string, hub: string) =>
    html.match(new RegExp(`<g[^>]*data-hub="${hub}"[^>]*>`))?.[0] ?? '';
  const extra = { label: 'Extra', onActivate: () => undefined };

  it('an app without shortcuts or hub actions sees plain hubs: no role, tab stop or label', () => {
    const html = render();
    for (const hub of ['top', 'bottom']) {
      const tag = hubTag(html, hub);
      expect(tag).not.toBe('');
      expect(tag).not.toMatch(/role=|tabindex=|aria-label=/);
    }
    expect(html).not.toContain(DEFAULT_TEXTS.shortcutEmpty);
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

  it('a hub is a button only when it has something to do', () => {
    const isButton = (html: string, hub: string) =>
      /role="button"/.test(hubTag(html, hub)) && /tabindex="0"/.test(hubTag(html, hub));
    // extra action alone: only the lower hub (the upper one needs the jump target as well)
    const onlyExtra = render({ extraAction: extra });
    expect(isButton(onlyExtra, 'bottom')).toBe(true);
    expect(isButton(onlyExtra, 'top')).toBe(false);
    // jump target and extra action: both, as before shortcuts
    const both = render({ jumpTarget: () => 'a2/a2p0', extraAction: extra });
    expect(isButton(both, 'bottom')).toBe(true);
    expect(isButton(both, 'top')).toBe(true);
    // a shortcut on one hub makes that hub a button
    const one = render({ shortcuts: { top: 'a3/a3p1' } });
    expect(isButton(one, 'top')).toBe(true);
    expect(isButton(one, 'bottom')).toBe(false);
    // a stale shortcut and no action: still plain
    const stale = render({ shortcuts: { top: 'gone', bottom: 'gone' } });
    expect(isButton(stale, 'top')).toBe(false);
    expect(isButton(stale, 'bottom')).toBe(false);
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
      extraAction: { label: '', onActivate: () => undefined },
      texts: { shortcutFor: (n) => `Kurzbefehl ${n}`, shortcutEmpty: 'leer' },
    });
    expect(html).toContain('aria-label="Kurzbefehl Page 0.0"');
    // a focusable hub whose old action has no label falls back to the "not set" text
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

  it('the hubs are buttons only while active, and carry the no-box style', () => {
    expect(nav).toMatch(/look\.active/);
    expect(nav).toMatch(/role: 'button'/);
    expect(nav).toMatch(/'aria-label': look\.aria/);
    expect(nav).toMatch(/style=\{NO_BOX\}/);
  });

  it('the hub grab ends only for its own pointer and survives no lost events', () => {
    const cancel = grab.slice(
      grab.indexOf('onPointerCancel'),
      grab.indexOf('onLostPointerCapture'),
    );
    expect(cancel).toMatch(/pointerId/);
    expect(grab).toMatch(/onLostPointerCapture/);
    expect(grab).toMatch(/addEventListener\('blur'/);
    expect(grab).toMatch(/addEventListener\('pointercancel'/);
    expect(grab).toMatch(/hasPointerCapture/);
    expect(nav).toMatch(/onLostPointerCapture=/);
  });

  it('the copy is drawn after the rings and the hub gears (on top of everything)', () => {
    const iCopy = nav.indexOf('<HubCopy');
    expect(iCopy).toBeGreaterThan(nav.indexOf('<HubGears'));
    expect(iCopy).toBeGreaterThan(nav.indexOf('<Ring'));
    expect(nav).toMatch(/pointerEvents: 'none'/);
  });
});
