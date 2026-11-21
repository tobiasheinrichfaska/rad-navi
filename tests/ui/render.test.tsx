// Render smoke tests: server rendering needs no DOM. Gestures, animation and layout measuring run
// in effects and are not covered here (browser only, see manual_tests).
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WheelNav, DEFAULT_TEXTS, layoutOf } from '../../src/index.ts';
import { smallTree, SMALL_PAGES } from '../logic/fixtures.ts';

const render = (props: Partial<Parameters<typeof WheelNav>[0]> = {}) =>
  renderToString(createElement(WheelNav, { tree: smallTree(), ...props }));

describe('WheelNav server render', () => {
  it('renders the wheels with the area names without throwing', () => {
    const html = render();
    for (const name of ['One', 'Two', 'Three', 'Four']) expect(html).toContain(`>${name}<`);
    expect(html).toContain(`aria-label="${DEFAULT_TEXTS.navigation}"`);
  });

  it('shows the real page from the page renderer on the light sheet', () => {
    const html = render({
      startNode: 'one/alpha',
      pageFor: (page) => createElement('p', null, `real ${page}`),
    });
    expect(html).toContain('real alpha');
    expect(html).toContain('data-sheet="light"');
  });

  it('shows the planned placeholder text from the texts object', () => {
    const html = render({
      startNode: 'four/delta',
      texts: { placeholderPlanned: 'Coming later.' },
    });
    expect(html).toContain('Coming later.');
  });

  it('shows the placeholder for a page without a renderer result', () => {
    const html = render({ startNode: 'one/beta', pageFor: () => undefined });
    expect(html).toContain('The page “Beta” will go here.');
  });

  it('an unknown start node or start area opens the wheels without crashing', () => {
    expect(render({ startNode: 'nope' })).toContain('>One<');
    expect(render({ startArea: 'nope' })).toContain('>One<');
  });

  it('the wheel opens on the start area', () => {
    const html = render({ startArea: 'three' });
    expect(html).toContain('>Three<');
  });

  it('shows the status line, the jump target name and the extra action label', () => {
    const html = render({
      status: 'synced',
      pages: SMALL_PAGES,
      jumpTarget: () => 'two/gamma',
      extraAction: { label: 'Extra', onActivate: () => undefined },
    });
    expect(html).toContain('synced');
    expect(html).toContain('>Gamma<');
    expect(html).toContain('aria-label="Extra"');
    expect(html).toContain(`aria-label="${DEFAULT_TEXTS.jumpToTarget}"`);
  });

  it('without a jump target the extra action takes the lower hub', () => {
    const html = render({ extraAction: { label: 'Extra', onActivate: () => undefined } });
    expect(html).toContain('>Extra<');
    expect(html).not.toContain(DEFAULT_TEXTS.jumpToTarget);
  });

  it('gives every page of the fixture tree a piece', () => {
    expect(layoutOf(smallTree()).pages).toHaveLength(11);
  });
});
