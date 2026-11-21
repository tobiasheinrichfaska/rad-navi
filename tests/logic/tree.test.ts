// The tree is input: generic rules over a small tree defined in the fixtures.
import { describe, expect, it } from 'vitest';
import {
  areaNode,
  areaOf,
  distributor,
  nodesWithPage,
  pagesIn,
  pathTo,
  type NavNode,
} from '../../src/logic/tree.ts';
import { layoutOf, neighbour, pageWidth, groupWedge } from '../../src/logic/ring.ts';
import { SMALL_PAGES, evenTree, smallTree } from './fixtures.ts';

const allNodes = (k: NavNode): NavNode[] => [k, ...(k.children ?? []).flatMap(allNodes)];

describe('page tree', () => {
  const tree = smallTree();

  it('every page stands in the tree, a page twice only in different areas, ids unique', () => {
    expect([...new Set(pagesIn(tree))].sort()).toEqual(Object.keys(SMALL_PAGES).sort());
    const nodes = allNodes(tree);
    expect(new Set(nodes.map((k) => k.id)).size).toBe(nodes.length);
    // a node is either a page or a distributor
    for (const k of nodes) expect(!!k.page !== !!k.children?.length).toBe(true);
    for (const area of tree.children ?? []) {
      const pages = (area.children ?? []).map((k) => k.page);
      expect(new Set(pages).size).toBe(pages.length);
    }
    // a page needed in two situations stands in both
    expect(nodesWithPage(tree, 'beta').map((k) => k.id)).toEqual(['one/beta', 'two/beta']);
    expect(nodesWithPage(tree, 'alpha')).toHaveLength(2);
    expect(nodesWithPage(tree, 'zeta')).toHaveLength(1);
    expect(nodesWithPage(tree, 'nope')).toEqual([]);
  });

  it('areas may differ in size; each keeps its pages in the given order', () => {
    expect(tree.children?.map((a) => a.children?.length)).toEqual([2, 4, 3, 2]);
    expect(pagesIn(tree)).toEqual([
      'alpha',
      'beta',
      'beta',
      'gamma',
      'delta',
      'epsilon',
      'zeta',
      'alpha',
      'gamma',
      'delta',
      'epsilon',
    ]);
  });

  it('a name means one page: areas differ, the same name is the same page', () => {
    const areas = (tree.children ?? []).map((b) => b.name);
    expect(new Set(areas).size).toBe(areas.length);
    const pageNames = Object.values(SMALL_PAGES).map((s) => s.name);
    expect(new Set(pageNames).size).toBe(pageNames.length);
    for (const name of areas) expect(pageNames).not.toContain(name);
    // the same page carries the same name wherever it stands
    for (const id of Object.keys(SMALL_PAGES)) {
      for (const node of nodesWithPage(tree, id)) expect(node.name).toBe(SMALL_PAGES[id]?.name);
    }
  });

  it('a distributing node is planned only when everything below it is', () => {
    for (const k of allNodes(tree).filter((k) => k.children)) {
      expect(!!k.planned).toBe((k.children ?? []).every((c) => c.planned));
    }
    const byId = (id: string) => tree.children?.find((a) => a.id === id);
    expect(byId('four')?.planned).toBe(true);
    expect(byId('two')?.planned).toBeUndefined();
    expect(tree.planned).toBeUndefined();
    // a planned page is flagged on its node, in every area it stands in
    expect(nodesWithPage(tree, 'delta').every((k) => k.planned)).toBe(true);
    expect(nodesWithPage(tree, 'alpha').every((k) => k.planned === undefined)).toBe(true);
    // all-planned all the way up
    expect(distributor('r', 'R', [byId('four') as NavNode]).planned).toBe(true);
  });

  it('refuses an unknown page id with a clear reason', () => {
    expect(() => areaNode(SMALL_PAGES, 'x', 'X', ['alpha', 'missing'])).toThrow(/missing/);
  });

  it('way and area', () => {
    expect(pathTo(tree, 'two/gamma').map((k) => k.name)).toEqual(['Root', 'Two', 'Gamma']);
    expect(pathTo(tree, 'gibt-es-nicht')).toEqual([]);
    expect(areaOf(tree, 'three/zeta').name).toBe('Three');
    expect(areaOf(tree, 'root').name).toBe('Root');
    // the way back from a shared page leads into the area one came from
    expect(areaOf(tree, 'one/beta').id).toBe('one');
    expect(areaOf(tree, 'two/beta').id).toBe('two');
  });

  it('the swipe neighbour is the page beside in the same area, none past its ends', () => {
    const two = tree.children?.find((k) => k.id === 'two') as NavNode;
    const [beta, gamma, delta, epsilon] = two.children as NavNode[];
    expect(neighbour(two, gamma as NavNode, 1)).toBe(delta);
    expect(neighbour(two, gamma as NavNode, -1)).toBe(beta);
    expect(neighbour(two, epsilon as NavNode, 1)).toBeUndefined();
    expect(neighbour(two, beta as NavNode, -1)).toBeUndefined();
    // a node of another area is no neighbour here
    const one = tree.children?.find((k) => k.id === 'one') as NavNode;
    expect(neighbour(two, (one.children as NavNode[])[0] as NavNode, 1)).toBeUndefined();
  });
});

describe('the tree as wheel layout', () => {
  it('areas and their pages in a row, an even tree arranged evenly', () => {
    const even = layoutOf(evenTree());
    expect(even.groups.map((g) => [g.node.name, g.start, g.count])).toEqual(
      Array.from({ length: 9 }, (_, i) => [`Area ${i}`, 3 * i, 3]),
    );
    expect(even.pages).toHaveLength(27);
    expect(even.pages[25]?.node.name).toBe('Page 8.1');
    expect(even.pages[25]?.group).toBe(8);
  });

  it('wheel widths are proportional to the page counts of the small mixed tree', () => {
    const layout = layoutOf(smallTree());
    expect(layout.groups.map((g) => [g.node.name, g.start, g.count])).toEqual([
      ['One', 0, 2],
      ['Two', 2, 4],
      ['Three', 6, 3],
      ['Four', 9, 2],
    ]);
    const w = pageWidth(layout);
    expect(w).toBeCloseTo((2 * Math.PI) / 11, 12);
    layout.groups.forEach((g, i) => {
      expect(groupWedge(layout, i, 0).width).toBeCloseTo(g.count * w, 12);
    });
    // the area widths add up to the full circle
    const sum = layout.groups.reduce((s, _g, i) => s + groupWedge(layout, i, 0).width, 0);
    expect(sum).toBeCloseTo(2 * Math.PI, 12);
  });

  it('a shared page appears once per area in the row', () => {
    const layout = layoutOf(smallTree());
    const betas = layout.pages.filter((p) => p.node.page === 'beta');
    expect(betas.map((p) => p.group)).toEqual([0, 1]);
    expect(betas.map((p) => p.node.id)).toEqual(['one/beta', 'two/beta']);
  });

  it('a field without pages is a page of its own', () => {
    const flat = layoutOf({
      id: 'x',
      name: 'X',
      children: [{ id: 'a', name: 'A', page: 'alpha' }],
    });
    expect(flat.groups[0]?.count).toBe(1);
    expect(flat.pages[0]?.node.id).toBe('a');
  });
});
