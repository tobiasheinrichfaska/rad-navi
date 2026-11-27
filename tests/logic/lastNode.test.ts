import { describe, expect, it } from 'vitest';
import { loadLastNode, saveLastNode, type NodeStorage } from '../../src/logic/lastNode.ts';

const memory = () => {
  const map = new Map<string, string>();
  const storage: NodeStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
  return { map, storage };
};
const known = (id: string) => id === 'one/alpha' || id === 'two/beta';

describe('remembered page', () => {
  it('restores a stored node id and stores nothing but that id under the key', () => {
    const { map, storage } = memory();
    expect(loadLastNode(storage, 'k', known)).toBeUndefined();
    expect(saveLastNode(storage, 'k', 'two/beta')).toBe(true);
    expect([...map.entries()]).toEqual([['k', 'two/beta']]);
    expect(loadLastNode(storage, 'k', known)).toBe('two/beta');
  });

  it('an id the tree no longer has gives none (the navigation starts on the first page)', () => {
    const { map, storage } = memory();
    map.set('k', 'gone/page');
    expect(loadLastNode(storage, 'k', known)).toBeUndefined();
    map.set('k', 'x'.repeat(301));
    expect(loadLastNode(storage, 'k', () => true)).toBeUndefined();
  });

  it('ignores the wheel (null) and an empty id', () => {
    const { map, storage } = memory();
    expect(saveLastNode(storage, 'k', null)).toBe(false);
    expect(saveLastNode(storage, 'k', '')).toBe(false);
    expect(map.size).toBe(0);
  });

  it('never throws with no, blocked or full storage', () => {
    expect(loadLastNode(undefined, 'k', known)).toBeUndefined();
    expect(saveLastNode(undefined, 'k', 'one/alpha')).toBe(false);
    const blocked: NodeStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadLastNode(blocked, 'k', known)).toBeUndefined();
    expect(saveLastNode(blocked, 'k', 'one/alpha')).toBe(false);
    expect(
      loadLastNode(memory().storage, 'k', () => {
        throw new Error('bad validator');
      }),
    ).toBeUndefined();
  });

  it('saving with a check stores only an id the start can open again', () => {
    const { map, storage } = memory();
    expect(saveLastNode(storage, 'k', 'two/beta', known)).toBe(true);
    expect(saveLastNode(storage, 'k', 'inner/page', known)).toBe(false);
    expect(map.get('k')).toBe('two/beta'); // the last page that can be reopened stays
    expect(
      saveLastNode(storage, 'k', 'one/alpha', () => {
        throw new Error('bad validator');
      }),
    ).toBe(false);
  });
});
