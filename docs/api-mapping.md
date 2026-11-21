# API mapping: German original to English package

Source of the old names: the original private web app (`src/logic/navigation/`: `ring.ts`, `rad.ts`, `getriebe.ts`,
`auswahlrad.ts`, `baum.ts`). New names: `rad-navi/src/logic/`. Behaviour is identical; the one
structural change is that the tree is an input (see "Tree" below). Parameter and field names were
translated too (`dreh` to `turn`, `mitte` to `middle`, `breite` to `width`, `zaehne` to `teeth`, ...).

## wheel.ts (from rad.ts)

| Old           | New           | Meaning                                                             |
| ------------- | ------------- | ------------------------------------------------------------------- |
| `radWinkel`   | `wheelAngle`  | Angle of a point seen from a centre (0 = top, clockwise)            |
| `winkelDiff`  | `angleDiff`   | Shortest signed turn between two angles                             |
| `feldBreite`  | `fieldWidth`  | Width of one of n equal fields                                      |
| `feldMitte`   | `fieldMiddle` | Centre angle of field i on a wheel turned by `turn`                 |
| `Keil`        | `Wedge`       | A drawn field: `middle`, `width` (was `mitte`, `breite`)            |
| `feldKeil`    | `fieldWedge`  | Wedge of field i on a wheel turned by `turn`                        |
| `sanft`       | `smooth`      | Cubic ease in/out of p in [0, 1]                                    |
| `entfalten`   | `unfold`      | Fields of a level unfolding out of the field they were opened from  |
| `keilPfad`    | `wedgePath`   | SVG path of a ring piece (arcs in pieces of at most a quarter turn) |
| `zahnradPfad` | `gearPath`    | SVG path of a gear outline (`teeth`, `root`, `tip`)                 |
| `abwurf`      | `throwOff`    | Release speed from recent samples (`{t, turn}`); 0 after a rest     |
| `schwung`     | `momentum`    | One step of the wheel running on after a flick; returns `{turn, v}` |

## ring.ts (from ring.ts)

| Old                 | New               | Meaning                                                                                                                                |
| ------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Gruppe`            | `Group`           | An area in the row: `node`, `start`, `count` (was `knoten`, `start`, `anzahl`)                                                         |
| `Gliederung`        | `Layout`          | Areas and pages of a level: `groups`, `pages` (each `{node, group}`)                                                                   |
| `gliederung`        | `layoutOf`        | Layout of a level node (a field without children is its own page)                                                                      |
| `seitenBreite`      | `pageWidth`       | Angle one page takes                                                                                                                   |
| `gruppenMitte`      | `groupMiddle`     | Coordinate of an area's middle                                                                                                         |
| `Lage`              | `Placement`       | How a wheel lies: `offset`, `direction` (was `versatz`, `richtung`)                                                                    |
| `OBEN`              | `TOP`             | Placement of the wheel with offset 0, counting clockwise                                                                               |
| `seitenKeil`        | `pageWedge`       | Wedge of page k at position t                                                                                                          |
| `gruppenKeil`       | `groupWedge`      | Wedge of area i at position t (as wide as its pages)                                                                                   |
| `seiteBei`          | `pageAtPointer`   | The page at the pointer for position t                                                                                                 |
| `seiteUnter`        | `pageUnder`       | The page under an angle of a wheel lying as `placement`                                                                                |
| `gruppeUnter`       | `groupUnder`      | The area under an angle                                                                                                                |
| `zuGruppe`          | `toGroup`         | Position nearest to t at which area i stands at the pointer                                                                            |
| `einrastenGruppe`   | `snapToGroup`     | Where a wheel turned by the areas settles (nearest area middle)                                                                        |
| `einrastenSeite`    | `snapToPage`      | Where a wheel turned by the pages settles (nearest page)                                                                               |
| `tFuerDrehung`      | `positionForTurn` | How far t moves when the finger turns a wheel by an angle                                                                              |
| `Reibmasse`         | `FrictionSizes`   | Sizes of the two coupled wheels (`rTop`, `rBottom`, `contact`, `topY`, `bottomY`; was `rOben`, `rUnten`, `kontakt`, `obenY`, `untenY`) |
| `reibmasse`         | `frictionSizes`   | The wheel sizes for a screen `width` x `height` (`margin` was `rand`)                                                                  |
| `strahlSchrift`     | `rayTextRotation` | SVG rotation of a name along a ray so it never reads upside down                                                                       |
| `schriftFuerStrahl` | `fontSizeForRay`  | Font size for a name along a ray of a given length                                                                                     |
| `wischen`           | `swipe`           | Classifies a swipe: +1 next page, -1 previous, 0 none                                                                                  |
| `nachbar`           | `neighbour`       | Page beside another in its area, none at the ends (no wrap)                                                                            |

## gears.ts (from getriebe.ts)

| Old                | New                | Meaning                                                                                                                                  |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Punkt`            | `Point`            | A point `{x, y}`                                                                                                                         |
| `ZAHNZAHLEN`       | `TOOTH_COUNTS`     | Tooth counts; keys `unten`/`verbundKlein`/`verbundGross`/`zwischen`/`oben` became `bottom`/`compoundSmall`/`compoundLarge`/`idler`/`top` |
| (inline union)     | `GearName`         | The five gear names (was the inline type of `Getrieberad['name']`; new export)                                                           |
| `Getrieberad`      | `Gear`             | One gear: `name`, `x`, `y`, `teeth`, `pitchRadius` (was `zaehne`, `teilkreis`)                                                           |
| `Zahnradzug`       | `GearTrain`        | The train: `module` (was `modul`), `gears` (was `raeder`)                                                                                |
| `zahnradzug`       | `gearTrain`        | Builds the train between a lower and an upper hub (`zigzag` was `zickzack`)                                                              |
| `kopfkreis`        | `tipRadius`        | Tip radius of a gear                                                                                                                     |
| `verhaeltnis`      | `ratioOf`          | Turn of a gear per unit turn of the lower hub gear (signed)                                                                              |
| `hintergrundradAn` | `backgroundGearAt` | The background gear under a point, the one drawn last; none for hub gears                                                                |
| `uebersetzung`     | `overallRatio`     | Overall ratio upper / lower hub gear (-1)                                                                                                |
| `eingriff`         | `mesh`             | Turn of a gear meshing with another so a tooth stands in a gap                                                                           |
| `drehungen`        | `turns`            | Turn of every gear of the train for a given lower hub turn                                                                               |

## picker.ts (from auswahlrad.ts)

| Old         | New        | Meaning                                                 |
| ----------- | ---------- | ------------------------------------------------------- |
| `obenIndex` | `topIndex` | The field at the top of a choice wheel turned by `turn` |
| `drehFuer`  | `turnFor`  | The nearest turn that brings field i to the top         |

## tree.ts (from baum.ts)

The app's own data is no longer part of the package. These were removed and must be supplied by the
app: `SEITEN` (page table, now a `PageTable` the app passes in), `TEST_REITER` (app specific, no
equivalent), `BAUM` (the tree, now built by the app with `distributor` / `areaNode`), and the id
unions `SeitenId` / `BereichId` (page and area ids are plain strings now).

| Old                         | New             | Meaning                                                                                                                                                                                   |
| --------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Seite`                     | `PageInfo`      | What the app says about a page: `name`, optional `planned` (was `name`, `geplant`; `heuteIn` dropped, it was app documentation)                                                           |
| (`Record<SeitenId, Seite>`) | `PageTable`     | The app's pages by page id; passed to `areaNode`                                                                                                                                          |
| `Knoten`                    | `NavNode`       | Tree node: `id`, `name`, `children`, `page`, `planned` (was `kinder`, `seite`, `geplant`)                                                                                                 |
| `verteiler` (not exported)  | `distributor`   | Distributing node; planned only when all children are (now exported)                                                                                                                      |
| `bereich` (not exported)    | `areaNode`      | Area of any number of pages taken from a `PageTable`; node id `<area>/<page>`; now takes the table as first argument, accepts any page count, throws on an unknown page id (now exported) |
| `seitenIn`                  | `pagesIn`       | Page ids at the ends of a tree, in order                                                                                                                                                  |
| `knotenMitSeite`            | `nodesWithPage` | Every node that shows a page (one per area)                                                                                                                                               |
| `wegZu`                     | `pathTo`        | Nodes from the root to the node with an id (empty if absent)                                                                                                                              |
| `bereichVon`                | `areaOf`        | The root child a node belongs to (the root for the root)                                                                                                                                  |

None of the old functions in `tree.ts` read module-level data any more; they took the tree as a
parameter already, only the constants were removed.

## UI (src/ui/, from the original `src/ui/navigation/`)

Everything the app owns now comes in through `WheelNavProps` (`src/ui/props.ts`); the package imports
no app data and shows no hard-coded text (`WheelTexts`, English defaults in `DEFAULT_TEXTS`).
Everything below is re-exported from `src/index.ts`, together with the logic exports above.

### Components

| Old                | New           | File            | Meaning                                                                                         |
| ------------------ | ------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `ReibNavi`         | `WheelNav`    | `WheelNav.tsx`  | The two coupled wheels, the open page and the swipe/back handling                               |
| `Ring`             | `Ring`        | `Ring.tsx`      | One ring of pieces with names along the ray                                                     |
| `Ringgeist`        | `RingGhost`   | `Ring.tsx`      | Page growing out of / shrinking into its piece                                                  |
| `Ringstueck`       | `RingPiece`   | `Ring.tsx`      | A ring piece (`node`, `wedge`, `color`, `opacity`, `labelOpacity`, `marked`, `label`, `choose`) |
| `MiniRad`          | `MiniWheel`   | `MiniWheel.tsx` | Small wheel on a detail page that goes one level back                                           |
| `RaederwerkHinten` | `GearsBehind` | `GearTrain.tsx` | The gears behind the wheels                                                                     |
| `Nabenraeder`      | `HubGears`    | `GearTrain.tsx` | The two hub gears in front                                                                      |
| `Rahmen`           | `Frame`       | `Frame.tsx`     | Full-screen frame with the way at the top and the status line                                   |
| `Einblenden`       | `FadeIn`      | `Frame.tsx`     | A page fades in a little from below                                                             |
| `Platzhalter`      | `Placeholder` | `Frame.tsx`     | Page the app does not draw (yet); texts from `WheelTexts`                                       |

### Props, texts

| Old                                           | New                                                  | File       | Meaning                                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NaviProps`                                   | `WheelNavProps`                                      | `props.ts` | Props of `WheelNav`                                                                                                       |
| `baum`                                        | `tree`                                               | `props.ts` | The tree (`NavNode`)                                                                                                      |
| (`SEITEN`, imported)                          | `pages`                                              | `props.ts` | The app's `PageTable` (name of the jump target)                                                                           |
| `seiteZeigen`                                 | `pageFor`                                            | `props.ts` | Real page for a page id, or none (placeholder)                                                                            |
| `seiteGanz`                                   | `fullHeight`                                         | `props.ts` | Page divides the whole height itself                                                                                      |
| `startBereich`                                | `startArea`                                          | `props.ts` | Id of the area the wheels open on                                                                                         |
| `startKnoten`                                 | `startNode`                                          | `props.ts` | Node id of a page open from the start                                                                                     |
| `sprungziel`                                  | `jumpTarget`                                         | `props.ts` | Node id the lower hub jumps to                                                                                            |
| `onOrt`                                       | `onOpenChange`                                       | `props.ts` | Open page changed (node id, null = wheel)                                                                                 |
| `onSchritt`                                   | `onStep`                                             | `props.ts` | Every way forward or back (now optional)                                                                                  |
| `onSeite`                                     | `onPage`                                             | `props.ts` | A page at the end of the tree is shown (now optional)                                                                     |
| `status`                                      | `status`                                             | `props.ts` | Short line in the top bar                                                                                                 |
| `onTest` + built-in test page + `TEST_REITER` | `extraAction` (`ExtraAction`: `label`, `onActivate`) | `props.ts` | Optional extra hub button, label from the app                                                                             |
| (inline German picker selector)               | `ownGestureSelector`                                 | `props.ts` | Fields on a page that handle touch themselves                                                                             |
| (German strings)                              | `texts` / `WheelTexts` / `DEFAULT_TEXTS`             | `props.ts` | `navigation`, `path`, `jumpToTarget`, `planned`, `neighbour`, `backTo`, `placeholderPlanned`, `placeholder`, `backButton` |

### Position, grip, history (position.ts, from lage.ts)

| Old                                                | New                                            | Meaning                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Stufe` (`knoten`, `art`: `ring`/`gruppe`/`seite`) | `Step` (`node`, `type`: `ring`/`group`/`page`) | A step of the way                                                                                           |
| `useRingWeg`                                       | `useRingPath`                                  | The way through the tree: returns `path`, `here`, `ring`, `ringIndex`, `layout`, `open`, `backTo`, `change` |
| `useLage`                                          | `usePosition`                                  | Position `t`: `glide`, `coast` (was `auslaufen`), `stop`, `setT`, `now`                                     |
| `useVerlauf`                                       | `useProgress`                                  | A change between page and wheel: `state` (`move`, `p`), `start`                                             |
| `Griffrad`                                         | `GripWheel`                                    | A wheel a finger may hold (`placement`, `snap`, `tap`, `dt`)                                                |
| `useGriff`                                         | `useGrip`                                      | Pointer handling for the wheels in one SVG                                                                  |
| `useZurueckGeste`                                  | `useBackGesture` (`useBackGesture.ts`)         | System back goes one level back; history entry state is `{ radNavi: 'page' }`                               |
| `ebeneAnmelden`                                    | `registerLevel` (`innerLevels.ts`)             | Marks an inner view as open                                                                                 |
| `innereEbeneSchliessen`                            | `closeInnerLevel`                              | Closes the inner view opened last                                                                           |
| `useInnereEbene`                                   | `useInnerLevel`                                | While open, the back gesture closes the inner view                                                          |

### Colours and drawing (colors.ts from farben.ts, wheelDrawing.ts from radZeichnung.ts)

| Old                                 | New                         | Meaning                                                                                                         |
| ----------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `useDunkel`                         | `useDark`                   | Device prefers dark (false when server rendering)                                                               |
| `useWenigBewegung`                  | `useReducedMotion`          | Device prefers reduced motion (false when server rendering)                                                     |
| `bereichsfarbe`                     | `areaColor`                 | One of nine area colours                                                                                        |
| `feldfarbe`                         | `fieldColor`                | Area colour, darker per field                                                                                   |
| `Flaechen` / `flaechen`             | `Surfaces` / `surfaces`     | Light or dark surface colours (`grund` to `ground`, `zurueck` to `back`, `leise` to `quiet`, `leer` to `empty`) |
| `farbeIn`                           | `colorOf`                   | Colour of a node in a tree                                                                                      |
| `OHNE_KASTEN`                       | `NO_BOX`                    | Style that switches off tap highlight and focus ring                                                            |
| `tastaturFokus`                     | `keyboardFocus`             | Focus came from the keyboard                                                                                    |
| `Getriebefarben` / `getriebeFarben` | `GearColors` / `gearColors` | Steel greys for the gears (`hell`, `mittel`, `dunkel`, `nebel` to `light`, `middle`, `dark`, `mist`)            |
| `AUSSEN`, `INNEN`, `HALB`           | `OUTER`, `INNER`, `HALF`    | Drawing units of the small wheel                                                                                |
| `punkt`                             | `pointAt`                   | Point on a circle for an angle                                                                                  |

### Not ported (app specific)

`AppRad.tsx`, `appSeiten.ts`, `NaviProbe.tsx`, `FreigabeWarnung.tsx`, `useFreigabeWarnung.ts`,
`useHintergrundAbgleich.ts`. Also dropped from the props: the probe's `uebung`, `hinweis`,
`onSchliessen`, and the "Bis zum Umbau" notes (`heuteIn`).

## Not ported (app specific)

`start.ts` (start area by clock, jump target, remembered place) and `uebung.ts` (practice run) stay in
the app.
