# Codex-Umsetzungsbefehl: Statistik-Seite überarbeiten

## Ziel

Überarbeite die Seite **„Statistik“** im SaTourN Datenqualitäts-Monitor entsprechend dem aktuellen hellen Mockup.

Die Statistik-Seite soll ruhig, klar und rein aggregiert sein.  
Sie zeigt keine Pflegeaufgaben, keine Qualitätsmängel und keine datensatzbezogenen Fehlerlisten.

Der Fokus liegt ausschließlich auf:

- Gesamtzahl der Datensätze
- Open-Data-fähige Datensätze
- Open-Data-Quote
- Nicht Open-Data-fähige Datensätze
- Verteilung nach Datentyp
- Open-Data-Quote nach Datentyp
- Kennzahlen nach Datentyp

Die Seite soll keine Stichprobenlogik anzeigen. Die Statistik-Zahlen müssen auf vollständigen, aggregierten `overallcount`-Abfragen basieren.

---

## Relevante Dateien

Erstelle für die Statistik eine eigene Seite.

Die Übersicht (`index.html`) bleibt ausschließlich für die Start- und Übersichtsansicht vorgesehen und darf nicht zur Statistik-Seite umgebaut werden.

Arbeite vorrangig in:

- `Statistik/stats.html` (neu anlegen oder bestehende Statistik-Seite verwenden)
- `Statistik/scripts.js`
- `Statistik/style.css`

Falls bereits gemeinsame Komponenten oder Hilfsfunktionen existieren, diese in gemeinsam genutzten JS-/CSS-Dateien wiederverwenden.

Die Navigation soll von der Übersicht zur neuen Statistik-Seite führen. Die Statistik erhält damit eine eigenständige URL und einen eigenen Seitenaufbau.

Bestehende Architektur beibehalten:

- statisches HTML/CSS/Vanilla-JavaScript
- keine neue Build-Kette
- keine Secrets im Frontend
- Node/Express-Proxy bleibt für API-Requests zuständig

---

## Designrichtung

Orientiere dich am neuen hellen Mockup der Statistik-Seite.

Gestaltungsprinzipien:

- heller Hintergrund
- linke ruhige Navigation
- aktive Navigation: **Statistik**
- klarer Header mit Arbeitskontext
- weiße Karten mit feinen Rahmen
- dezente Schatten
- blaue Akzentfarbe
- wenige Farben
- keine dunkle Dashboard-Optik
- keine überladenen Tabellen
- keine Qualitätswarnungen auf dieser Seite

Die Statistik-Seite soll optisch zur neuen Startseite, Datensatzliste, Datensatz-Detailseite und Pflegeaufgaben-Seite passen.

---

## Navigation

Die Hauptnavigation bleibt reduziert:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Statistik

Auf dieser Seite ist **Statistik** aktiv markiert.

Nicht als eigene Navigation anzeigen:

- Kriterien-Matrix
- Ergebnisse
- KI-Analyse
- Export
- Einstellungen
- Datentypen

---

## Header

Oben im Header anzeigen:

```text
Arbeitskontext
Dresden Elbland · Alle Orte · Alle Datentypen
[Ändern]

Letzte Aktualisierung
12.05.2026, 09:42 Uhr

[Aktualisieren]
```

Der Header soll ruhig und identisch zur Designsprache der anderen neuen Seiten sein.

Keine Status-Pills wie „Status OK“ oder technische API-Meldungen im Header anzeigen.

---

## Seitenkopf

Der Seitenkopf lautet:

```text
Statistik
Aggregierte Kennzahlen für Ihren Arbeitskontext.
```

Keinen langen Erklärungstext anzeigen.

---

## Filterbereich

Die Statistik-Seite braucht nur Filter, die für aggregierte Statistik relevant sind.

Standardfilter:

- Gebiet
- Ort
- Datentyp

Buttons:

- Filter zurücksetzen
- Aktualisieren

Nicht anzeigen:

- Zeitraum
- Qualitätsstatus
- Problem / Kriterium
- Prüfbarkeit
- Priorität
- Suche
- Alle Gebiete abfragen
- Sortierung

Begründung:

- Zeitraum ist aktuell irrelevant, solange keine historische Snapshot-Datenbasis existiert.
- Qualitäts- und Problemfilter gehören auf Pflegeaufgaben oder Datensätze, nicht auf Statistik.
- Statistik soll ruhig und aggregiert bleiben.

---

## Datenbasis

Die Statistik-Seite darf niemals als Stichprobe ausgewiesen werden.

Die sichtbaren Zahlen müssen aus vollständigen aggregierten Counts stammen, insbesondere aus `overallcount`.

Im UI anzeigen:

```text
Die dargestellten Zahlen basieren auf allen verfügbaren Daten in Ihrem Arbeitskontext. Diese Statistik ist vollständig.
```

Oder rechts unten dezent:

```text
Datenbasis: Vollständig
```

Nicht anzeigen:

```text
Datenbasis: Stichprobe
```

Nicht anzeigen:

```text
Diese Liste basiert auf einer begrenzten Stichprobe.
```

Wenn vollständige Statistikdaten nicht geladen werden können, dann keine Sample-Zahlen als Statistik ausgeben. Stattdessen ruhigen Fehler- oder Empty-State anzeigen:

```text
Die Statistik konnte nicht vollständig geladen werden.
Bitte erneut aktualisieren.
```

Technische Details nur in die Console schreiben.

---

## KPI-Zeile

Die obere KPI-Zeile enthält genau vier Karten:

1. Gesamtzahl Datensätze
2. Open-Data-fähig
3. Open-Data-Quote
4. Nicht Open-Data-fähig

Beispiel:

```text
Gesamtzahl Datensätze
35.612
100 % aller Datensätze

Open-Data-fähig
9.431
26,5 % aller Datensätze

Open-Data-Quote
26,5 %
Verhältnis Open-Data-fähig

Nicht Open-Data-fähig
26.181
73,5 % aller Datensätze
```

Nicht anzeigen:

- Datensätze mit Mängeln
- kritische Datensätze
- Qualitäts-Score
- Qualitätsstatus
- Pflegebedarf
- Fehler

Wichtig:

Die Open-Data-Quote darf nur einmal als Haupt-KPI erscheinen. Sie darf zusätzlich in der Tabelle je Datentyp erscheinen, aber nicht als zweites großes Diagramm-KPI mit gleichem Aussagewert.

---

## Charts

Die Statistik-Seite enthält zwei Hauptvisualisierungen.

### 1. Verteilung nach Datentyp

Titel:

```text
Verteilung nach Datentyp (Anzahl)
```

Inhalt:

- Donut-Chart mit Gesamtzahl in der Mitte
- Legende / kompakte Tabelle daneben

Spalten in der Legende:

- Datentyp
- Anzahl
- Anteil

Beispiel:

```text
POI      12.458   35,0 %
Gastro    9.431   26,5 %
Tour      6.892   19,4 %
Hotel     4.128   11,6 %
Event     2.703    7,6 %
Package       —      —
```

Keinen Button **„Alle Datentypen anzeigen“** anzeigen.  
Die vollständige Datentyp-Tabelle ist darunter bereits sichtbar.

---

### 2. Open-Data-Quote nach Datentyp

Titel:

```text
Open-Data-Quote nach Datentyp
```

Inhalt:

- horizontales Balkendiagramm
- je Datentyp eine Quote
- Achse 0 bis 100 %
- dezente blaue Balken
- keine roten Warnfarben

Beispiel:

```text
POI      40,5 %
Gastro   23,6 %
Tour     31,2 %
Hotel    18,7 %
Event    22,1 %
Package  15,4 %
```

Keinen Button **„Alle Details anzeigen“** anzeigen, wenn die Detailtabelle darunter bereits sichtbar ist.

---

## Tabelle: Kennzahlen nach Datentyp

Unter den Charts eine vollständige aggregierte Tabelle anzeigen.

Titel:

```text
Kennzahlen nach Datentyp
```

Spalten:

- Datentyp
- Gesamtzahl
- Open-Data-fähig
- Open-Data-Quote
- Nicht Open-Data-fähig

Beispiel:

```text
Datentyp   Gesamtzahl   Open-Data-fähig   Open-Data-Quote   Nicht Open-Data-fähig
POI           12.458             5.045            40,5 %                 7.413
Gastro         9.431             2.229            23,6 %                 7.202
Tour           6.892             2.152            31,2 %                 4.740
Hotel          4.128               772            18,7 %                 3.356
Event          2.703               598            22,1 %                 2.105
Package            —                 —            15,4 %                     —
Gesamt        35.612             9.431            26,5 %                26.181
```

Die Open-Data-Quote darf in der Tabelle erscheinen, weil sie hier je Datentyp differenziert wird.

Nicht in die Tabelle aufnehmen:

- Datensätze mit Mängeln
- kritische Datensätze
- Qualitätsstatus
- Qualitäts-Score
- Hauptproblem
- Pflegeempfehlung
- ID
- global_id
- Links
- Fehlerstatus
- technische Query

---

## Gebietvergleich

Keinen Bereich **„Vergleich nach Gebiet“** anzeigen, wenn im Arbeitskontext bereits ein konkretes Gebiet gewählt ist.

Regel:

- Wenn `Gebiet = Dresden Elbland` oder ein anderes konkretes Gebiet gesetzt ist: Gebietvergleich ausblenden.
- Wenn `Gebiet = Alle Gebiete` oder kein Gebiet gesetzt ist: optional später Gebietvergleich anzeigen.
- In der ersten Umsetzung Gebietvergleich lieber vollständig entfernen, um die Statistik-Seite ruhig zu halten.

---

## Qualität entfernen

Auf der Statistik-Seite keine Qualitätslogik anzeigen.

Entfernen oder ausblenden:

- Qualitätsstatus-Verteilung
- Qualitäts-Score
- Datensätze mit Mängeln
- kritische Datensätze
- Pflegebedarf
- häufigste fehlende Kriterien
- Fehlerlisten-Links
- Hinweise auf Pflegeaufgaben außer in einem dezenten erklärenden Satz, falls nötig

Die Pflege- und Qualitätslogik gehört auf:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Datensatz-Detailseite

---

## Buttons und Aktionen

Sichtbare Aktionen auf der Statistik-Seite:

- Aktualisieren
- Filter zurücksetzen
- Statistik als CSV exportieren

Der CSV-Export gehört oben rechts oder als eigene ruhige Karte in der KPI-Zeile.

CSV enthält nur aggregierte Statistikwerte.

Keine Buttons:

- Alle Datentypen anzeigen
- Alle Details anzeigen
- Fehlerliste öffnen
- Pflegeaufgaben öffnen
- Datensätze anzeigen
- KI-Analyse starten

---

## Ladezustände

Ladezustände komponentennah integrieren.

Beim Aktualisieren:

- Button zeigt kurz „Aktualisieren …“
- KPI-Karten können Skeletons anzeigen
- Charts können Skeleton-Flächen anzeigen
- Tabelle kann dezente Ladezeilen anzeigen

Keine globale Ladeanimation für die ganze App.

Keine technischen Fortschrittsdetails im UI.

---

## Status- und Fehlermeldungen

Technische Details in die Console:

- Request-URLs
- HTTP-Status
- Querydetails
- Stacktraces
- JSON-Parse-Details

Im UI nur kurze nutzerverständliche Meldungen:

```text
Die Statistik konnte nicht vollständig geladen werden.
Bitte erneut aktualisieren.
```

Keine grünen Erfolgsmeldungen nach normalen Requests.

Der Erfolg ist sichtbar, wenn die Zahlen aktualisiert wurden.

---

## Berechnungslogik

Für jeden Datentyp:

```text
Gesamtzahl = overallcount der normalen Suche
Open-Data-fähig = overallcount der Open-Data-Suche
Nicht Open-Data-fähig = Gesamtzahl - Open-Data-fähig
Open-Data-Quote = Open-Data-fähig / Gesamtzahl
Anteil am Gesamtbestand = Gesamtzahl des Typs / Gesamtzahl aller Typen
```

Keine itembasierte Qualitätsbewertung auf dieser Seite verwenden.

Keine `normalizedItems` als Grundlage der Statistikzahlen verwenden.

Keine Stichprobe als Statistik ausgeben.

---

## API-schonende Logik

Die Statistik-Seite lädt nur aggregierte Counts.

Erlaubt:

- `/api/search` mit `overallcount`
- Open-Data-Count je Datentyp
- Count je Typ im aktuellen Arbeitskontext

Nicht erlaubt:

- `/api/quality/scan`
- große Item-Samples
- Vollständige Datensatzlisten
- Qualitätsbewertung über normalisierte Items
- KI-Kontext
- Medien oder Rohdaten

Wenn für die Statistik keine Items benötigt werden, kein Item-Limit größer als nötig setzen.

---

## Empty States

### Noch keine Statistik geladen

```text
Noch keine Statistik geladen.
Wählen Sie einen Arbeitskontext und aktualisieren Sie die Statistik.
```

### Keine Daten gefunden

```text
Für diesen Arbeitskontext wurden keine Datensätze gefunden.
```

### Fehler beim Laden

```text
Die Statistik konnte nicht vollständig geladen werden.
Bitte erneut aktualisieren.
```

Technische Details nur in die Console.

---

## Accessibility

Beachten:

- Navigation mit `aria-current="page"` für Statistik
- Filter mit echten Labels
- Buttons als echte Buttons
- Charts mit textlicher Zusammenfassung oder Tabellenfallback
- Tabelle mit sinnvollen Spaltenüberschriften
- Farbinformation nicht allein über Farbe vermitteln
- Fokuszustände sichtbar halten

---

## Akzeptanzkriterien

Die Statistik-Seite ist korrekt umgesetzt, wenn:

- sie visuell zur hellen neuen Designsprache passt
- „Statistik“ in der Navigation aktiv ist
- keine Stichproben-Datenbasis angezeigt wird
- die Datenbasis als vollständig ausgewiesen wird
- die Seite nur aggregierte Statistikwerte zeigt
- Zeitraum entfernt ist
- Qualitäts- und Problemfilter entfernt sind
- Qualitätsstatus, Mängel, kritische Datensätze und Pflegebedarf entfernt sind
- Gebietvergleich bei gewähltem Gebiet nicht angezeigt wird
- der Button „Alle Datentypen anzeigen“ entfernt ist
- der Button „Alle Details anzeigen“ entfernt ist
- Open-Data-Quote nicht redundant als gleichartige Hauptinformation doppelt dargestellt wird
- KPI-Zeile nur Gesamtzahl, Open-Data-fähig, Open-Data-Quote und Nicht Open-Data-fähig zeigt
- Verteilung nach Datentyp sichtbar ist
- Open-Data-Quote nach Datentyp sichtbar ist
- Kennzahlen nach Datentyp sichtbar sind
- Tabelle keine datensatzbezogenen oder qualitätsbezogenen Spalten enthält
- CSV-Export nur aggregierte Statistikdaten exportiert
- keine unnötigen API-Requests für Qualitätsdaten oder Datensatzlisten laufen
- technische Fehlerdetails nicht im UI stehen

---

## Nicht tun

Nicht:

- neues Framework einführen
- Build-Kette einführen
- Secrets ins Frontend schreiben
- Stichprobe als Datenbasis der Statistik anzeigen
- Zeitraumfilter anzeigen
- Qualitätsstatus anzeigen
- Qualitäts-Score anzeigen
- Datensätze mit Mängeln anzeigen
- kritische Datensätze anzeigen
- Pflegeaufgaben anzeigen
- Fehlerlisten verlinken
- Datensatzdetails verlinken
- Gebietvergleich anzeigen, wenn ein Gebiet gewählt ist
- Open-Data-Quote als redundantes Element mehrfach prominent darstellen
- technische API-Details im UI anzeigen
- große Datensatzlisten laden
- `/api/quality/scan` auf der Statistik-Seite verwenden

---

## Checks

Vor Abschluss ausführen:

```bash
git diff --check
```

Wenn Node verfügbar ist:

```bash
npm run check
npm run diagnose:quality-examples
```

Wenn Node nicht verfügbar ist, dokumentieren:

```text
Node-Checks konnten nicht ausgeführt werden.
```

---

## Leitbild

Die Statistik-Seite ist keine Pflegeoberfläche.

Sie ist eine ruhige, vollständige, aggregierte Auswertung des aktuellen Arbeitskontexts.

Sie zeigt:

- Wie viele Datensätze gibt es?
- Wie viele davon sind Open-Data-fähig?
- Wie verteilt sich der Bestand nach Datentyp?
- Welche Datentypen haben welche Open-Data-Quote?

Alles andere gehört auf andere Seiten.
