# CLAUDE.md — rad-navi

> Workspace-wide conventions (language, git, build, architecture, testing, collaboration):
> [`c:\skripte\private\general stuff\CLAUDE.md`](../../private/general%20stuff/CLAUDE.md)

---

## Project overview

Shared wheel navigation („Reibräder“) for Tobias' React web apps: two coupled wheels (areas below,
pages above), swipe to the neighbouring page, back gesture goes one level back, remembers the last
page. Extracted 2026-11-21 from the web app where it originated, because several apps use copies
of it. **Status (2026-11-21): logic (`src/logic/`) and React components (`src/ui/`) ported with an
English API, 49 tests; not yet consumed by an app, not published to npm.** Old → new names:
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
| `manual_tests/` | Human-tester instructions (README only so far) |
| `src/index.ts` | Public entry: components, hooks, types, logic |
| `src/logic/tree.ts` | `NavNode`, `PageTable`, `areaNode`, `distributor`, `pagesIn`, `nodesWithPage`, `pathTo`, `areaOf` — the tree is an input |
| `src/logic/ring.ts`, `wheel.ts`, `gears.ts`, `picker.ts` | Layout of areas/pages on the wheels, geometry (arcs, settle, throw), gear train (ratio −1), choice wheel |
| `src/ui/WheelNav.tsx`, `props.ts` | The navigation component and its props/texts (`WheelNavProps`, `WheelTexts`, `DEFAULT_TEXTS`) |
| `src/ui/Ring.tsx`, `MiniWheel.tsx`, `GearTrain.tsx`, `Frame.tsx` | Wheel pieces, the small wheel on a page, gears, full-screen frame |
| `src/ui/position.ts`, `colors.ts`, `wheelDrawing.ts`, `useBackGesture.ts`, `innerLevels.ts` | Pointer/position hooks, colours (light/dark, `NO_BOX`), drawing helpers, back gesture, inner levels |
| `tests/logic/`, `tests/ui/` | Unit tests; guards (no tap boxes, light sheet), `renderToString` smoke tests, coupling guard (no app words, no foreign imports) |
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
npm test            # 49 tests on 2026-11-21 (logic 33, ui 16)
npm run format:check
```

## Known Limitations

- **Gestures, animation and look are only verifiable on a device** (turning, flick and run-on,
  swipe to the neighbour page, back gesture, dark mode/reduced motion, no tap box in Safari,
  safe-area insets); the tests cover geometry, the first render and source guards. Each consuming
  app repeats the manual navigation tests on a device.
- **Not consumed by any app yet**; not published to npm; no Git tag. Apps would take it by Git tag.
- Dropped from the original: the practice run, the hint line, the close button and the built-in test
  page; its "Test" hub is now the optional `extraAction`. `data-*` attributes were renamed
  (`data-contact`, `data-gear`, `data-sheet="light"` …): local checks reading the old names need
  updating.
- Found in the original and kept as is: `onOpenChange` fires once with `null` on mount;
  `keyboardFocus` is exported but unused; `Placeholder`'s back button can never show.
- The coupling guard forbids app words in `src/`.

*Last updated: 2026-11-21*
