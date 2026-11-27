// The opt-in memory of the open page in the first render, and a source guard for its wiring.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WheelNav, type NodeStorage } from '../../src/index.ts';
import { smallTree } from '../logic/fixtures.ts';

const spy = (stored: Record<string, string>) => {
  const calls: string[] = [];
  const storage: NodeStorage = {
    getItem: (k) => {
      calls.push(`get ${k}`);
      return stored[k] ?? null;
    },
    setItem: (k) => void calls.push(`set ${k}`),
  };
  return { calls, storage };
};
const render = (props: Partial<Parameters<typeof WheelNav>[0]>) =>
  renderToString(
    createElement(WheelNav, {
      tree: smallTree(),
      pageFor: (page: string) => createElement('p', null, `real ${page}`),
      ...props,
    }),
  );

describe('WheelNav rememberKey', () => {
  it('opens the remembered page', () => {
    const { storage } = spy({ last: 'two/gamma' });
    expect(render({ rememberKey: 'last', rememberStorage: storage })).toContain('real gamma');
  });

  it('an unknown remembered id starts on the first page', () => {
    const { storage } = spy({ last: 'gone/page' });
    const html = render({ rememberKey: 'last', rememberStorage: storage });
    expect(html).toContain('>One<');
    expect(html).not.toContain('real ');
  });

  it('blocked storage starts on the first page without an error', () => {
    const blocked: NodeStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(render({ rememberKey: 'last', rememberStorage: blocked })).toContain('>One<');
  });

  it('startNode wins over the remembered page', () => {
    const { storage } = spy({ last: 'two/gamma' });
    const html = render({ rememberKey: 'last', rememberStorage: storage, startNode: 'one/beta' });
    expect(html).toContain('real beta');
  });

  it('a startNode the tree no longer has does not block the remembered page', () => {
    const { storage } = spy({ last: 'two/gamma' });
    const html = render({ rememberKey: 'last', rememberStorage: storage, startNode: 'gone/page' });
    expect(html).toContain('real gamma');
  });

  it('source: loading and saving use the same check of the start pages', () => {
    const text = readFileSync(new URL('../../src/ui/WheelNav.tsx', import.meta.url), 'utf8');
    expect(text).toMatch(/loadLastNode\([^;]*, isStartPage\)/);
    expect(text).toMatch(/saveLastNode\([^;]*, openNode, isStartPage\)/);
  });

  it('without the key the storage is never touched', () => {
    const { calls, storage } = spy({ last: 'two/gamma' });
    const html = render({ rememberStorage: storage });
    expect(calls).toEqual([]);
    expect(html).not.toContain('real ');
  });

  it('source: saving happens only under the key, through saveLastNode', () => {
    const text = readFileSync(new URL('../../src/ui/WheelNav.tsx', import.meta.url), 'utf8');
    expect(text).toMatch(/if \(rememberKey\)\s+saveLastNode\(/);
  });
});
