# 01 Mausrad

## MT-01: Mausrad dreht das Rad unter dem Mauszeiger

**Vorbedingungen:** PC mit angeschlossener Maus; eine App mit Räderwerk zeigt die Räder (keine offene Seite).

**Schritte:**

1. Mauszeiger auf die rechte Hälfte des oberen Rads (Seiten) setzen.
2. Mausrad eine Raste nach unten drehen.
3. Mauszeiger auf die linke Hälfte des oberen Rads setzen und Schritt 2 wiederholen.
4. Mauszeiger genau auf die senkrechte Mittellinie eines Rads setzen und das Mausrad drehen.
5. Mauszeiger auf das untere Rad (Bereiche), rechte Hälfte, setzen und Schritt 2 wiederholen.
6. Mauszeiger auf ein sichtbares Zahnrad zwischen den Rädern setzen (rechts und links der Mitte) und das Mausrad drehen.
7. Mauszeiger auf eine freie Fläche ohne Rad und Zahnrad setzen und das Mausrad drehen.
8. Eine Seite öffnen, Mauszeiger darauf setzen, Mausrad drehen.

**Erwartet:**

- Schritt 2: das Rad dreht sich um eine Seite **gegen den Uhrzeigersinn** (als läge das Mausrad von oben an dem Rad an) und rastet ein; das gekoppelte Rad dreht mit.
- Schritt 3: auf der linken Hälfte dreht es **im Uhrzeigersinn**.
- Schritt 4: nichts dreht sich (die Mittellinie ist ein toter Streifen von wenigen Pixeln).
- Schritt 5: wie Schritt 2; mehrere schnelle Rasten springen entsprechend viele Seiten weiter, Rasten nach oben kehren die Richtung um.
- Schritt 6: das Zahnrad dreht sich mit seinem Übersetzungsverhältnis, die Räder laufen mit und rasten auf einer Seite ein; es kann sein, dass eine einzelne Raste an einem kleinen Zahnrad erst die nächste Seite erreicht.
- Schritt 7 und 8: das Mausrad scrollt wie gewohnt, die Räder bleiben unberührt.
- Auf einem reinen Touch-Gerät (ohne Maus) ändert sich nichts.
- Auf einem Touchpad drehen kleine Wischbewegungen erst nach einer gewissen Strecke weiter.
