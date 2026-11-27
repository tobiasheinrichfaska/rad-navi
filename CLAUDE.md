# CLAUDE.md — rad-navi

> Workspace-wide conventions (language, git, build, architecture, testing, collaboration) are kept
> in the owner's private workspace, outside this repo.

---

## Project overview

Shared wheel navigation („Reibräder“) for Tobias' React web apps: two coupled wheels (areas below,
pages above), swipe to the neighbouring page, back gesture goes one level back, remembers the last
page. Extracted 2026-11-21 from the web app where it originated, because several apps use copies
of it. **Status (2026-11-24): logic (`src/logic/`) and React components (`src/ui/`) ported with an
English API, 105 tests; not yet consumed by an app, not published to npm.** Old → new names:
[`docs/api-mapping.md`](docs/api-mapping.md). The apps that use the wheel are **not** converted from
here: they only get a note to check the package (Tobias 2026-11-21).

**The inventory of those apps (names, sizes, differences, order of conversion) names private
projects and lives in the private companion repo `rad-navi-privat`** (`private/rad-navi-privat/`,
`docs/bestandsaufnahme.md`). Never name them in this public repo.

**Platform:** web (SVG/DOM; not usable in React Native native builds)
**Language:** TypeScript + React (React as peer dependency)
**Architecture:** UI-free geometry/logic (`src/logic/`, exhaustively tested) and React components
(`src/ui/`); the tree of areas and pages (`NavNode`, `PageTable`), the page renderer, start/jump
targets and all texts (`WheelTexts`, English defaults) are **passed in by the app**, never imported.
Public entry: `src/index.ts`.

## Key rules

- **Public repo (AGPLv3 + commercial)**: no app data, no real names, no private project names, in
  files and in git history (the neutralised first commit replaced an earlier history, kept as a
  bundle in the private companion repo).
- **Nothing is published to npm or tagged without Tobias' OK.**
- Apps take it by Git tag (planned); a change here is a change in several apps, so semantic
  versioning, and each app switches over on its own.
- Do not change other apps' navigation code from here.
- Every extracted rule keeps the tests that guard it (arcs in pieces ≤ a quarter turn, no run-on after
  a rest, names fit the ring, no rectangular tap boxes, light sheet for real pages).

---

## Project Directory

| File/Folder | Purpose |
|---|---|
| `CLAUDE.md` | Project documentation and conventions |
| `README.md` | Short description, install, usage, license section |
| `FEATURES_REQUIRED.md` | Critical user paths (target; only the logic and first render are covered by tests) |
| `docs/api-mapping.md` | Every exported name: old German name → new English name → file (for migrating apps) |
| `manual_tests/` | Human-tester instructions (`README.md`, `01_mausrad.md`) |
| `src/index.ts` | Public entry: components, hooks, types, logic |
| `src/logic/tree.ts` | `NavNode`, `PageTable`, `areaNode`, `distributor`, `pagesIn`, `nodesWithPage`, `pathTo`, `areaOf` — the tree is an input |
| `src/logic/scroll.ts` | Mouse wheel → pages: `wheelSteps` (notch = one page, touchpad deltas add up), `turnAngle` (direction by the pointer's side, dead zone on the middle line) |
| `src/logic/zones.ts` | `zoneAt`: every point of the wheel screen is exactly one zone (`hub` / `turn` / `piece` / `none`), fixed at pointer-down; `hubRadius`, `gesture` (tap slop 8 px, turn slop 2 px), `dropTarget`, `copyPoint` |
| `src/logic/shortcuts.ts` | Hub shortcuts: `HubShortcuts`, `assign`, `clear`, `resolveShortcut`, versioned strict `serializeShortcuts`/`parseShortcuts`, storage wrapper `loadShortcuts`/`saveShortcuts` (takes a `StorageLike`), `fitLabel` |
| `src/logic/lastNode.ts` | Opt-in memory of the open page: `loadLastNode(storage, key, isValid)` / `saveLastNode(storage, key, id, isValid?)` (node id only, errors swallowed, `NodeStorage`); wired by `WheelNav` props `rememberKey` / `rememberStorage` (`startNode` wins when the tree has it, a stale one falls back to the remembered page; only pages of the top ring are stored and reopened, an inner-ring page leaves the stored one; unknown id → first page) |
| `src/logic/ring.ts`, `wheel.ts`, `gears.ts`, `picker.ts` | Layout of areas/pages on the wheels, geometry (arcs, settle, throw), gear train (ratio −1), choice wheel |
| `src/ui/WheelNav.tsx`, `props.ts` | The navigation component and its props/texts (`WheelNavProps`, `WheelTexts`, `DEFAULT_TEXTS`) |
| `src/ui/Ring.tsx`, `MiniWheel.tsx`, `GearTrain.tsx`, `Frame.tsx` | Wheel pieces, the small wheel on a page, gears, full-screen frame |
| `src/ui/useHubGrab.ts`, `useShortcuts.ts` | Tap/grab of a hub gear (carried copy); shortcut state with `onShortcutsChange` and localStorage persistence (`browserStorage`) |
| `src/ui/position.ts`, `colors.ts`, `wheelDrawing.ts`, `useBackGesture.ts`, `innerLevels.ts` | Pointer/position hooks, colours (light/dark, `NO_BOX`), drawing helpers, back gesture, inner levels |
| `tests/logic/`, `tests/ui/` | Unit tests (`lastNode`, `remember-ui`); guards (no tap boxes, light sheet), `renderToString` smoke tests, coupling guard (no app words, no foreign imports) |
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore` | Toolchain (`"private": true` against an accidental npm publish) |
| `.gitattributes`, `.gitignore` | LF line endings; ignore rules |
| `LICENSE`, `LICENSE_COMMERCIAL.md`, `CONTRIBUTING.md` | AGPLv3 + commercial |

---

## Data Model

No persisted data. The package's input is the tree (`NavNode`, `PageTable` in `src/logic/tree.ts`);
no factory defaults.

## Tests

```bash
npm install
npm run typecheck
npm test            # 115 tests on 2026-11-25 (logic 77, ui 38)
npm run format:check
```

## Hub shortcuts (2026-11-22)

Each hub gear (lower, upper) can point to one page. Tap chain (`hubTapAction`): 1. a resolvable
shortcut opens its page; 2. else the old action (lower: jump target, else `extraAction`; upper:
`extraAction` when a jump target exists); 3. a hub with neither assigns the page at the contact as its
shortcut (same rule as Shift+Enter and the drop; ignored during a transition or without a page; the hub
shows the name at once and its gear is lit blue for 500 ms, not with reduced motion; no dialog). A stale
node id counts as no shortcut. Every hub is a focusable `role=button`; its label says what a tap does
(`shortcutFor(name)`, the old label, or `shortcutAssign(name)` / `shortcutEmpty` for the assign tap). Drag from the hub (the ring drawn inside the
gear, at least 32 px, always smaller than the gear's root radius): the gear goes see-through, a
full-colour copy with the name of the page at the contact follows (a touch: 56 px above the finger;
mouse: under the pointer). Drop on the other hub gear (whole gear up to its tip): that page becomes the
dragged gear's shortcut. Drop on the idler gear: removes it (red × on top). Drop elsewhere: nothing.
Keyboard: Enter/Space = tap; Shift+Enter assigns the page at the contact, Delete/Backspace clears it.
Persistence: `shortcuts` (start value), `onShortcutsChange` (every change) and `shortcutsStorageKey`
(the package keeps them in localStorage itself, loaded on mount; no `window`, blocked storage and
quota errors tolerated). Zones are exclusive (`zoneAt`): a hub only taps/grabs, the teeth and
everything else turn from 2 px on (counted from the angle at pointer-down; the old 8 px that lost the
first pixels and fired a tap action on small turns is gone), pieces tap (8 px) or turn.

## Known Limitations

- **Gestures, animation and look are only verifiable on a device** (turning, flick and run-on,
  swipe to the neighbour page, back gesture, dark mode/reduced motion, no tap box in Safari,
  safe-area insets); the tests cover geometry, the first render and source guards. Each consuming
  app repeats the manual navigation tests on a device.
- **Mouse wheel (2026-11-21):** on the wheel view the scroll wheel turns the wheel (or visible
  background gear) under the pointer like a touch would, a roller laid on from above: scrolling down
  on a wheel's right half turns it anticlockwise, on the left half clockwise; nothing within 6 px of
  the vertical middle line. One notch = one page of that wheel (gears at their ratio, settling on a
  page). Only if a mouse exists (`(any-hover: hover) and (any-pointer: fine)`; a touchpad counts
  too). Outside wheels/gears and on open pages the wheel scrolls as before. Hand-test only.
- **Hub shortcuts (2026-11-22):** the drag, drop highlight, carried copy and restart survival were
  checked in Chromium with mouse and touch events (Playwright), but not on a real device: the lift of
  the copy above a finger, drop on the small lower gear with a thumb, Safari/iOS storage that may be
  cleared, dark mode and reduced motion need the manual tests. A shortcut only resolves on the level
  shown (a page of another ring level of a nested tree is not found: the hub falls back). `shortcuts`
  is a start value only (later prop changes are ignored). Behaviour change for apps without shortcuts: the two hubs are now always tab stops with a label, and an otherwise inert hub assigns on tap (before, it did nothing). `shortcutEmpty` is also the fallback label of a hub whose old action has no label. Hand-test only: the flash and the tap-assign on a real device (checked in Chromium with mouse and keyboard). The hub grab ends cleanly on a lost pointer capture, window blur or the grabbing pointer's cancel (another finger's cancel is ignored); a stale hold is dropped at the next pointer-down.
- **Not consumed by any app yet**; not published to npm; no Git tag. Apps would take it by Git tag.
- Dropped from the original: the practice run, the hint line, the close button and the built-in test
  page; its "Test" hub is now the optional `extraAction`. `data-*` attributes were renamed
  (`data-contact`, `data-gear`, `data-sheet="light"` …): local checks reading the old names need
  updating.
- Found in the original and kept as is: `onOpenChange` fires once with `null` on mount;
  `keyboardFocus` is exported but unused; `Placeholder`'s back button can never show.
- The coupling guard forbids app words in `src/`.

*Last updated: 2026-11-25 (opt-in `rememberKey`)*
