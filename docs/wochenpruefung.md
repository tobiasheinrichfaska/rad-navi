# Wochenprüfung — rad-navi

Anweisungen für die geplante wöchentliche Prüfung (Stand Hauptzweig). Antworte auf Deutsch.
Änderungen nur als PR auf einem `claude/`-Zweig. Nie veröffentlichen, nie taggen, nie nach npm
hochladen, nie mergen, nie auf GitHub kommentieren (Tobias' OK nötig).

1. **Bauen und testen:** `npm ci`, `npm run typecheck`, `npm run format:check`, `npm test`,
   `npm run build`. Jede Abweichung melden; „nicht gelaufen“ heißt „nicht geprüft“.
2. **Abhängigkeiten:** `npm audit` (alle Stufen) und `npm outdated`. Sicherheitsupdates ohne
   Breaking Change als PR vorschlagen; Major-Sprünge nur melden.
3. **Geheimnisse und private Daten (öffentliches Repo):** Dateien und gesamte Git-Historie
   (`git log -p --all`) nach Zugangsdaten, Tokens, `.env`-Resten, E-Mail-Adressen, echten Namen und
   Namen privater Projekte durchsuchen (siehe CLAUDE.md „Key rules“). Treffer nie im Bericht
   wiederholen, nur Fundort (Datei/Commit) nennen.
4. **Code-Sicherheit:** `src/` auf `eval`, `new Function`, `dangerouslySetInnerHTML`, `innerHTML`,
   ungeprüftes `JSON.parse` und Speicherzugriffe ohne try/catch prüfen
   (`src/logic/shortcuts.ts`, `src/ui/useShortcuts.ts`). Kopplungs-Guard `tests/ui/coupling.test.ts`
   muss grün sein.
5. **Konfiguration:** `.github/workflows/` (Rechte, gepinnte Action-Versionen, keine
   `pull_request_target`), `package.json` mit `"private": true`, `.gitignore`.
6. **Dokumentation:** Stimmen Testzahl und Dateitabelle in `CLAUDE.md` mit dem Stand überein?

Bericht: je Punkt eine Zeile, mit Links zu geöffneten PRs.
