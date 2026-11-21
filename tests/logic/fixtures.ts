// Invented test trees — the package itself ships no app data.
import { areaNode, distributor, type NavNode, type PageTable } from '../../src/logic/tree.ts';

/** Nine areas of three pages each (27 pages), for the wheel geometry tests. */
export function evenTree(): NavNode {
  const pages: Record<string, { name: string }> = {};
  const areas = Array.from({ length: 9 }, (_, i) => {
    const ids = [0, 1, 2].map((j) => `a${i}p${j}`);
    for (const [j, id] of ids.entries()) pages[id] = { name: `Page ${i}.${j}` };
    return { id: `a${i}`, name: `Area ${i}`, ids };
  });
  return distributor(
    'root',
    'Root',
    areas.map((a) => areaNode(pages, a.id, a.name, a.ids)),
  );
}

/** Pages of the small mixed tree. `delta` and `epsilon` do not exist yet. */
export const SMALL_PAGES: PageTable = {
  alpha: { name: 'Alpha' },
  beta: { name: 'Beta' },
  gamma: { name: 'Gamma' },
  delta: { name: 'Delta', planned: true },
  epsilon: { name: 'Epsilon', planned: true },
  zeta: { name: 'Zeta' },
};

/**
 * Four areas: One has 2 pages, Two has 4, Three has 3, Four has 2; `beta` stands in One and Two,
 * `alpha` in One and Three, `gamma` in Two and Three. Four holds only planned pages.
 */
export function smallTree(): NavNode {
  return distributor('root', 'Root', [
    areaNode(SMALL_PAGES, 'one', 'One', ['alpha', 'beta']),
    areaNode(SMALL_PAGES, 'two', 'Two', ['beta', 'gamma', 'delta', 'epsilon']),
    areaNode(SMALL_PAGES, 'three', 'Three', ['zeta', 'alpha', 'gamma']),
    areaNode(SMALL_PAGES, 'four', 'Four', ['delta', 'epsilon']),
  ]);
}
