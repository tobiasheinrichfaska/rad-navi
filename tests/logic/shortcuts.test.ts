// Shortcuts: pure assign/clear/resolve, and the text form that lets them survive a restart.
import { describe, expect, it } from 'vitest';
import { layoutOf } from '../../src/logic/ring.ts';
import {
  assign,
  cleanShortcuts,
  clear,
  fitLabel,
  hubTapAction,
  isEmpty,
  loadShortcuts,
  parseShortcuts,
  resolveShortcut,
  saveShortcuts,
  serializeShortcuts,
  type HubShortcuts,
  type StorageLike,
} from '../../src/logic/shortcuts.ts';
import { evenTree, smallTree } from './fixtures.ts';

/** A storage in memory, with switches for the failures real ones have. */
function fakeStorage(fail: { get?: boolean; set?: boolean; remove?: boolean } = {}) {
  const data = new Map<string, string>();
  const storage: StorageLike & { data: Map<string, string> } = {
    data,
    getItem: (k) => {
      if (fail.get) throw new Error('SecurityError');
      return data.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (fail.set) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k) => {
      if (fail.remove) throw new Error('blocked');
      data.delete(k);
    },
  };
  return storage;
}

describe('shortcuts: assign, clear, resolve', () => {
  it('assigns and clears without touching the other hub or the old value', () => {
    const a: HubShortcuts = { top: 'a0/a0p0' };
    const b = assign(a, 'bottom', 'a1/a1p2');
    expect(b).toEqual({ top: 'a0/a0p0', bottom: 'a1/a1p2' });
    expect(a).toEqual({ top: 'a0/a0p0' });
    expect(assign(b, 'top', 'x')).toEqual({ top: 'x', bottom: 'a1/a1p2' });
    expect(clear(b, 'top')).toEqual({ bottom: 'a1/a1p2' });
    expect(clear({}, 'top')).toEqual({});
    expect(assign({ top: 'x' }, 'top', '')).toEqual({});
    expect(isEmpty({})).toBe(true);
    expect(isEmpty(b)).toBe(false);
  });

  it('finds the page of a node id in a layout; unset or stale ids give none', () => {
    const layout = layoutOf(evenTree());
    expect(resolveShortcut(layout, 'a0/a0p0')).toBe(0);
    expect(resolveShortcut(layout, 'a8/a8p2')).toBe(26);
    expect(resolveShortcut(layout, undefined)).toBeUndefined();
    expect(resolveShortcut(layout, '')).toBeUndefined();
    expect(resolveShortcut(layout, 'a99/gone')).toBeUndefined();
    // an area that is not a page of this level is not found either
    expect(resolveShortcut(layout, 'a0')).toBeUndefined();
  });

  it('a page standing in two areas is found by its own node id', () => {
    const layout = layoutOf(smallTree());
    const ids = layout.pages.map((s) => s.node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [k, id] of ids.entries()) expect(resolveShortcut(layout, id)).toBe(k);
  });
});

describe('shortcuts: the text form (restart survival)', () => {
  it('serialize then parse gives the same shortcuts, in every combination', () => {
    for (const s of [{}, { top: 'a' }, { bottom: 'b' }, { top: 'a/b', bottom: 'ä ö/ü "q"' }]) {
      expect(parseShortcuts(serializeShortcuts(s))).toEqual(s);
    }
    expect(serializeShortcuts({})).toBe('{"v":1}');
    expect(serializeShortcuts({ top: 'a', bottom: 'b' })).toBe('{"v":1,"top":"a","bottom":"b"}');
  });

  it('a stored id of a page that no longer exists survives the text and resolves to none', () => {
    const stored = parseShortcuts(serializeShortcuts({ top: 'a99/gone', bottom: 'a1/a1p1' }));
    const layout = layoutOf(evenTree());
    expect(resolveShortcut(layout, stored.top)).toBeUndefined();
    expect(resolveShortcut(layout, stored.bottom)).toBe(4);
  });

  it('garbage, other versions, unknown fields and wrong types give empty shortcuts and never throw', () => {
    const bad: unknown[] = [
      undefined,
      null,
      42,
      true,
      [],
      {},
      '',
      'not json',
      '{',
      'null',
      '[]',
      '"x"',
      '123',
      '{"v":2,"top":"a"}',
      '{"top":"a"}',
      '{"v":"1","top":"a"}',
      '{"v":1,"top":5}',
      '{"v":1,"top":""}',
      '{"v":1,"top":null}',
      '{"v":1,"top":["a"]}',
      '{"v":1,"top":"a","extra":1}',
      '{"v":1,"__proto__":{"top":"a"}}',
      '{"v":1,"top":"a","bottom":{}}',
      `{"v":1,"top":"${'x'.repeat(1000)}"}`,
      '\u0000￿',
    ];
    for (const text of bad) expect(parseShortcuts(text), String(text)).toEqual({});
    // a whole value is dropped, not half of it: one bad field spoils the lot
    expect(parseShortcuts('{"v":1,"top":"a","bottom":3}')).toEqual({});
  });

  it('cleans what an app passes in (only top and bottom, only valid ids)', () => {
    expect(cleanShortcuts({ top: 'a', bottom: 'b' })).toEqual({ top: 'a', bottom: 'b' });
    expect(cleanShortcuts({ top: 'a', other: 1 })).toEqual({});
    expect(cleanShortcuts({ top: 3 })).toEqual({});
    expect(cleanShortcuts(null)).toEqual({});
    expect(cleanShortcuts('x')).toEqual({});
    expect(cleanShortcuts([])).toEqual({});
  });
});

describe('shortcuts: the storage wrapper (no DOM needed)', () => {
  it('saves and loads under the key; two keys do not mix', () => {
    const storage = fakeStorage();
    expect(saveShortcuts(storage, 'k1', { top: 'a', bottom: 'b' })).toBe(true);
    expect(saveShortcuts(storage, 'k2', { top: 'z' })).toBe(true);
    expect(loadShortcuts(storage, 'k1')).toEqual({ top: 'a', bottom: 'b' });
    expect(loadShortcuts(storage, 'k2')).toEqual({ top: 'z' });
    expect(storage.data.get('k1')).toBe('{"v":1,"top":"a","bottom":"b"}');
  });

  it('a restart is a new load from the same storage', () => {
    const storage = fakeStorage();
    saveShortcuts(storage, 'k', { bottom: 'a3/a3p1' });
    // "restart": nothing of the old state, only the storage is still there
    expect(loadShortcuts(storage, 'k')).toEqual({ bottom: 'a3/a3p1' });
  });

  it('empty shortcuts remove the entry', () => {
    const storage = fakeStorage();
    saveShortcuts(storage, 'k', { top: 'a' });
    expect(saveShortcuts(storage, 'k', {})).toBe(true);
    expect(storage.data.has('k')).toBe(false);
  });

  it('no storage, blocked storage and quota errors are tolerated', () => {
    expect(loadShortcuts(undefined, 'k')).toEqual({});
    expect(saveShortcuts(undefined, 'k', { top: 'a' })).toBe(false);
    expect(loadShortcuts(fakeStorage({ get: true }), 'k')).toEqual({});
    expect(saveShortcuts(fakeStorage({ set: true }), 'k', { top: 'a' })).toBe(false);
    expect(saveShortcuts(fakeStorage({ remove: true }), 'k', {})).toBe(false);
  });

  it('garbage in the storage loads as empty', () => {
    const storage = fakeStorage();
    storage.data.set('k', '{"v":1,"top":');
    expect(loadShortcuts(storage, 'k')).toEqual({});
  });
});

describe('shortcuts: label fitting', () => {
  it('keeps a short name, shrinks a longer one, cuts the longest', () => {
    expect(fitLabel('Ok', 40, 14)).toEqual({ text: 'Ok', size: 14 });
    const mid = fitLabel('Page 0.1', 40, 14);
    expect(mid.text).toBe('Page 0.1');
    expect(mid.size).toBeLessThan(14);
    const cut = fitLabel('A very long page name', 40, 14);
    expect(cut.text.endsWith('…')).toBe(true);
    expect(cut.size).toBe(8);
    expect(fitLabel('', 40, 14).text).toBe('');
  });
});

describe('hubTapAction: the fallback chain of a hub tap', () => {
  it('a resolvable shortcut wins, even with an old action', () => {
    expect(hubTapAction(true, false)).toBe('shortcut');
    expect(hubTapAction(true, true)).toBe('shortcut');
  });
  it('without a shortcut the old action runs', () => {
    expect(hubTapAction(false, true)).toBe('old');
  });
  it('with neither, a tap assigns the page at the contact', () => {
    expect(hubTapAction(false, false)).toBe('assign');
  });
});
