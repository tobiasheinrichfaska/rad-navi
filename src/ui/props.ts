import type { ReactNode } from 'react';
import type { NavNode, PageTable } from '../logic/tree.ts';

/** Every text the package shows. The app passes the ones it wants to change (any language). */
export interface WheelTexts {
  /** Label of the whole navigation (screen readers). */
  readonly navigation: string;
  /** Label of the way shown at the top (screen readers). */
  readonly path: string;
  /** Label of the lower hub when it jumps to the jump target. */
  readonly jumpToTarget: string;
  /** Appended to the label of a planned piece (screen readers). */
  readonly planned: string;
  /** Label of the button to the page beside this one. */
  readonly neighbour: (name: string) => string;
  /** Label of the small wheel that goes one level back. */
  readonly backTo: (name: string) => string;
  /** Placeholder of a planned page. */
  readonly placeholderPlanned: string;
  /** Placeholder of a page the app does not draw yet. */
  readonly placeholder: (name: string) => string;
  /** The button on a placeholder that goes back. */
  readonly backButton: (name: string) => string;
}

export const DEFAULT_TEXTS: WheelTexts = {
  navigation: 'Navigation',
  path: 'Path',
  jumpToTarget: 'Jump to the suggested page',
  planned: ' (planned)',
  neighbour: (name) => `Next to: ${name}`,
  backTo: (name) => `Back to ${name}`,
  placeholderPlanned: 'This page is planned and will come later.',
  placeholder: (name) => `The page “${name}” will go here.`,
  backButton: (name) => `↩ Back to ${name}`,
};

/** An extra round button in the upper hub (and, without a jump target, the lower one). */
export interface ExtraAction {
  /** Its visible text and screen reader label. */
  readonly label: string;
  readonly onActivate: () => void;
}

/** What the wheel navigation takes. Everything of the app comes in here; nothing is imported. */
export interface WheelNavProps {
  /** The tree: root, its children are the areas, theirs the pages (see `distributor`/`areaNode`). */
  readonly tree: NavNode;
  /** The app's pages by id; used for the name of the jump target on the lower hub. */
  readonly pages?: PageTable | undefined;
  /** The real page for a page id, or none (then a placeholder shows). */
  readonly pageFor?: ((page: string) => ReactNode | undefined) | undefined;
  /** The page divides the whole height itself (a chat): no margins, no scrolling of the sheet. */
  readonly fullHeight?: ((page: string) => boolean) | undefined;
  /** Id of the area the wheels open on. Default: the first. */
  readonly startArea?: string | undefined;
  /** Node id of a page open from the start (where the app was); wins over `startArea`. */
  readonly startNode?: string | undefined;
  /** Node id of the page the lower hub jumps to now; none = no jump (the hub is inert). */
  readonly jumpTarget?: (() => string | undefined) | undefined;
  /** The open page changed (node id, null = the wheel): keep it so a restarted app opens there. */
  readonly onOpenChange?: ((node: string | null) => void) | undefined;
  /** Every way forward or back. */
  readonly onStep?: (() => void) | undefined;
  /** A page at the end of the tree is shown. */
  readonly onPage?: ((page: string) => void) | undefined;
  /** A short line in the top bar (for example a sync in the background). */
  readonly status?: string | undefined;
  /** An extra hub button (the upper hub; the lower one too while there is no jump target). */
  readonly extraAction?: ExtraAction | undefined;
  /** CSS selector of fields on a page that handle touch themselves: no page swipe starts on them. */
  readonly ownGestureSelector?: string | undefined;
  /** Texts; missing ones come from `DEFAULT_TEXTS`. */
  readonly texts?: Partial<WheelTexts> | undefined;
}
