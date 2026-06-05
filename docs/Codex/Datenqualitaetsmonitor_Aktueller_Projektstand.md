# Datenqualitaets-Monitor - Aktueller Projektstand

Stand: 2026-06-04

Diese Datei ist die kompakte Kontextkarte fuer neue Arbeit an
`Statistik/`. Das Dashboard ist ein statisches GitHub-Pages-Frontend mit
Vanilla-JS-UI und Node/Express-Proxy fuer Destination.One/eT4-Requests. Keine
neue Build-Kette, keine Secrets im Frontend.

## Aktueller Stand

- Statistik-Dashboard wurde zum Datenqualitaets-Monitor erweitert.
- Arbeitsbereiche: Ueberblick, Statistik, Datenqualitaet, Fehlerlisten,
  Datentypen, Kriterien, Ergebnisse, KI-Analyse.
- Diese acht Arbeitsbereiche sind ein funktionaler Zwischenstand. Das neue
  Produktziel aus dem Arbeitsauftrag ist eine ruhigere Struktur mit wenigen
  Hauptbereichen und perspektivisch mehreren statischen HTML-Seiten.
- Bestehende Statistik-KPIs, Charts, Ergebnisliste und Statistik-CSV bleiben
  auf Aggregatzeilen/`overallcount` basiert.
- Qualitaets-KPIs, Problemcluster, Matrix, Datentypen, Fehlerlisten, Detailpanel,
  KI-Kontext und Fehlerlisten-CSV basieren auf normalisierten Items.
- Browser sammelt nur begrenzte Item-Samples; vollstaendige Fehlerlisten koennen
  bei eindeutigem Typ und Kriterium ueber `/api/quality/scan` nachgeladen werden.
- POI-ET4-Pages-Link ist verifiziert:
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`.
  Andere Typen duerfen erst nach Verifikation automatisch verlinkt werden.
- KI-Analyse laeuft ueber n8n-Webhook-Konfiguration; one.intelligence-Keys
  gehoeren nicht ins Frontend.

## Relevante Dateien

- Frontend: `Statistik/index.html`, `Statistik/scripts.js`,
  `Statistik/style.css`, `Statistik/quality.js`.
- Proxy: `index.js`, `routes/search.js`, `routes/quality.js`,
  `lib/search-utils.js`.
- Diagnose: `scripts/diagnose-quality-examples.mjs` mit Fixtures unter
  `testdata/quality-examples/`.

## Zentrale Datenmodelle

- `dashboardState` in `Statistik/scripts.js`, sichtbar als
  `window.satournDashboardState`.
- Wichtige Listen: `latestRows`, `rawItemResponses`, `allItems`,
  `normalizedItems`, `filteredItems`.
- Wichtige Steuerfelder: `activeFilters`, `activeIssue`, `activeIssueType`,
  `activePanel`, `qualityDataMeta`, `serverIssueList`, `activeDetailItem`,
  `aiChat`.
- `Statistik/quality.js` exportiert `qualityCriteria`, Helper,
  Einzelbewertung, Aggregationen und `getQualityScanConfig()`.
- `qualityScore` und `qualityStatus` sind Orientierung fuer Datenpflege. Die
  weitere UI soll zusaetzlich fachliche Nutzbarkeit erklaeren, nicht Score als
  absolute Wahrheit behandeln.
- Gebiet, Ort und Typ sind aktuell technisch als Filter umgesetzt, werden fuer
  die weitere Arbeit aber als fachlicher Arbeitskontext der Datenpflege
  behandelt.
- UI-Ziel fuer die naechste Arbeit: weniger sichtbare Hauptnavigation, weniger
  Filterdichte im ersten Sichtbereich, Spezialfunktionen kontextuell statt als
  gleichwertige Hauptbereiche.
- UI-Verschlankung startet bei Fehlerlisten, Statusmeldungen und Loadern. Die
  aktuelle Fehlerliste ist noch zu breit und technisch; Detailpanel und CSV
  duerfen die Tiefe behalten.

## Aktive Kriterien

- `opening_hours_missing`: POI, Gastro; API-Pushdown verifiziert.
- `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown verifiziert.
- `description_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_author_missing`: alle Typen mit pruefbaren Medien; Server-Scan
  verifiziert, API-Pushdown nicht verifiziert.
- `public_transport_missing`: POI, Gastro, Tour, Hotel, Event; API-Pushdown
  verifiziert.
- `booking_link_missing`: Hotel per API-Pushdown verifiziert, Package per
  Server-Scan verifiziert; API-Pushdown fuer Package nicht verifiziert.

Nicht aktiv als automatischer Fehler: `geo_missing`, `touristtrip_incomplete`,
`manual_image_quality`.

## Datenfluss

1. Nutzer setzt Filter; `currentFilters()` synchronisiert `activeFilters`.
2. Statistik-Requests liefern Counts und begrenzte Item-Samples.
3. `refreshNormalizedItems()` normalisiert und bewertet Items.
4. `refreshFilteredItems()` baut Basislisten und `qualityAggregations`.
5. `renderAll()` rendert Statistik- und Qualitaetsbereiche.
6. Klick auf Pflegebedarf, Datentyp oder Matrixzeile setzt `activeIssue` und
   oeffnet den Arbeitsbereich `issues`.
7. Bei eindeutigem Typ/Kriterium nutzt die Fehlerliste `/api/quality/scan`;
   sonst bleibt die Browser-Stichprobe aktiv.
8. CSV exportiert entweder Statistik-Aggregate oder die aktive Fehlerliste.
9. Detailpanel und KI-Kontext nutzen reduzierte, gefilterte Daten.

## Zielseitenlogik

- Uebersicht: ruhige Lage im Arbeitskontext, kompakte Qualitaetslage,
  wichtigste Pflegeaufgaben, dezente Open-Data-Kennzahl, keine langen Listen,
  Rohdaten, Matrix oder Voll-Scans.
- Pflegeaufgaben: primaerer Arbeitsbereich; Aufgaben fachlich benennen und
  klickbar zu konkreten Fehlerlisten bzw. Datensatzlisten fuehren.
- Datensaetze: schlanke Arbeitsliste auf Datensatzebene; Details, IDs, Links,
  Rohdaten und vollstaendige Kriterienbewertung bleiben im Detailpanel.
- Statistik: aggregierte `overallcount`-basierte Zahlen, Vergleiche, Charts und
  Statistik-CSV; keine Datensatzdetails und keine unnoetigen Qualitaets-Scans.

## Naechste Umsetzungsreihenfolge

1. UI auditieren: Tabellen, Statusmeldungen, Loader, Panels, Navigation.
2. Fehlerlisten verschlanken: UI-Spalten auf Arbeitsentscheidung reduzieren.
3. Technische Statusmeldungen aus UI in Console verschieben.
4. Ladezustaende komponentennah integrieren.
5. Arbeitskontext mit Gebiet, Ort und Datentyp vorbereiten.
6. Hauptnavigation auf Uebersicht, Pflegeaufgaben, Datensaetze, Statistik
   ausrichten.

## Tests

- Standard: `git diff --check`.
- Wenn Node verfuegbar ist: `npm run check` und
  `npm run diagnose:quality-examples`.
- Falls Node fehlt, JSON-Fixtures mit PowerShell parsebar pruefen und Node-Checks
  als nicht ausgefuehrt dokumentieren.

## Abschnittsarbeit

- Punkt 1 `Technischer Rahmen` aus
  `docs/Datenqualitaetsmonitor_Codex_Arbeitsauftrag.md` ist in
  `docs/Codex/Datenqualitaetsmonitor_Arbeitsstand.md` konsolidiert.
- Punkt 2 `Produktziel` ist dort ebenfalls konsolidiert: Mehrseitenziel,
  API-Schonung und Reduktion weiterer Panel-Komplexitaet.
- Punkt 3 `Zentrale Produktperspektive` ist konsolidiert: Fokus auf
  Datenpfleger, Arbeitskontext und konkrete Pflegeaufgaben statt abstrakter
  Gesamtstatistik.
- Punkt 4 `UI-Grundprinzip` ist konsolidiert: UI ruhiger fuehren,
  Progressive Disclosure nutzen und technische Details aus der Startansicht
  herausnehmen.
- Punkt 5 `Navigation und Mehrseitenstruktur` ist konsolidiert: Zielnavigation
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik; `activePanel` bleibt nur
  Uebergang.
- Punkt 6 `Arbeitskontext statt Einstellungsflut` ist konsolidiert: Gebiet,
  Ort und Datentyp bilden den kleinen lokalen Arbeitskontext; weitere Filter
  bleiben ansichtsspezifisch.
- Punkt 7 `API-schonende Grundregeln` ist konsolidiert: keine impliziten
  Vollabfragen, grosse Fehlerlisten nur nach konkretem Nutzerklick,
  Stichproben transparent kennzeichnen.
- Punkt 8 `Datenfluss beibehalten und sinnvoll modularisieren` ist
  konsolidiert: bestehender Filter-/Sample-/Normalisierungs-/Renderfluss bleibt
  fachlich richtig und wird nur an klaren Grenzen modularisiert.
- Punkt 9 `Seitenlogik` ist konsolidiert: vier Zielbereiche mit klar getrennten
  Aufgaben und Datenquellen.
- Punkt 10 `Nutzbarkeit statt nur Vollstaendigkeit` ist konsolidiert:
  Pflegehinweise sollen praktische Wirkung erklaeren, nicht nur fehlende Felder
  melden.
- Punkt 11 `Qualitaetslogik` ist konsolidiert: aktive Kriterien und
  Score-Schwellen bleiben wie in `Statistik/quality.js`; Geo, TouristTrip und
  manuelle Bildqualitaet werden nicht automatisch aktiviert.
- Punkt 12 `Reale Feldmappings` ist konsolidiert: bestehende Feldchecks bleiben
  verbindlich; neue Annahmen brauchen dokumentierte Pruefung.
- Punkte 13 bis 25 sind konsolidiert: Tabellen werden Entscheidungshilfen,
  Detailpanel entlastet Listen, Aktionen ersetzen technische Spalten,
  Statusmeldungen und Loader werden ruhiger, KI bleibt dezent, CSV bleibt
  ansichtsspezifisch und Migration erfolgt schrittweise.
- Der erste Mockup-Umbau aus `docs/Codex/Umbau_Statistik` ist gestartet:
  `Startseite.png`/`Startseite.md` wurden in `Statistik/index.html`,
  `Statistik/scripts.js`, `Statistik/style.css` und die vorbereiteten
  Zielseiten `tasks.html`, `records.html`, `stats.html` uebernommen.
- Der zweite Mockup-Umbau ist umgesetzt:
  `Pflegeaufgaben.png` und
  `Datenqualitaetsmonitor_Pflegeaufgaben_Seite.md` wurden in eine echte
  Pflegeaufgaben-Seite mit Sample-Aggregationen, Detailkarte,
  Scan-on-demand-Datensatzliste und kontextuellem CSV-Export uebernommen.
- Der dritte Mockup-Umbau ist umgesetzt:
  `Datensatz-Haupseite.png` und
  `Datenqualitaetsmonitor_Datensaetze_Hauptseiteg.md` wurden in die
  eigenstaendige Datensaetze-Hauptseite mit Suche, Filtern, Schnellfiltern,
  schlanker Tabelle, Pagination und CSV-Export uebernommen. Die Detailseite
  bleibt separat.
- Der vierte Mockup-Umbau ist umgesetzt:
  `Detailansicht datensatz.png` und
  `Datenqualitaetsmonitor_Datensatz_Detailseite.md` wurden in
  `Statistik/record-detail.html` uebernommen. Die Seite laedt einzelne
  Datensaetze gezielt, bewertet sie mit `quality.js` und zeigt keine
  vollstaendige Rohdatenansicht.
- Offene Punkte aus der Abschnittsarbeit stehen in
  `docs/Codex/Datenqualitaetsmonitor_Offene_TODOs.md`.
