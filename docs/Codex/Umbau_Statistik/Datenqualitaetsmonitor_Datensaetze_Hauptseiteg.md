# Arbeitsauftrag für Codex: Datensätze-Hauptseite im SaTourN Datenqualitäts-Monitor

## 0. Ziel

Erstelle bzw. überarbeite die Seite **„Datensätze“** als zentrale Hauptseite für die Suche, Filterung und Auswahl einzelner Datensätze.

Diese Seite ist der Schritt **vor** der Datensatz-Detailseite.

Wenn Nutzer im Hauptmenü auf **„Datensätze“** klicken, sollen sie nicht direkt eine Detailseite sehen, sondern eine ruhige, klare Datensatzliste mit Such- und Filtermöglichkeiten.

Die Seite soll zwei zentrale Aufgaben erfüllen:

1. Datenpflegende können eine gefilterte Arbeitsliste abarbeiten.
2. Datenpflegende können gezielt einen bestimmten Datensatz über Name, ID oder `global_id` suchen.

Die Seite muss zur hellen, ruhigen Designsprache der neuen Mockups passen.

---

## 1. Rolle der Nutzenden

Denke aus Sicht einer datenpflegenden Person.

Die zentrale Frage dieser Seite lautet:

> Welchen Datensatz möchte ich prüfen oder bearbeiten?

Die Seite soll beantworten:

- Welche Datensätze liegen in meinem Arbeitskontext?
- Welche Datensätze sind kritisch?
- Welche Datensätze haben konkrete Pflegeprobleme?
- Finde ich einen bestimmten Datensatz über Name, ID oder `global_id`?
- Welche Datensätze sollte ich zuerst öffnen?
- Wie komme ich schnell zur Detailseite?

Die Seite soll keine technische Rohdatenliste sein.

Sie ist eine Arbeitsliste.

---

## 2. Einordnung in die Seitenstruktur

Die Datensätze-Seite ist eine der vier Hauptseiten:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Statistik

Auf dieser Seite ist **„Datensätze“** aktiv markiert.

Die Datensatz-Detailseite ist ein Folgeschritt.

Empfohlene Struktur:

```text
records.html
record-detail.html
```

Empfohlene Struktur:

```text
records.html
record-detail.html
```

Die Datensätze-Seite soll direkt als eigene Seite umgesetzt werden.

Keine Zwischenlösung über:

```text
index.html?view=records
```

verwenden.

„Datensätze“ ist eine eigenständige Hauptseite und soll über eine eigene URL erreichbar sein. Die Detailseite bleibt ein separater Folgeschritt für einzelne Datensätze.

---

## 3. Designrichtung

Orientiere dich am aktualisierten Mockup der Datensätze-Seite.

Designprinzipien:

- heller Hintergrund
- linke ruhige Navigation
- klarer Header mit Arbeitskontext
- große, einfache Überschrift
- zentrales Suchfeld
- wenige Filter in der ersten Ebene
- weiße Karten mit feinen Rahmen
- dezente Schatten
- sparsame Farben
- keine überladene Tabelle
- technische Informationen nur, wenn sie direkt beim Finden helfen
- IDs nicht als eigene Hauptspalten, sondern klein unter dem Titel

Nicht übernehmen:

- dunkle Dashboard-Optik
- sehr breite Rohdatentabellen
- technische Fehlertexte im UI
- große Statusmeldungsflächen
- doppelte Spalten mit gleicher Bedeutung

---

## 4. Header und Arbeitskontext

Oben im Header anzeigen:

- Arbeitskontext
- Button **„Ändern“**
- letzte Aktualisierung
- dezenter Aktualisieren-Button

Beispiel:

```text
Arbeitskontext
Dresden Elbland · Alle Orte · Alle Datentypen
```

Der Arbeitskontext soll lokal gespeichert werden dürfen, aber nur mit kleinen UI-Werten:

- Gebiet / Destination
- Ort
- Datentyp

Nicht lokal speichern:

- vollständige API-Antworten
- große Fehlerlisten
- Rohdaten
- KI-Kontexte
- Secrets

---

## 5. Seitenkopf

Der Seitenkopf soll knapp sein.

Beispiel:

```text
Datensätze
Suche und prüfe einzelne Datensätze oder arbeite gefilterte Listen ab.
```

Kein langer Erklärungstext.

Keine KPIs im Seitenkopf, außer sie helfen direkt bei der aktuellen Liste.

---

## 6. Zentrales Suchfeld

Es gibt **ein gemeinsames Suchfeld**.

Kein separates ID-Feld bauen.

Das Suchfeld muss sowohl Freitext als auch bekannte IDs unterstützen.

Placeholder:

```text
Suche nach Titel, ID, global_id, Ort, Kategorie oder Problem …
```

Unter dem Feld ein dezenter Hinweis:

```text
Du kannst auch direkt eine ID oder global_id eingeben.
```

Die Suche soll finden über:

- Titel
- ID
- `global_id`
- Ort
- Gebiet
- Kategorie
- Problem / Kriterium
- Typ

Beispiele für gültige Suchbegriffe:

```text
100061052
p_100061052
Schloss Wackerbarth
Radebeul
Lizenz fehlt
Bildurheber fehlt
Öffnungszeiten fehlen
```

---

## 7. Suchlogik

Die Suche muss API-schonend sein.

### Während der Eingabe

- lokal in der aktuellen Liste filtern
- Debounce verwenden
- keine API-Anfrage bei jedem Tastendruck
- Ergebnisliste ruhig aktualisieren

### Bei Enter oder Klick auf „Suchen“

- zuerst lokale Treffer anzeigen
- wenn keine lokalen Treffer vorhanden sind und der Suchbegriff wie eine ID oder `global_id` aussieht, gezielt diesen Datensatz suchen
- keine Vollabfrage starten
- keine Qualitäts-Server-Scans starten

### ID-Erkennung

Erkenne einfache ID-Muster:

- numerische ID, z. B. `100061052`
- `global_id`, z. B. `p_100061052`
- bekannte Prefixe aus Destination.One, falls vorhanden

Wenn ein Suchbegriff wie eine ID aussieht:

```text
Gezielte Datensatzsuche nach ID starten
```

Wenn kein Treffer gefunden wird:

```text
Für diese Suche wurde kein Datensatz gefunden.
```

Keine technischen Querydetails im UI anzeigen.

Technische Details in die Console schreiben.

---

## 8. Filterleiste

Die erste Filterebene soll kurz bleiben.

Standardfilter:

- Typ
- Kategorie
- Qualitätsstatus
- Problem / Kriterium
- Filter zurücksetzen

Nicht in die erste Ebene:

- rohe API-Query
- technische IDs
- Erstellungsdatum
- komplexe Feldfilter
- externe Systeme
- Rohdatenstatus

Weitere Filter nur über **„Mehr Filter“**.

Mögliche zusätzliche Filter:

- Gebiet
- Ort
- Open-Data-Nutzbarkeit
- Bildstatus
- Öffnungszeiten
- Externe ID vorhanden
- Aktualisiert seit

Diese zusätzlichen Filter sollen eingeklappt bleiben.

---

## 9. Schnellfilter

Unter der Hauptfilterleiste sollen ruhige Schnellfilter angeboten werden.

Beispiele:

- Nur kritische Datensätze
- Ohne Lizenz
- Ohne Beschreibung
- Ohne Bilder
- Ohne Öffnungszeiten
- Mehr Filter

Schnellfilter dürfen Trefferzahlen anzeigen, aber nur wenn diese aus der aktuellen Datenbasis belastbar sind.

Wenn die Zahlen aus einem Sample stammen, muss dies an geeigneter Stelle transparent sein.

Keine grellen Badges.

Kritische Farben sparsam verwenden.

---

## 10. Ergebnisliste

Die Tabelle ist der zentrale Arbeitsbereich.

Sie soll schlank bleiben.

Empfohlene Standardspalten:

- Titel
- Typ
- Ort / Gebiet
- Kategorie
- Qualitätsstatus
- Hauptproblem
- Qualitäts-Score
- Aktualisiert
- Aktionen

Nicht als eigene Hauptspalten anzeigen:

- ID
- `global_id`
- Open-Data-Status
- Lizenz
- Lizenzstatus
- vollständige URL
- Rohdaten
- alle fehlenden Kriterien
- technische Query
- Quelle

IDs werden klein unter dem Titel angezeigt:

```text
ID: 100061052 · p_100061052
```

Damit kann ein Nutzer IDs sehen und prüfen, ohne die Tabelle mit technischen Spalten zu überladen.

---

## 11. Titelspalte

Die Titelspalte ist die wichtigste Spalte.

Sie soll enthalten:

- kleines Vorschaubild, wenn vorhanden
- Titel
- ID und `global_id` klein darunter

Beispiel:

```text
Schloss Wackerbarth
ID: 100061052 · p_100061052
```

Wenn kein Bild vorhanden ist:

- ruhiger Platzhalter
- keine auffällige Warnung nur wegen fehlendem Vorschaubild

Wenn kein Titel vorhanden ist:

```text
Ohne Titel
```

---

## 12. Qualitätsstatus

Die Qualitätsstatus-Spalte soll kompakt sein.

Werte:

- gut
- prüfen
- kritisch
- nicht bewertbar

Darstellung:

- kleiner Punkt oder dezentes Icon
- kurzer Text
- keine großen farbigen Badges

Farben sparsam:

- grün für gut
- orange für prüfen
- rot nur für kritisch
- grau für nicht bewertbar

---

## 13. Hauptproblem

Zeige nur das wichtigste Problem.

Nicht alle fehlenden Kriterien in die Tabelle schreiben.

Beispiele:

- Lizenzangabe fehlt
- Bildurheber fehlt
- Beschreibung fehlt
- Öffnungszeiten fehlen
- Keine Bilder vorhanden
- ÖPNV-Anreise fehlt
- —

Das wichtigste Problem ergibt sich aus:

- Priorität des Kriteriums
- Qualitätsbewertung
- aktueller Pflegekontext
- aktivem Problemfilter

Wenn eine Pflegeaufgabe aktiv ist, soll dieses Problem priorisiert angezeigt werden.

Weitere Probleme gehören in die Detailseite.

---

## 14. Qualitäts-Score

Der Score darf angezeigt werden, aber kompakt.

Beispiel:

```text
67 / 100
```

Optional kleine horizontale Linie.

Keine großen Diagramme in der Tabelle.

Wenn der Score nicht berechenbar ist:

```text
—
```

oder:

```text
nicht bewertbar
```

---

## 15. Aktionen pro Zeile

Pro Zeile nur wenige Aktionen.

Empfohlen:

- Vorschau / ansehen
- Detail öffnen

Optional im Kontextmenü:

- ID kopieren
- `global_id` kopieren
- verifizierten ET4-Link kopieren
- Datensatz in ET4 pages öffnen, wenn Link verifiziert

Keine langen URLs in der Tabelle.

Der primäre Klick öffnet die Detailseite.

Empfohlener Link:

```text
record-detail.html?type=POI&id=100061052
```

oder, wenn stabiler:

```text
record-detail.html?type=POI&global_id=p_100061052
```

---

## 16. Kontext aus Pflegeaufgaben

Wenn Nutzer von einer Pflegeaufgabe kommt, soll die Datensatzliste diesen Kontext behalten.

Beispiel:

```text
Pflegeaufgabe: Lizenzangabe fehlt
```

In diesem Fall:

- Problemfilter ist voreingestellt
- Hauptproblem-Spalte zeigt diese Aufgabe
- Liste enthält nur passende Treffer
- Button „Pflegeaufgabe verlassen“ oder „Filter zurücksetzen“ anbieten

Keine automatische Vollabfrage beim Öffnen der Liste.

Wenn Typ und Kriterium eindeutig sind, darf `/api/quality/scan` gezielt und paginiert genutzt werden.

Wenn mehrere Typen betroffen sind, erst Typauswahl anbieten.

---

## 17. API-schonende Datenlogik

Die Datensatzliste darf nicht beim Öffnen alles laden.

Grundregeln:

- aktuelle Datenbasis aus State wiederverwenden, wenn vorhanden
- lokale Filterung bevorzugen
- API-Suche nur bei expliziter Nutzeraktion
- ID-Suche gezielt
- Server-Scan nur bei konkretem Typ und Kriterium
- keine Vollscans
- keine generischen Negativqueries
- keine API-Anfrage pro Tastendruck
- Pagination verwenden
- große Listen nicht vollständig im Browser sammeln
- Samples transparent kennzeichnen

Bestehende Logik beachten:

- `/api/search` für Counts und begrenzte Item-Samples
- `/api/quality/scan` nur bei konkretem Typ und Kriterium
- Qualitätsbewertung über `quality.js`
- bestehende Normalisierung und Helper wiederverwenden

---

## 18. Datenbasis-Hinweise

Hinweise sollen dezent sein.

Beispiele:

```text
Die Qualitätsbewertung basiert auf den aktivierten Kriterien und verfügbaren Daten.
```

```text
Diese Liste basiert auf einer begrenzten Stichprobe.
```

```text
Für vollständige Fehlerlisten wird bei konkretem Typ und Kriterium ein Server-Scan genutzt.
```

Keine technischen API-Details.

Keine Stacktraces.

Keine Request-URLs.

---

## 19. CSV-Export und Spaltensteuerung

CSV-Export gehört auf die Datensatzliste.

Export soll sich auf die aktuelle Liste beziehen.

Wenn die Liste nur ein Sample ist, muss dies im Exportkontext erkennbar sein.

Die UI-Tabelle bleibt schlank.

CSV darf zusätzliche Felder enthalten, wenn sie für Pflege oder Weiterverarbeitung sinnvoll sind, zum Beispiel:

- ID
- `global_id`
- Titel
- Typ
- Gebiet
- Ort
- Kategorie
- Qualitätsstatus
- Qualitäts-Score
- Hauptproblem
- fehlende Kriterien
- empfohlene Aktion
- Datensatz-Lizenz
- ET4-Link, falls verifiziert
- letzte Aktualisierung

Spaltensteuerung im UI:

- optional Button **„Spalten“**
- nur wenige optionale Spalten
- nicht als komplexe Tabellenkonfiguration ausbauen

---

## 20. Listen- und Rasteransicht

Die Standardansicht ist die Liste.

Optional kann später eine Rasteransicht entstehen.

Im ersten Schritt reicht:

- Listenansicht aktiv
- Raster-Button darf vorbereitet sein
- Raster muss nicht vollständig umgesetzt werden

Keine neue Komplexität erzeugen, wenn sie nicht benötigt wird.

---

## 21. Pagination

Pagination ist Pflicht.

Standard:

```text
25 pro Seite
```

Weitere Optionen:

- 50
- 100

Nicht:

- „Alle anzeigen“

Unten anzeigen:

```text
Zeige 1 bis 25 von 1.248
```

Wenn Gesamtzahl nur geschätzt oder aus Sample stammt, transparent formulieren:

```text
Zeige 1 bis 25 von 500 Stichprobentreffern
```

---

## 22. Empty States

Ruhige Empty States definieren.

### Noch keine Daten geladen

```text
Noch keine Datensätze geladen.
Wähle einen Arbeitskontext oder starte eine Suche.
```

### Keine Treffer

```text
Für diese Filter wurden keine Datensätze gefunden.
```

### Keine ID gefunden

```text
Für diese ID wurde kein Datensatz gefunden.
Bitte prüfe die Eingabe oder suche nach dem Titel.
```

### API-Fehler

```text
Die Datensätze konnten nicht geladen werden.
Bitte versuche es später erneut.
```

Technische Details nur in der Console.

---

## 23. Ladezustände

Ladezustände komponentennah integrieren.

Beispiele:

- Suchfeld/Listenbereich zeigt „Datensätze werden gesucht …“
- Tabelle zeigt Skeleton-Zeilen
- Pagination deaktiviert während des Ladens
- Button zeigt „Suchen …“

Keine große globale Ladeanimation für kleine Aktionen.

Keine grünen Erfolgsmeldungen für normale Requests.

---

## 24. Detailseite öffnen

Die Datensatzliste muss zur Detailseite führen.

Beim Öffnen:

- Typ und ID oder `global_id` in URL übergeben
- aktuellen Such-/Filterkontext möglichst erhalten
- Rücksprung zur Liste ermöglichen
- optional Index der aktuellen Liste für „Vorheriger / Nächster“ merken, aber keine großen Rohdaten speichern

Nicht:

- kompletten Datensatz in URL speichern
- komplette Liste in `localStorage` speichern
- große Rohdaten im Session Storage ablegen

---

## 25. Technische Umsetzung

Bestehende Helper und Logik bevorzugen.

Relevante bestehende Strukturen:

- `dashboardState`
- `normalizedItems`
- `filteredItems`
- `qualityAggregations`
- `qualityCriteria`
- `qualityHelpers`
- `evaluateAllItems`
- `normalizeItem`
- `itemMatchesActiveFilters`
- `loadServerIssueList`
- `buildQualityScanUrl`

Wenn nötig, ergänze neue kleine Helper:

```js
function getRecordSearchText(item) {}
function itemMatchesRecordSearch(item, query) {}
function looksLikeRecordId(query) {}
function getPrimaryIssue(item, context) {}
function getRecordListViewModel(items, context) {}
function buildRecordDetailUrl(item, context) {}
function searchSingleRecordById(query, type) {}
```

Diese Helper sollen testbar und möglichst DOM-frei sein.

---

## 26. ViewModel für die Liste

Die Tabelle sollte nicht direkt aus Rohdaten gerendert werden.

Baue ein ViewModel pro Zeile.

Beispiel:

```js
{
  id,
  globalId,
  title,
  type,
  thumbnailUrl,
  city,
  region,
  category,
  qualityStatus,
  qualityScore,
  primaryIssue,
  updatedAt,
  detailUrl,
  actions
}
```

Die Anzeige nutzt dieses ViewModel.

Rohdaten bleiben im Hintergrund.

---

## 27. Tests mit POI-Daten

Nutze `poi.json` zur Prüfung.

Zu testende Fälle:

### Suche nach Titel

Beispiel:

```text
Schloss Wackerbarth
```

Erwartung:

- Treffer erscheint
- Detail-Link enthält Typ und ID oder `global_id`

### Suche nach numerischer ID

Beispiel:

```text
100061052
```

Erwartung:

- Datensatz wird lokal gefunden, wenn vorhanden
- sonst gezielte Suche möglich

### Suche nach global\_id

Beispiel:

```text
p_100061052
```

Erwartung:

- Treffer wird gefunden
- ID wird klein unter dem Titel angezeigt

### Suche nach Ort

Beispiel:

```text
Radebeul
```

Erwartung:

- passende Datensätze werden angezeigt

### Suche nach Problem

Beispiel:

```text
Bildurheber fehlt
```

Erwartung:

- Datensätze mit diesem Hauptproblem oder fehlendem Kriterium erscheinen

### Medienvorschau

Erwartung:

- erstes prüfbares Bild als Thumbnail
- keine `canonical`, `wikipedia`, `directions` als Bild anzeigen

### Qualitätsstatus

Erwartung:

- Status und Score aus `quality.js`
- kein erfundener Status

---

## 28. Barrierefreiheit

Beachten:

- Suchfeld mit Label
- Filter mit Labels
- Tabellenkopf korrekt
- Zeilenaktionen als echte Buttons oder Links
- Fokuszustände sichtbar
- Tastaturbedienung möglich
- Statusänderungen dezent mit `aria-live`, aber nicht laut für jede Eingabe
- Bilder mit sinnvollem `alt`, falls vorhanden, sonst leerer `alt` für dekorative Thumbnails

---

## 29. Akzeptanzkriterien

Die Umsetzung ist gut, wenn:

- „Datensätze“ als Hauptseite eine Liste zeigt
- keine Detailseite automatisch geöffnet wird
- ein gemeinsames Suchfeld für Titel, ID, `global_id`, Ort, Kategorie und Problem vorhanden ist
- keine separate ID-Suche sichtbar ist
- lokale Suche ohne API-Request pro Tastendruck funktioniert
- gezielte ID-Suche bei Enter oder Button möglich ist
- die Tabelle schlank bleibt
- IDs klein unter dem Titel stehen
- Lizenz / Open Data / Lizenzstatus nicht redundant als Spalten erscheinen
- Hauptproblem nur ein priorisiertes Problem zeigt
- Detailseite per Klick erreichbar ist
- API-schonende Logik eingehalten wird
- Pagination vorhanden ist
- CSV-Export die aktuelle Liste exportiert
- Empty States ruhig und verständlich sind
- technische Fehlerdetails nicht im UI stehen
- helle, ruhige Designsprache eingehalten wird
- keine Mockdaten im produktiven Code stehen

---

## 30. Checks

Standard:

```bash
git diff --check
```

Wenn Node verfügbar ist:

```bash
npm run check
npm run diagnose:quality-examples
```

Wenn ein eigener Diagnosetest ergänzt wird:

```bash
npm run diagnose:record-list
```

Wenn Node nicht verfügbar ist, dokumentieren, dass die Checks nicht ausgeführt werden konnten.

---

## 31. Nicht tun

Nicht:

- neues Framework einführen
- Build-Kette einführen
- Secrets ins Frontend schreiben
- komplette Rohdaten in der Tabelle anzeigen
- separate große ID-Suche bauen
- bei jedem Tastendruck API-Anfragen senden
- alle Daten beim Öffnen der Seite laden
- Vollständigkeit behaupten, wenn nur Samples vorliegen
- technische Querydetails im UI anzeigen
- lange URLs als Tabellenspalten anzeigen
- alle fehlenden Kriterien als Spalten anzeigen
- Detaildaten in `localStorage` speichern
- ET4-Links für nicht verifizierte Typen raten
- Tabelle mit zu vielen Badges überladen

---

## 32. Leitbild

Die Datensätze-Seite ist die ruhige Arbeitsliste.

Sie hilft, relevante Datensätze zu finden, zu priorisieren und gezielt zu öffnen.

Eine gute Liste zeigt nicht alle Informationen.

Eine gute Liste zeigt genau genug, damit Datenpflegende entscheiden können, welchen Datensatz sie als Nächstes öffnen.
