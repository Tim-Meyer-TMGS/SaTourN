# Arbeitsauftrag für Codex: Datensatz-Detailseite im SaTourN Datenqualitäts-Monitor

## 0. Ziel

Erstelle bzw. überarbeite die **Datensatz-Detailseite** für den SaTourN Datenqualitäts-Monitor.

Die Detailseite soll keine technische Rohdatenansicht sein. Sie soll Datenpflegende dabei unterstützen, einen einzelnen Datensatz schnell zu verstehen, die wichtigsten Qualitätsprobleme zu erkennen und direkt die nächste Pflegehandlung abzuleiten.

Die Seite soll zur hellen, ruhigen Designsprache der neuen Dashboard-Mockups passen:

- heller Hintergrund
- linke ruhige Navigation
- klarer Header mit Arbeitskontext
- weiße Karten mit feinen Rahmen
- dezente Schatten
- wenige Farben
- keine dunkle Dashboard-Optik
- keine überladenen Tabellen
- technische Details nur dort, wo sie für Pflege oder Diagnose nötig sind

---

## 1. Rolle der Nutzenden

Denke aus Sicht einer datenpflegenden Person.

Die zentrale Frage der Detailseite lautet nicht:

> Welche Felder hat dieser Datensatz technisch?

Sondern:

> Was muss ich wissen, um diesen Datensatz besser pflegen zu können?

Die Seite soll beantworten:

- Welcher Datensatz ist das?
- Ist der Datensatz nutzbar?
- Ist der Datensatz Open-Data-fähig?
- Welche Qualitätsprobleme liegen vor?
- Welche Inhalte sind vorhanden?
- Welche Inhalte fehlen?
- Welche Medien sind nutzbar?
- Fehlen Bildrechte oder Bildurheber?
- Sind Öffnungszeiten oder Besuchsinformationen vorhanden?
- Gibt es eine externe Pflegequelle oder ein Primärsystem?
- Wo kann ich den Datensatz öffnen, kopieren oder weiterbearbeiten?

---

## 2. Einordnung in die Seitenstruktur

Die Datensatz-Detailseite gehört fachlich zur Seite **„Datensätze“**.

Geplante Hauptnavigation:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Statistik

Auf der Detailseite bleibt **„Datensätze“** aktiv markiert.

Die Detailseite muss so umgesetzt werden:

1. als eigene statische Seite, z. B. `record-detail.html`

Langfristig ist eine echte Detailseite sinnvoll, damit der Zustand per URL geteilt und erneut geöffnet werden kann.

Empfohlene URL-Parameter:

```text
record-detail.html?type=POI&id=100061052
record-detail.html?type=POI&global_id=p_100061052
```

Keine vollständigen Rohdaten oder große Objekte in URL, `localStorage` oder `sessionStorage` speichern.

---

## 3. Zugangswege

Die Detailseite muss aus mehreren Kontexten erreichbar sein:

### Aus der Datensatzliste

Nutzer sucht oder filtert Datensätze und öffnet eine Zeile.

Der Rücksprung soll zurück zur aktuellen Liste führen:

```text
Zurück zur Liste
```

Wenn die Liste noch im Speicher ist, darf „Vorheriger“ und „Nächster“ innerhalb der aktuellen gefilterten Liste angeboten werden.

### Aus einer Pflegeaufgabe

Nutzer öffnet eine Pflegeaufgabe, sieht die betroffenen Datensätze und öffnet einen Datensatz.

Die Detailseite soll dann den Pflegekontext sichtbar machen:

```text
Aus Pflegeaufgabe: Lizenzangabe fehlt
```

In diesem Fall muss die wichtigste Baustelle prominent erscheinen.

### Aus einem Direktlink

Nutzer öffnet eine Detail-URL direkt.

Dann soll die Seite den Datensatz gezielt laden, ohne unnötige Listen oder Vollscans zu starten.

---

## 4. API-schonende Datenlogik

Die Detailseite darf keine Vollabfragen starten.

Grundregeln:

- Wenn der Datensatz bereits aus der aktuellen Liste im State vorhanden ist, diesen Datensatz wiederverwenden.
- Wenn nur `id` oder `global_id` vorliegt, gezielt nach genau diesem Datensatz suchen.
- Keine großen Listen nachladen, nur um einen einzelnen Datensatz zu zeigen.
- Keine Qualitäts-Server-Scans automatisch starten.
- Qualitätsbewertung mit vorhandener `quality.js`-Logik auf dem einzelnen Datensatz ausführen.
- Nur bei konkreter Nutzeraktion weitere Daten laden.
- Technische API-Details in die Console schreiben, nicht ins UI.

Mögliche gezielte Suchstrategie:

- `type` muss bekannt sein oder vom Link mitgegeben werden.
- Suche per `id`, `global_id` oder stabiler Query nur für diesen Datensatz.
- Wenn der Datensatz nicht eindeutig gefunden wird, ruhigen Empty State anzeigen.

Keine generischen Negativqueries erzeugen.

---

## 5. Keine Mockdaten

Auf der Detailseite dürfen keine fiktiven Werte stehen.

Keine Platzhalter wie:

- „Schloss Moritzburg“, wenn dieser Datensatz nicht geladen wurde
- erfundene Qualitätszahlen
- erfundene Bildanzahl
- erfundene Öffnungszeiten
- erfundene Pflegehinweise
- erfundene externe Systeme

Wenn Daten fehlen, klar anzeigen:

```text
Nicht angegeben
```

oder:

```text
Für diesen Datensatz nicht vorhanden
```

Nicht mit Beispieldaten auffüllen.

---

## 6. Datenstruktur aus POI-JSON berücksichtigen

Die hochgeladene POI-Beispieldatei enthält Destination.One/eT4-Items mit folgender relevanter Struktur.

### Top-Level

Wichtige Felder:

- `global_id`
- `id`
- `title`
- `type`
- `categories` / `categories_old`
- `areas` / `areas_old`
- `city`
- `zip`
- `street`
- `web`
- `email`
- `phone`
- `geo.main.latitude`
- `geo.main.longitude`
- `ratings`
- `texts`
- `media_objects`
- `timeIntervals`
- `alwaysOpen`
- `features` / `features_old`
- `keywords` / `keywords_old`
- `attributes`
- `addresses`
- `created`
- `changed`
- `source`

Diese Felder sollen nicht alle gleichzeitig prominent angezeigt werden. Sie dienen als Datenbasis für die Detailseite.

---

## 7. Textauslese

Texte liegen in `texts[]`.

Relevante `rel`-Werte:

- `details`
- `teaser`
- `openings`
- `directions`
- `PRICE_INFO`
- `PRICE_REDUCEDINFO`
- `WEB_SEO_TITEL`
- `WEB_SEO_BESCHREIBUNG`
- `dayoff`

Wichtig:

- Es gibt häufig `text/plain` und `text/html` parallel.
- Es gibt `details`-Einträge ohne `value`.
- Leere HTML-Texte dürfen nicht als vorhanden zählen.
- Teaser allein darf nicht als vollständige Beschreibung zählen.
- Für Qualitätslogik zählt Beschreibung weiterhin über `texts[].rel = details`.
- Für Anzeige darf Teaser zusätzlich gezeigt werden, aber klar als Teaser.

### Anzeigepriorität Beschreibung

Für die Hauptbeschreibung:

1. `texts[]` mit `rel = details`, `type = text/html`, wenn sinnvoller Inhalt vorhanden
2. sonst `rel = details`, `type = text/plain`
3. falls keine Details vorhanden: kurzer Hinweis „Keine Beschreibung vorhanden“
4. optional darunter Teaser anzeigen, wenn vorhanden

HTML muss sicher gerendert oder bereinigt werden.

Erlaubt sind einfache redaktionelle Formatierungen:

- Absätze
- Listen
- Fett/Kursiv
- Links

Nicht erlauben:

- Script
- Style
- Inline-Events
- fremde gefährliche Attribute
- ungeprüftes HTML

Wenn keine sichere HTML-Bereinigung vorhanden ist, HTML in Plaintext umwandeln.

### Weitere Textkarten

Zusätzliche Texte nur anzeigen, wenn vorhanden:

- Öffnungszeiten / Besuchszeiten aus `texts[rel=openings]`
- Anreise aus `texts[rel=directions]`
- Preisinfo aus `texts[rel=PRICE_INFO]`
- SEO-Titel und SEO-Beschreibung nur im Detailbereich, nicht prominent

---

## 8. Medienauslese

Medien liegen in `media_objects[]`.

Für die Haupt-Mediengalerie nur prüfbare Bilder anzeigen:

- `type` beginnt mit `image/`
- `url` ist vorhanden
- `rel` ist `default` oder `imagegallery`
- nicht anzeigen als Hauptbild:
  - `canonical`
  - `directions`
  - `wikipedia`
  - `booking`
  - `logo`
  - `socialmedia`

Sortierung:

1. `rel = default`
2. niedrigere `prio`
3. danach `imagegallery`
4. stabile Reihenfolge aus dem Datensatz

Pro Bild auslesen:

- `url`
- `value` als Bildtitel
- `alt`
- `description`
- `copyrightText`
- `copyrightEmail`
- `copyrightWeb`
- `license`
- `width`
- `height`
- `latitude`
- `longitude`
- `focusX`
- `focusY`
- `prio`
- `rel`

### Medienanzeige

In der Detailseite:

- maximal 3 bis 5 Bilder direkt anzeigen
- weitere Bilder über „Alle Medien anzeigen“
- Bilder lazy laden
- keine großen Bilder unnötig vorladen
- Bildfehler ruhig behandeln
- fehlende Bilder als Empty State anzeigen

Beispiel:

```text
Keine prüfbaren Bilder vorhanden.
```

### Bildrechte und Pflegehinweise

Bildrechte sind für Datenpflege sehr wichtig.

Für jedes Bild intern prüfen:

- Hat das Bild eine Lizenz?
- Hat das Bild `copyrightText`?
- Gibt es `alt`?
- Gibt es `description`?

In der Hauptansicht nicht jede technische Information zeigen.

Besser:

```text
3 Bilder vorhanden
1 Bild ohne Urheberangabe
2 Bilder ohne Alt-Text
```

In der Medien-Detailansicht pro Bild anzeigen:

- Urheber
- Lizenz
- Alt-Text
- Beschreibung
- Maße
- `rel`

Wenn `copyrightText` fehlt, als Pflegeproblem anzeigen:

```text
Bildurheber fehlt
```

Nicht mit Datensatz-Lizenz verwechseln.

Datensatz-Lizenz kommt aus `attributes[].key = license`.

Bildlizenz kommt aus `media_objects[].license`.

---

## 9. Öffnungszeiten

Öffnungszeiten können auf mehrere Arten vorliegen:

- `texts[].rel = openings`
- `timeIntervals[]`
- `alwaysOpen = true`

Anzeigepriorität:

1. Wenn `alwaysOpen === true`: „Immer geöffnet“ anzeigen
2. Wenn `texts[rel=openings]` vorhanden: redaktionellen Öffnungstext anzeigen
3. Wenn `timeIntervals[]` vorhanden: kompakte Wochenübersicht erzeugen
4. Wenn nichts vorhanden: „Keine Öffnungszeiten angegeben“

Wichtig:

- `timeIntervals[]` enthalten häufig technische Datumswerte mit `weekdays`, `start`, `end`, `tz`, `freq`, `interval`, ggf. `repeatUntil`.
- In der UI nicht roh anzeigen.
- Wochentage lesbar machen.
- Uhrzeiten aus `start` und `end` extrahieren.
- Wenn die Struktur nicht eindeutig ist, lieber „Öffnungszeiten vorhanden“ anzeigen und Rohdetails ins Detailpanel legen.

---

## 10. Adressen, Organisation und Rechte

Adressen liegen in `addresses[]` mit `rel`.

Relevante `rel`-Werte:

- `author`
- `organisation`
- `copyright`
- `contact_person`

Anzeige:

### Hauptansicht

Nur kompakt:

- Organisation
- Kontakt, falls für Pflege hilfreich
- Quelle

### Detailinformationen

Aus `addresses[]` anzeigen:

- Autor
- Organisation
- Copyright / Rechteinhaber
- Kontaktperson, falls vorhanden
- Web
- E-Mail
- Telefon
- Adresse

Nicht als große Tabelle. Besser als ruhige Key-Value-Liste.

---

## 11. Attribute und externe Systeme

Attribute liegen in `attributes[]` mit `key` und `value`.

Wichtige Werte:

- `license`
- `licenseurl`
- `Currency`
- `SYSTEMID_outdooractive`
- `SYSTEMID_GOOGLEPLACES`

### Datensatz-Lizenz

Datensatz-Lizenz:

```text
attributes[].key = license
```

Gültige Open-Data-Lizenzen:

- `CC0`
- `CC-BY`
- `CC-BY-SA`
- `PD`

Lizenz-URL:

```text
attributes[].key = licenseurl
```

### Externe Systeme

Outdooractive-ID:

```text
attributes[].key = SYSTEMID_outdooractive
```

Google-Places-ID:

```text
attributes[].key = SYSTEMID_GOOGLEPLACES
```

Anzeige:

- externe ID anzeigen
- ID kopieren ermöglichen
- keine Links raten, wenn Linkstruktur nicht verifiziert ist

Beispiel:

```text
Outdooractive-ID vorhanden
ID kopieren
```

Kein Button „In Outdooractive öffnen“, solange die URL-Struktur nicht verifiziert ist.

---

## 12. Nutzbarkeit

Die Detailseite soll eine kompakte Nutzbarkeitskarte haben.

Nicht zu viele Spalten oder Badges.

Empfohlene Kriterien:

- Open Data
- Lizenzstatus
- Beschreibung
- Bilder
- Bildrechte
- Öffnungszeiten
- ÖPNV-Info
- Buchungslink, falls für Typ relevant

Wichtig:

- Lizenzstatus und Open Data nicht doppelt erklären.
- Datensatz-Lizenz und Bildlizenz getrennt behandeln.
- Teaser zählt nicht als Beschreibung.
- Nicht relevante Kriterien ausgrauen oder ausblenden.

Beispiel:

```text
Open Data: ja
Beschreibung: vorhanden
Bilder: vorhanden
Bildrechte: 1 Bild ohne Urheber
Öffnungszeiten: vorhanden
ÖPNV-Info: fehlt
```

---

## 13. Qualitätsbewertung

Nutze die bestehende `quality.js`-Logik.

Die Detailseite soll zeigen:

- Qualitätsstatus
- Qualitäts-Score
- erfüllte Kriterien
- fehlende Kriterien
- nicht bewertbare Kriterien
- wichtigste Baustellen

Nicht neu erfinden:

- Kriterien
- Gewichtungen
- Statuslogik
- Open-Data-Logik

Fehlende Kriterien sollen als konkrete Pflegeaufgaben formuliert werden:

- „Lizenzangabe ergänzen“
- „Bildurheber ergänzen“
- „Beschreibung ergänzen“
- „Öffnungszeiten ergänzen“
- „ÖPNV-Anreise ergänzen“

---

## 14. Layout der Detailseite

Orientiere dich am hochauflösenden Mockup der Datensatz-Detailseite.

### Header

- Logo / SaTourN
- Arbeitskontext
- Button „Ändern“
- letzte Aktualisierung
- Aktualisieren-Button

### Breadcrumb / Kontext

```text
Datensätze > Datensatz-Detail
```

Wenn aus Pflegeaufgabe geöffnet:

```text
Pflegeaufgaben > Lizenzangabe fehlt > Datensatz-Detail
```

### Aktionsleiste

- Zurück zur Liste
- Vorheriger
- Nächster
- Öffnen auf et4 pages, wenn verifizierter Link vorhanden
- Aktionen

Aktionen:

- ID kopieren
- global_id kopieren
- Link kopieren
- Rohdaten anzeigen
- CSV-Zeile exportieren, optional später

### Kopfkarte

Links:

- Titel
- Typ-Chip
- Ort
- Gebiet
- Kategorie
- ID
- global_id
- letzte Aktualisierung

Rechts:

- Qualitätsstatus
- Score
- erfüllte / fehlende / nicht bewertbare Kriterien
- Link „Alle Kriterien anzeigen“

### Hauptbereich

3-Spalten- oder 2-Spalten-Layout, je nach Breite.

#### Linke Spalte

- Wichtigste Baustellen
- Nutzbarkeit
- Kategorie und Gebiet
- externe Systeme / IDs

#### Mittlere Spalte

- Beschreibung
- Teaser, falls hilfreich
- Medien
- Öffnungszeiten
- Anreise
- Preisinfo

#### Rechte Spalte

- Detailinformationen
- IDs
- Quelle
- Organisation / Autor / Copyright
- ET4-Pages-Link, falls vorhanden
- Rohdaten-Auszug

### Unterer Bereich

- gesamte Qualitätsbewertung
- Kriterienliste als kompakte Chips oder horizontale Liste
- kein breites technisches Tabellenmonster

---

## 15. Suche und Navigation auf Datensatzebene

Die eigentliche Suche gehört zur Datensatzliste, nicht primär zur Detailseite.

Auf der Datensatzseite muss gesucht werden können nach:

- Titel
- ID
- global_id
- Ort
- Gebiet
- Kategorie
- Problem / Kriterium
- Typ

Die Detailseite sollte aber einen kleinen Kontext behalten:

- zurück zur letzten Suche
- Vorheriger / Nächster aus aktueller Ergebnisliste
- aktueller Pflegekontext, falls vorhanden

Nicht auf der Detailseite eine große Suchmaske wiederholen.

---

## 16. ET4-Pages-Links

Automatische ET4-Pages-Links nur erzeugen, wenn Typ und Linklogik verifiziert sind.

Aktuell gilt:

- POI ist verifiziert:\
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`

Items ohne `global_id` dürfen keinen geratenen Link erhalten.

Für andere Typen nur aktivieren, wenn in der Projektentscheidung ausdrücklich verifiziert.

Wenn kein verifizierter Link vorhanden ist:

- Button ausblenden oder deaktivieren
- kein geratenes Ziel anzeigen

---

## 17. Technische Detailinformationen

Die Datensatz-Detailseite richtet sich primär an Datenpflegende und nicht an Entwickler.

Eine eigene Rohdatenansicht ist daher nicht erforderlich.

Technische Informationen sollen nur dort angezeigt werden, wo sie für die Pflege oder Nachverfolgung eines Datensatzes hilfreich sind.

Dazu gehören beispielsweise:

- ID
- global_id
- Quelle
- externe System-IDs
- letzte Aktualisierung
- verifizierte externe Links

Diese Informationen werden in den regulären Detailbereichen der Seite dargestellt.

Komplette JSON-Ausgaben, Rohdaten-Viewer oder einklappbare Debug-Bereiche sollen nicht Bestandteil der Detailseite sein.

Wenn technische Diagnosen erforderlich sind, erfolgen diese außerhalb der regulären Arbeitsoberfläche über bestehende Entwicklerwerkzeuge oder separate Diagnosefunktionen.

---

## 18. Ladezustände und Statusmeldungen

Ladezustände komponentennah integrieren.

Beispiele:

- Kopfkarte lädt → Skeleton-Karte
- Medien laden → Bild-Skeletons
- Detailinformationen laden → dezenter Inline-Status
- Rohdaten werden geöffnet → kein globaler Loader

Technische Details in Console:

- API-URL
- HTTP-Status
- Stacktrace
- JSON-Parse-Details
- Debug-Informationen

Im UI nur kurze nutzerrelevante Meldungen:

```text
Der Datensatz konnte nicht geladen werden.
```

```text
Für diese ID wurde kein Datensatz gefunden.
```

```text
Die Medien konnten teilweise nicht geladen werden.
```

Keine grünen Erfolgsmeldungen für normale Ladevorgänge.

---

## 19. Empty States

Ruhige Empty States definieren.

### Kein Datensatz geladen

```text
Noch kein Datensatz ausgewählt.
Suche in der Datensatzliste nach Titel, ID oder Ort und öffne einen Eintrag.
```

### Datensatz nicht gefunden

```text
Für diese ID wurde kein Datensatz gefunden.
Bitte prüfe Typ und ID oder kehre zur Datensatzliste zurück.
```

### Keine Bilder

```text
Keine prüfbaren Bilder vorhanden.
```

### Keine Beschreibung

```text
Keine Beschreibung vorhanden.
```

### Keine Öffnungszeiten

```text
Keine Öffnungszeiten angegeben.
```

---

## 20. Helferfunktionen

Prüfe, ob vorhandene Helper in `quality.js` und `scripts.js` wiederverwendet werden können.

Bestehende Logik bevorzugen:

- `normalizeItem`
- `evaluateAllItems`
- `qualityHelpers.getTextsByRel`
- `qualityHelpers.hasDetailsText`
- `qualityHelpers.getMediaObjects`
- `qualityHelpers.isCheckableMediaObject`
- `qualityHelpers.findMissingCopyrightMedia`
- `qualityHelpers.hasOpeningHours`
- `qualityHelpers.hasPublicTransportFeature`
- `qualityHelpers.getAttributeValue`
- `qualityHelpers.hasValidDatasetLicense`
- `qualityHelpers.getAreaValues`
- `qualityHelpers.getCategoryValues`

Wenn Helper fehlen, neue kleine, testbare Helper ergänzen:

- `getTextByRel(item, rel, preferredType)`
- `getDisplayDescription(item)`
- `getDisplayTeaser(item)`
- `getCheckableImages(item)`
- `getImageRightsSummary(item)`
- `getDatasetLicense(item)`
- `getExternalSystemIds(item)`
- `getOpeningHoursSummary(item)`
- `getRecordDetailViewModel(item)`

Wichtig: Die Detailseite sollte möglichst über ein ViewModel gerendert werden, damit HTML-Rendering und Datenlogik getrennt bleiben.

---

## 21. POI-Beispieldaten für Tests nutzen

Nutze `poi.json` zur Prüfung der Detailseite.

Zu testende Fälle:

### Beschreibung vorhanden

Datensätze mit `texts[rel=details]` in `text/html` und `text/plain`.

Erwartung:

- Beschreibung wird lesbar angezeigt.
- HTML wird sicher bereinigt oder in Text umgewandelt.
- Plaintext-Fallback funktioniert.

### Beschreibung fehlt

Datensätze mit leerem `details`.

Erwartung:

- keine leere Karte
- deutlicher Hinweis „Keine Beschreibung vorhanden“
- Kriterium „Beschreibung fehlt“ wird korrekt bewertet

### Bilder vorhanden

Datensätze mit `media_objects` und `rel = default` / `imagegallery`.

Erwartung:

- Hauptbild wird angezeigt
- weitere Bilder werden als Galerie angezeigt
- `canonical`, `directions`, `wikipedia` nicht als Bildgalerie anzeigen

### Bildurheber fehlt

Datensätze mit Bild ohne `copyrightText`.

Erwartung:

- Bild wird angezeigt
- Pflegeproblem „Bildurheber fehlt“ wird erkannt
- Rechtehinweis zeigt „Urheber fehlt“

### Öffnungszeiten

Fälle testen:

- `alwaysOpen = true`
- `texts[rel=openings]`
- `timeIntervals[]`
- keine Öffnungszeiten

Erwartung:

- kompakte verständliche Anzeige
- keine rohe technische Darstellung als Standard

### Outdooractive-ID

Fälle mit `SYSTEMID_outdooractive`.

Erwartung:

- externe ID wird erkannt
- ID kopieren möglich
- kein unverified Outdooractive-Link

---

## 22. Umsetzungsschritte

### Schritt 1: Datenanalyse

- `poi.json` lokal gegen die Helper prüfen.
- Ermitteln, welche Felder zuverlässig vorkommen.
- Keine neuen Qualitätsregeln ableiten, nur Anzeige und Helper verbessern.

### Schritt 2: ViewModel bauen

Eine zentrale Funktion erstellen:

```js
function getRecordDetailViewModel(item) {
  return {
    identity,
    location,
    quality,
    usability,
    texts,
    media,
    openingHours,
    directions,
    prices,
    externalSystems,
    detailInfo,
    raw
  };
}
```

Diese Funktion soll keine DOM-Manipulation enthalten.

### Schritt 3: Detail-UI bauen

- Kopfkarte
- Baustellenkarte
- Nutzbarkeitskarte
- Beschreibung
- Medien
- Öffnungszeiten
- Detailinformationen
- Qualitätskriterien unten

### Schritt 4: Verlinkung herstellen

- aus Datensatzliste öffnen
- aus Pflegeaufgabe öffnen
- Rücksprung zur Liste
- Vorheriger / Nächster innerhalb aktueller Ergebnisliste, falls vorhanden

### Schritt 5: Status und Fehler bereinigen

- technische Details in Console
- ruhige UI-Meldungen
- kein globales Statusrauschen

### Schritt 6: Tests

- mit `poi.json`
- mit bestehender Diagnose
- mit realen API-Daten, falls verfügbar

---

## 23. Akzeptanzkriterien

Die Umsetzung ist gut, wenn:

- die Detailseite in der hellen, ruhigen Designsprache erscheint
- „Datensätze“ in der Navigation aktiv ist
- ein einzelner POI-Datensatz verständlich dargestellt wird
- Beschreibung aus `texts` korrekt gelesen wird
- leere Details nicht als vorhandene Beschreibung zählen
- Teaser nicht als vollständige Beschreibung gewertet wird
- Bilder aus `media_objects` korrekt angezeigt werden
- nicht-prüfbare Medien nicht als Hauptbilder erscheinen
- Bildurheber, Bildlizenz, Alt-Text und Beschreibung im Medienbereich sichtbar sind
- fehlender Bildurheber als Pflegeproblem erscheint
- Datensatzlizenz und Bildlizenz nicht verwechselt werden
- Öffnungszeiten aus `alwaysOpen`, `texts[rel=openings]` und `timeIntervals` verständlich angezeigt werden
- Outdooractive-ID nur als ID/Kopieraktion erscheint, nicht als geratenes Linkziel
- ET4-Pages-Link nur bei verifizierter Typ-/global_id-Logik angezeigt wird
- Rohdaten standardmäßig verborgen sind
- keine Mockdaten angezeigt werden
- keine großen Listen oder Vollscans geladen werden
- Qualitätsbewertung bestehende `quality.js`-Logik nutzt
- technische Fehlerdetails in der Console stehen
- UI-Meldungen kurz und nutzerverständlich sind
- mobile und Tablet-Darstellung nicht bricht

---

## 24. Checks

Standard:

```bash
git diff --check
```

Wenn Node verfügbar ist:

```bash
npm run check
npm run diagnose:quality-examples
```

Optional, falls ein Detailseiten-Testskript ergänzt wird:

```bash
npm run diagnose:record-detail
```

Wenn Node nicht verfügbar ist, dokumentieren, dass die Checks nicht ausgeführt werden konnten.

---

## 25. Nicht tun

Nicht:

- neues Framework einführen
- Build-Kette einführen
- Secrets ins Frontend schreiben
- vollständige API-Antworten im Browser speichern
- große Rohdaten direkt anzeigen
- alle POI-Felder als Tabelle anzeigen
- Mockdaten verwenden
- Outdooractive-Links raten
- ET4-Links für nicht verifizierte Typen raten
- Teaser als vollständige Beschreibung zählen
- Bildlizenz und Datensatzlizenz vermischen
- technische Fehlermeldungen prominent im UI anzeigen
- automatische Vollscans beim Öffnen der Detailseite starten

---

## 26. Leitbild

Die Detailseite ist keine JSON-Vorschau.

Sie ist die Arbeitsansicht für einen konkreten Datensatz.

Eine gute Detailseite zeigt genau die Informationen, die Datenpflegende brauchen, um den Datensatz besser, nutzbarer und rechtssicherer zu machen.
