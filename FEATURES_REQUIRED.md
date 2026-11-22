# Critical User Paths — rad-navi

**Purpose:** Core workflows that must not break. Audit validates these end-to-end.
Status 2026-11-21: nothing built; the list is the target taken from the original app's wheel.

- [ ] **Every page is reachable** — a tap on an area brings it to the contact, a tap on a page opens it
- [ ] **Swipe to the neighbouring page** — not when the finger starts on a sideways-scrolling table or a field
- [ ] **System back goes one level back** — first views inside a page, then the page, then the wheel; the history does not grow
- [ ] **The app remembers the last page** — a restart within the set time opens there
- [ ] **Light and dark mode, reduced motion** — follow the phone
- [ ] **No tap or focus boxes around wheel pieces** — guard test
- [ ] **Hub shortcuts** — tap a hub gear opens its page (a hub with neither shortcut nor jump target/extra action assigns the page at the contact on the first tap); drag it onto the other hub gear sets the page at the contact, onto the idler gear removes it; teeth only turn; survives an app restart (`shortcutsStorageKey` or `onShortcutsChange`)
- [ ] **The tree comes from the app** — no app data inside the package

| Path | Impact | Audit Check |
|---|---|---|
| Tree passed in, not imported | the package is useless to a second app otherwise | grep: no import of app modules in `src/` |
| Zones exclusive | a tap action on the teeth or a turn from a hub bring back the lost-pixels bug | `tests/logic/zones.test.ts` grid over screen sizes |
| Shortcuts survive a restart | the user loses their setup | `tests/logic/shortcuts.test.ts` (roundtrip, fake storage) |
| Wheel geometry rules | visual glitches only show on a device | unit tests carried over from the original app |
