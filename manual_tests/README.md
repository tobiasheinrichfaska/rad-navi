# Manuelle Tests — rad-navi

Anleitung für Menschen am Gerät, ohne Entwicklerwissen. Ergänzt die automatischen Tests.

## Stand

Die Navigation besteht aus Gesten und Animationen, die nur auf einem Gerät prüfbar sind. Die
Testfälle (Rad dreht, Seite öffnet, Wischen zur Nachbarseite, Zurück-Geste, Hell/Dunkel, kein
Tipp-Kasten in Safari) entstehen mit der ersten Beispiel-App, die das Paket einbindet. Jede App,
die das Paket nutzt, wiederholt sie nach der Einbindung auf einem Gerät.

## Umgebung

Wird mit der ersten Beispiel-App ergänzt (Gerät, Browser).

## Hub-Kurzbefehle (Nabenräder)

Auf dem Gerät prüfen (Touch und, wo vorhanden, Maus). Vorher: App mit `shortcutsStorageKey` oder
`onShortcutsChange` starten, ohne gespeicherte Kurzbefehle.

1. **Zähne drehen.** Mit dem Finger auf die Zähne des unteren kleinen Zahnrads, nur ein kleines Stück
   ziehen (ca. 5 bis 10 Grad). Das Rad folgt sofort dem Finger, ohne Verzögerung, und rastet auf einer
   Seite ein. Es öffnet sich keine Seite und es springt nichts zurück.
2. **Antippen der Nabe.** Den Ring in der Mitte des unteren Zahnrads antippen. Ohne Kurzbefehl passiert
   das Gewohnte (Sprungziel oder Zusatzaktion). Hat die Nabe weder Kurzbefehl noch Sprungziel/Zusatzaktion,
   weist das Antippen die Seite am Kontakt als Kurzbefehl zu: die Nabe zeigt sofort den Namen, das Zahnrad
   leuchtet kurz blau auf (bei reduzierter Bewegung nicht), keine Rückfrage. Ein zweites Antippen öffnet
   die Seite. Dasselbe mit der oberen Nabe. Ziehen von der Nabe weist dabei nichts zu. Zähne antippen: nichts.
3. **Zuweisen.** Rad auf eine Seite drehen, dann die Nabe des unteren Zahnrads ziehen. Das Original wird
   durchsichtig, eine Kopie in voller Farbe mit dem Namen der Seite am Kontakt folgt dem Finger (etwas
   oberhalb davon), das Rad dreht sich dabei nicht. Auf das obere große Zahnrad ziehen: es leuchtet auf.
   Loslassen: Die Nabe zeigt jetzt den Namen. Antippen öffnet diese Seite.
4. **Umgekehrt.** Dasselbe mit der oberen Nabe auf das untere Zahnrad.
5. **Löschen.** Eine Nabe auf das kleine linke Zahnrad ziehen (das Zwischenrad unter dem oberen Zahnrad):
   es zeigt ein rotes ×. Loslassen: Der Kurzbefehl ist weg, die Nabe tut wieder das Gewohnte.
6. **Daneben loslassen.** Eine Nabe irgendwo anders loslassen: nichts ändert sich.
7. **Untermenü.** Steht am Kontakt eine Seite mit eigenen Unterseiten, ist der Kurzbefehl diese Seite.
8. **Neustart.** App ganz schließen und neu starten (bei Safari/iOS auch den Tab neu laden): Die
   Kurzbefehle sind noch da. Zusätzlich: Seite in privatem Fenster öffnen, die Navigation geht auch ohne
   Speicher (Kurzbefehle bleiben dann nur bis zum Neuladen).
9. **Tastatur / Maus.** Tab springt auf beide Naben (auch leere, Vorlesetext „Set shortcut to …“); Eingabe
   oder Leertaste auf einer leeren Nabe weist die Seite am Kontakt zu, Umschalt+Eingabe weist auch bei
   vorhandener Aktion zu, Entf/Rücktaste löscht. Mit der Maus: Mausrad über den Zähnen dreht das Rad, Ziehen der Nabe wie mit dem Finger.
10. **Dunkel und reduzierte Bewegung.** Dunkelmodus: Kopie und Hervorhebung gut lesbar. „Bewegung
    reduzieren“: Die Kopie erscheint ohne Animation.
