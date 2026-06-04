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

## Aktive Kriterien

- `opening_hours_missing`: POI, Gastro; API-Pushdown verifiziert.
- `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown verifiziert.
- `description_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_author_missing`: alle Typen mit pruefbaren Medien; Server-Scan.
- `public_transport_missing`: POI, Gastro, Tour, Hotel, Event; API-Pushdown
  verifiziert.
- `booking_link_missing`: Hotel per API-Pushdown verifiziert, Package offen und
  serverseitig zu pruefen.

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

## Tests

- Standard: `git diff --check`.
- Wenn Node verfuegbar ist: `npm run check` und
  `npm run diagnose:quality-examples`.
- Falls Node fehlt, JSON-Fixtures mit PowerShell parsebar pruefen und Node-Checks
  als nicht ausgefuehrt dokumentieren.
