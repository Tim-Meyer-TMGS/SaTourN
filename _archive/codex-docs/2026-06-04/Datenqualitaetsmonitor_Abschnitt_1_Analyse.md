# Datenqualitaets-Monitor - Abschnitt 1: Projektanalyse und Plan

Stand: 2026-06-02

## Zielbildbezug

`docs/Codex/zielbild.png` und `docs/Codex/Zielbild.md` zeigen das spaetere Ziel als erweitertes SaTourN-Statistik-Dashboard: Filter und bestehende Statistik bleiben oben erhalten, darunter kommen Qualitaets-KPIs, Pflegebedarfe, Fehlerlisten, Matrix, Datentyp-Uebersicht, CSV-Export und spaeter ein KI-Chatbot hinzu.

Fuer Abschnitt 1 wurden bewusst keine UI, keine Qualitaetskriterien, keine neuen Exporte und keine Refactorings umgesetzt. Diese Datei dokumentiert nur die bestehende Struktur und die empfohlenen Anschlussstellen.

## Projektstruktur

Das Repository kombiniert ein statisches Jekyll/GitHub-Pages-Frontend mit einem kleinen Express-Proxy fuer die Destination.One-Suche.

- `index.html`, `base.css`, `style.css`: Startseite, globale Gestaltung, Tool-Navigation.
- `_layouts/default.html`, `_includes/`: Jekyll-Layout, Menue und Footer.
- `Statistik/`: bestehendes SaTourN-Statistik-Dashboard.
- `lib/browser/`: wiederverwendbare Browser-Helfer fuer Fetch, XML, Download, UI und ET4-Daten.
- `index.js`, `routes/search.js`, `lib/config.js`, `lib/search-utils.js`, `lib/cache.js`: Express-Proxy fuer `/api/search`.
- Weitere Tool-Unterordner wie `OA-Datenabruf/`, `Category-Editor/`, `Pages-Builder/`, `KG-Finder/` sind fuer den Datenqualitaets-Monitor aktuell nicht der Kernpfad.

## Relevante Dateien

- `Statistik/index.html`: Markup fuer Filter, Buttons, Fortschritt, KPI-Zeile, Charts und Ergebnistabelle.
- `Statistik/main.js`: Modul-Einstieg, importiert `scripts.js`.
- `Statistik/scripts.js`: Hauptlogik des Dashboards.
- `Statistik/style.css`: scoped Styling fuer die Statistikseite.
- `base.css`: globale Design-Tokens, Layout, Buttons, Fokuszustaende, Menue und Footer.
- `lib/browser.js`: Barrel-Export fuer Browser-Helfer.
- `lib/browser/http.js`: `fetchText()` mit Timeout und defensiver Text-Antwort.
- `lib/browser/et4.js`: `extractItems()`, `extractTotal()`, `extractId()`.
- `lib/browser/download.js`: `downloadText()` und Blob-Download fuer CSV.
- `routes/search.js`: `/api/search`-Proxy inklusive Open-Data-Lizenzfilter.
- `lib/search-utils.js`: Query-Normalisierung, Limits und Ziel-URL-Aufbau.
- `lib/config.js`: Umgebungsvariablen fuer Proxy, API-Key, Limits und Timeout.

## Bestehende HTML-Struktur

`Statistik/index.html` enthaelt bereits die fuer das Zielbild wichtigen Basisbereiche:

- Filter fuer Gebiet, Ort, Typ, Kategorie und Sortierung.
- Checkbox `Alle Gebiete abfragen`.
- Buttons `Ergebnisse suchen`, `Abbrechen`, `CSV Export`.
- Fortschrittsanzeige mit `aria-live` und Progressbar.
- Status-Pill.
- KPI-Zeile fuer SaTourN, Open-Data, Quote und Fehler.
- Zwei Canvas-Charts.
- Ergebnisbereich als dynamisch gerenderte Tabelle.

Die Zielbild-Erweiterungen sollten daher spaeter innerhalb dieser Statistikseite ergaenzt werden, ohne Titel, Branding, Grundlayout und bestehende Statistikbereiche zu ersetzen.

## Bestehende CSS-Struktur

`Statistik/style.css` ist sauber auf `.statistik` gescoped. Es definiert:

- Karten- und Headeroptik passend zu `base.css`.
- 12-spaltiges Filtergrid mit responsiven Breakpoints.
- Summary-Karten als vier gleich breite KPIs.
- Zwei Chart-Karten.
- Scrollbare Ergebnistabelle mit sticky Header.
- Fehlerzeilen und Statusfarben.

Fuer das Zielbild bieten sich spaetere Erweiterungen als zusaetzliche `.statistik`-Sektionen an. Wiederverwendbar sind insbesondere Karten, Tabellen, Statusfarben, Fokuszustaende und responsive Grid-Muster.

## Bestehende Datenlade-Logik

Der aktuelle Datenfluss liegt in `Statistik/scripts.js`:

1. `API_BASE` zeigt lokal auf `http://localhost:3000/api/search`, sonst auf `https://satourn.onrender.com/api/search`.
2. Gebietswerte werden ueber `loadAreaTitles()` mit Typ `Area` geladen.
3. Orte werden mit `loadCityTitles(area)` ueber Query `area:"..."` und Typ `City` geladen.
4. Kategorien kommen nicht aus JSON, sondern aus ET4-XML-Kategoriebaeumen je Typ.
5. `prepareRows()` und `buildQueryRows()` erzeugen Aggregat-Abfragezeilen aus den aktiven Filtern.
6. Pro Zeile ruft `runQueue()` zwei Requests ab: einmal Gesamtbestand, einmal Open-Data-Bestand.
7. `fetchCountForJob()` liest aus jeder JSON-Antwort nur `overallcount` bzw. einen kompatiblen Total-Wert.

Wichtig fuer die Weiterentwicklung: Das Dashboard speichert aktuell keine vollstaendigen touristischen Datensaetze. `state.latestRows` enthaelt Aggregat-Zeilen mit Gebiet, Ort, Typ, Kategorie, Query, Gesamtzahl, Open-Data-Zahl und Fehlern. Fuer klickbare Qualitaetsprobleme und Fehlerlisten muss spaeter zusaetzlich item-level JSON geladen, normalisiert und gefiltert werden.

## Bestehende Filterlogik

Aktive Filter werden derzeit in `state.selectedArea`, `state.selectedPlace`, `state.selectedType` und `state.selectedCategory` gehalten. `currentFilters()` liest daraus die aktuelle Abfragekonfiguration.

Besonderheiten:

- Typ steuert die Kategorieauswahl.
- Gebiet steuert die Ortsauswahl.
- `Alle Gebiete abfragen` deaktiviert die Einzelfilter und erzeugt Abfragen fuer alle Gebiete und alle Typen.
- Ohne Gebiet, aber mit Typ, werden je nach Kategorieauswahl Abfragen ueber alle Gebiete und Kategorien erzeugt.
- Sortierung wirkt erst nach dem Laden auf `state.latestRows`.

Eine zentrale spaetere State-Struktur sollte diese Filter weiterverwenden, aber um `filteredItems`, `activeIssue`, `qualityStatus`, `criterionId`, `priority`, `autoCheck` und Suche erweitert werden.

## Bestehende KPI-Berechnung

`computeSummary(rows)` berechnet aktuell:

- Summe aller gueltigen SaTourN-Zaehler.
- Summe aller gueltigen Open-Data-Zaehler.
- Open-Data-Quote aus Open-Data/Gesamt.
- Anzahl fehlerhafter oder unvollstaendiger Zeilen.

Diese Logik ist zeilen- und aggregatbasiert. Qualitaets-KPIs sollten spaeter separat aus normalisierten und gefilterten Items berechnet werden, damit die bestehende Statistikquote unveraendert bleibt.

## Bestehende Diagramm- und Tabellenlogik

Die Diagramme sind eigene Canvas-Renderer ohne externe Chart-Bibliothek:

- `drawRatioChart(rows)` zeigt Open-Data-Anteil gesamt.
- `drawTypeChart(rows)` gruppiert nach Typ und zeigt die Quote je Typ.

Die Ergebnistabelle wird in `renderTable(rows)` dynamisch aufgebaut und zeigt:

- Gebiet
- Ort
- Typ
- Kategorie
- SaTourN
- Open-Data
- Open-Data %
- Status

Die Zielbild-Bereiche wie Qualitaetsstatus-Verteilung, Pflegebedarfe, Datentyp-Uebersicht und Matrix sollten spaeter neue Renderer bekommen, statt diese bestehende Tabelle umzudeuten.

## Bestehender CSV-Export

`downloadCsv()` exportiert die aktuell sortierten Aggregat-Zeilen aus `state.latestRows` mit Semikolon-Trennung und Quote/Status. Der Download nutzt `downloadText()` aus `lib/browser/download.js`.

Fuer den Datenqualitaets-Monitor sollte der CSV-Export spaeter erweitert oder verzweigt werden:

- bestehender Statistik-Export bleibt fuer Aggregat-Zeilen erhalten.
- aktive Fehlerliste exportiert normalisierte Datensaetze mit fehlendem Kriterium, Status, Empfehlung und Quelle.
- Export muss die aktiven Filter und das aktive Kriterium beruecksichtigen.

## Einschaetzung: Datennormalisierung

Die Normalisierung sollte in `Statistik/scripts.js` nahe am bestehenden State und den ET4-Helfern ergaenzt werden. Gute Anschlussstellen:

- direkt nach `state`, um einen zentralen `dashboardState` oder eine vorsichtig erweiterte bestehende State-Struktur einzufuehren.
- nach `parseJsonPayload()`/`extractItemTitles()`, weil dort JSON-Antworten bereits defensiv gelesen werden.
- mit `extractItems()` aus `lib/browser/et4.js`, um verschiedene Antwortformen zu unterstuetzen.

Wichtig: Die bestehende Aggregatlogik nutzt nur Counts. Fuer Qualitaetslisten braucht es entweder zusaetzliche Item-Requests oder eine erweiterte Datenladefunktion, die neben Counts auch Item-Samples bzw. paginierte Datensaetze sammelt. Originaldaten sollten im normalisierten Item unter `raw` erhalten bleiben.

## Einschaetzung: Qualitaetsauswertung

Die Qualitaetsauswertung sollte nach der Normalisierung und vor den spaeteren Qualitaets-Renderern liegen:

- Kriterien zentral konfigurieren, nicht im HTML verstreuen.
- Bewertung pro normalisiertem Item berechnen.
- Aggregationen aus `dashboardState.filteredItems` ableiten.
- Bestehende `computeSummary(rows)`-Statistik nicht ersetzen.

Die spaetere Architektur sollte zwei Ebenen klar trennen:

- Statistik-Aggregate: `latestRows`, bestehende KPIs, bestehende Charts, bestehender CSV-Export.
- Datenqualitaet auf Items: `normalizedItems`, `filteredItems`, Kriterien, Scores, Issue-Listen, Matrix und KI-Kontext.

## Einschaetzung: CSV-Export-Erweiterung

Der aktuelle Export ist ein guter Einstiegspunkt, sollte aber nicht direkt mit Qualitaetsfeldern ueberladen werden. Sinnvoller ist eine zentrale Exportentscheidung:

- keine aktive Fehlerliste: bestehenden Statistik-CSV ausgeben.
- aktive Fehlerliste: Item-CSV fuer das aktive fehlende Kriterium ausgeben.
- keine exportierbaren Daten: verstaendlichen Empty State bzw. Statushinweis setzen.

Die vorhandene CSV-Escaping-Logik und `downloadText()` koennen wiederverwendet werden.

## Vorschlag fuer die naechste sinnvolle Aenderung

Als naechster Schritt passt Abschnitt 2 aus dem Prompt: zentrales Datenmodell und State ergaenzen.

Empfohlener Umfang fuer Abschnitt 2:

- bestehenden `state` vorsichtig erweitern oder einen klar angebundenen `dashboardState` einfuehren.
- `normalizeItems(rawResponses)`, `normalizeItem(rawItem, context)`, `normalizeType()`, `normalizeString()` und `safeArray()` ergaenzen.
- noch keine Qualitaetskriterien und keinen Score berechnen.
- bestehende Statistikansicht weiter ueber `latestRows` funktionieren lassen.
- erste normalisierte Items nur dort erzeugen, wo bereits Item-Daten in JSON-Antworten vorhanden sind.

## Offene Punkte

- Das vom Auftrag genannte `docs/codex/zielbild-beschreibung.md` existiert im Repository nicht. Vorhanden ist `docs/Codex/Zielbild.md`, das als Zielbildbeschreibung verwendet wurde.
- Fuer vollstaendige Fehlerlisten muss spaeter geklaert werden, ob die Destination.One-Suche alle benoetigten Datensaetze paginiert liefern soll oder ob zunaechst mit vorhandenen API-Limits gearbeitet wird.
- Der Express-Proxy enthaelt einen dauerhaften `/api/search`-Diagnose-`console.log`. Fuer Abschnitt 13 sollte geprueft werden, ob diese Ausgabe im Produktivbetrieb gewuenscht ist.
