// The pages of an app as a tree for the wheels. The tree is INPUT supplied by the app — this module
// holds only the generic types, builders and functions, never an app's own areas or pages.
//
// Shape: a root, its children are the areas (situations), their children are the pages. A page
// needed in several areas stands in several areas; its node id is then `<area>/<page>`, so node ids
// stay unique while the page id (`page`) repeats.

/** What the app says about one page. `planned` = does not exist yet (shown as a placeholder). */
export interface PageInfo {
  readonly name: string;
  readonly planned?: true;
}

/** The app's pages by page id (plain strings chosen by the app). */
export type PageTable = Readonly<Record<string, PageInfo>>;

/** A distributing node (`children`) or a page (`page`). Ids are unique in the tree. */
export interface NavNode {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly NavNode[];
  /** Page id, for a leaf. */
  readonly page?: string;
  readonly planned?: true;
}

/** A distributing node; it is planned only when everything below it is. */
export function distributor(id: string, name: string, children: readonly NavNode[]): NavNode {
  return {
    id,
    name,
    children,
    ...(children.every((k) => k.planned) ? { planned: true as const } : {}),
  };
}

/** An area of any number of pages; a page standing in several areas gets the area in its node id. */
export function areaNode(
  pages: PageTable,
  id: string,
  name: string,
  pageIds: readonly string[],
): NavNode {
  return distributor(
    id,
    name,
    pageIds.map((page) => {
      const info = pages[page];
      if (!info) throw new Error(`Unknown page "${page}" in area "${id}"`);
      return {
        id: `${id}/${page}`,
        name: info.name,
        page,
        ...(info.planned ? { planned: true as const } : {}),
      };
    }),
  );
}

/** The pages at the ends of a tree, in order (a page standing in several areas once each). */
export function pagesIn(tree: NavNode): string[] {
  if (tree.page) return [tree.page];
  return (tree.children ?? []).flatMap(pagesIn);
}

/** Every node that shows this page (one per area it stands in). */
export function nodesWithPage(tree: NavNode, page: string): NavNode[] {
  return [
    ...(tree.page === page ? [tree] : []),
    ...(tree.children ?? []).flatMap((k) => nodesWithPage(k, page)),
  ];
}

/** The nodes from the root to the node with this id (empty if absent). */
export function pathTo(tree: NavNode, id: string): NavNode[] {
  if (tree.id === id) return [tree];
  for (const child of tree.children ?? []) {
    const path = pathTo(child, id);
    if (path.length > 0) return [tree, ...path];
  }
  return [];
}

/** The root child a node belongs to (its area), the root itself for the root. */
export function areaOf(tree: NavNode, id: string): NavNode {
  return pathTo(tree, id)[1] ?? tree;
}
