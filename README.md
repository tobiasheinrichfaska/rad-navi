# rad-navi

Wheel navigation („Reibräder“) for React web apps: two coupled wheels (areas below, pages above),
swipe to the neighbouring page, back gesture goes one level back, remembers the last page. The tree of
areas and pages, the page contents, start/jump targets and all texts come from your app; the package
holds no app data.

**Status:** early (0.1.1), not published to npm. Web only (SVG/DOM), not for React Native builds.

## Install and test

```bash
npm install
npm test
npm run typecheck
```

## Usage

```tsx
import { WheelNav, areaNode, distributor } from 'rad-navi';

const pages = { today: { name: 'Today' }, list: { name: 'List' } };
const tree = distributor('root', 'Root', [areaNode(pages, 'home', 'Home', ['today', 'list'])]);

<WheelNav
  tree={tree}
  pages={pages}
  pageFor={(page) => <MyPage id={page} />}
  onOpenChange={(node) => remember(node)}
/>;
```

**Hub shortcuts:** each of the two hub gears can point to a page. Tap it to open the page; a hub
with no shortcut and no jump target/extra action takes the page at the contact as its shortcut on the
first tap. Drag it onto
the other hub gear to point it to the page at the contact, onto the small idler gear to remove it. Pass
`shortcutsStorageKey="my-app-shortcuts"` and the package keeps them in localStorage (or take
`shortcuts` / `onShortcutsChange` and store them yourself). A hub that has a jump target or extra
action keeps doing that on a tap (assign by drag or Shift+Enter).

**Letzte Seite merken (optional):** `rememberKey="meine-app-seite"` übergeben, dann merkt sich das
Paket die zuletzt offene Seite (nur deren Knoten-ID) im localStorage und öffnet beim nächsten Start
dort, sofern die Seite im Baum noch existiert, sonst auf der ersten. `startNode` hat Vorrang;
`rememberStorage` ersetzt localStorage. Blockierter Speicher wird still toleriert; ohne Schlüssel wird
nichts gespeichert. Ohne UI: `loadLastNode` / `saveLastNode`.

All props and texts: `src/ui/props.ts`. Names of the original German API and their English
equivalents: [docs/api-mapping.md](docs/api-mapping.md). Gestures and look can only be checked on a
device: see `manual_tests/`.

Bug reports and ideas: [GitHub Issues](https://github.com/tobiasheinrichfaska/rad-navi/issues).

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This project is licensed under the **GNU Affero General Public License v3.0** (AGPLv3).
You are free to use, modify, and distribute this software under the terms of the AGPLv3.
If you use this software to provide a network service, you must make the full source code
of your modifications available to users of that service.

**Commercial License:** If you wish to use this software in a closed-source or proprietary
product, a commercial license is available. Contact: tobias.a.w.heinrich@gmail.com

See [LICENSE](LICENSE) for the full AGPLv3 text.
See [LICENSE_COMMERCIAL.md](LICENSE_COMMERCIAL.md) for commercial licensing terms.
