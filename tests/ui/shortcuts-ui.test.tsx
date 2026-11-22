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

  it('an app without shortcuts or hub actions gets two focusable hubs that offer to assign', () => {
    const html = render();
    for (const hub of ['top', 'bottom']) {
      const tag = hubTag(html, hub);
      expect(tag).toMatch(/role="button"/);
      expect(tag).toMatch(/tabindex="0"/);
      // says what a tap does, with the page at the contact
      expect(tag).toMatch(/aria-label="Set shortcut to [^"]+"/);
    }
    expect(DEFAULT_TEXTS.shortcutAssign('X')).toBe('Set shortcut to X');
    expect(DEFAULT_TEXTS.shortcutEmpty).toBe('Set shortcut to the current page');
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
    expect(html).not.toContain('Set shortcut to');
  });

  it('every hub is a button; its label says what a tap does', () => {
    const isButton = (html: string, hub: string) =>
      /role="button"/.test(hubTag(html, hub)) && /tabindex="0"/.test(hubTag(html, hub));
    const aria = (html: string, hub: string) =>
      /aria-label="([^"]*)"/.exec(hubTag(html, hub))?.[1] ?? '';
    // extra action alone: the lower hub runs it, the upper one (no jump target) assigns
    const onlyExtra = render({ extraAction: extra });
    expect(aria(onlyExtra, 'bottom')).toBe('Extra');
    expect(aria(onlyExtra, 'top')).toMatch(/^Set shortcut to /);
    // jump target and extra action: both keep their old labels
    const both = render({ jumpTarget: () => 'a2/a2p0', extraAction: extra });
    expect(aria(both, 'bottom')).toBe(DEFAULT_TEXTS.jumpToTarget);
    expect(aria(both, 'top')).toBe('Extra');
    // a jump target without an extra action: the upper hub has nothing old, it assigns
    const jumpOnly = render({ jumpTarget: () => 'a2/a2p0' });
    expect(aria(jumpOnly, 'bottom')).toBe(DEFAULT_TEXTS.jumpToTarget);
    expect(aria(jumpOnly, 'top')).toMatch(/^Set shortcut to /);
    // a shortcut on one hub: that hub opens it, the other one assigns
    const one = render({ shortcuts: { top: 'a3/a3p1' } });
    expect(aria(one, 'top')).toBe('Shortcut to Page 3.1');
    expect(aria(one, 'bottom')).toMatch(/^Set shortcut to /);
    // a stale shortcut and no action: offers to assign again
    const stale = render({ shortcuts: { top: 'gone', bottom: 'gone' } });
    expect(aria(stale, 'top')).toMatch(/^Set shortcut to /);
    expect(aria(stale, 'bottom')).toMatch(/^Set shortcut to /);
    for (const html of [onlyExtra, both, jumpOnly, one, stale]) {
      expect(isButton(html, 'top')).toBe(true);
      expect(isButton(html, 'bottom')).toBe(true);
    }
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
      texts: {
        shortcutFor: (n) => `Kurzbefehl ${n}`,
        shortcutEmpty: 'leer',
        shortcutAssign: (n) => `Setze ${n}`,
      },
    });
    expect(html).toContain('aria-label="Kurzbefehl Page 0.0"');
    // the lower hub: an old action without a label falls back to the fixed text
    expect(html).toContain('aria-label="leer"');
    // no shortcut and nothing old: the assign text with the page name
    expect(render({ texts: { shortcutAssign: (n) => `Setze ${n}` } })).toMatch(
      /aria-label="Setze Page [^"]+"/,
    );
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

  it('the hubs are always buttons, and carry the no-box style', () => {
    expect(nav).not.toMatch(/look\.active/);
    expect(nav).toMatch(/role="button"/);
    expect(nav).toMatch(/aria-label=\{look\.aria\}/);
    expect(nav).toMatch(/style=\{NO_BOX\}/);
  });

  it('a tap decides through hubTapAction; a tap-assign is guarded and lights the gear', () => {
    expect(nav).toMatch(/hubTapAction\(/);
    // no assignment while a transition runs, none when there is no page at the contact, no flash
    // with reduced motion
    expect(nav).toMatch(/!transition && assignHere\(hub\) && !reducedMotion/);
    expect(nav).toMatch(/flash && highlight\(flash/);
    // the drag never assigns by itself: only its drop does, through the drop target
    expect(grab).not.toMatch(/assign/);
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
