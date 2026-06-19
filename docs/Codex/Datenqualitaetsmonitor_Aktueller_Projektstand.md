# Datenqualitätsmonitor – Aktueller Projektstand

Stand: 2026-06-19

## Kurzfassung

`Statistik/` bleibt aktuell ein statisches Frontend mit Vanilla JavaScript.
Geschützte oder modellgestützte Zugriffe laufen serverseitig über den
Render-Proxy. Secrets liegen nicht im Frontend.

Parallel läuft die fachliche und technische Entkopplung des Bestands, damit das
Projekt sauber an Entwickler übergeben und später auf ein Framework migriert
werden kann.

## Aktive Seiten

- `Statistik/index.html`
  Übersicht mit Arbeitskontext, KPIs, Pflegeaufgaben und Open-Data-Status
- `Statistik/tasks.html`
  Pflegeaufgaben mit Typwahl und Sprung in die Datensatzliste
- `Statistik/records.html`
  Datensatzliste mit Suche, KI-Suche, Filtern, CSV und Mailaktion
- `Statistik/record-detail.html`
  Detailansicht eines einzelnen Datensatzes
- `Statistik/stats.html`
  Open-Data-Statistik
- `Statistik/help.html`
  reduzierte Hilfeseite für Score, Datentypen und Pflegeverständnis

## Produktiver Betrieb

- GitHub Pages liefert das Frontend aus
- Render bleibt der produktive Node-/Express-Proxy
- aktuell keine Cronjobs, keine produktiven Snapshots, kein serverseitiger Cache
- ein kurzer Browser-In-Memory-Cache für wiederholte GET-Anfragen ist aktiv

## Relevante API-Endpunkte

- `/api/search`
- `/api/autocomplete`
- `/api/quality/count`
- `/api/quality/scan`
- `/api/records/by-global-ids`
- `/api/oi/status`
- `/api/oi/tools`
- `/api/oi/search-records`
- `/api/oi/mail-draft`

## one.intelligence-Stand

- KI-Suche ist produktiv angebunden über `POST /api/oi/search-records`
- Mailentwurf ist produktiv angebunden über `POST /api/oi/mail-draft`
- die OI-Integration ist sauber von der Meta-/Search-Anbindung getrennt
- `OI_API_KEY`, `OI_MODEL_MAIL` und `OI_MODEL_SEARCH` laufen nur serverseitig

Wichtige Produktentscheidung:

- Für die KI-Suche darf im OI-Suchmodell kein vorgeschalteter Skill aktiv sein,
  der den direkten Tool-Call überlagert
- produktiv funktioniert der direkte OI-Toolpfad mit
  `server:meta-open-data-sachsen-tourismus`

## UI-Stand

- Pflegeaufgaben mit `0` Treffern bleiben unsichtbar
- Open-Data-Status wird binär dargestellt
- Pflegeaufgaben springen korrekt auf `records.html`
- Dropdown-Menüs wurden global an das übrige Design angepasst
- Mailto-Links werden Outlook-tauglich als `%20`-kodierte URLs erzeugt

## Bewertungslogik

- Ganz Sachsen zeigt keinen berechneten Qualitätsscore
- Scoreberechnung läuft nur für Gebiet oder Ort
- `source_guarded`, `not_applicable` und `excluded_by_category`
  sind nicht scorewirksam
- generische Wildcard-Pushdowns bleiben fachlich ausgeschlossen
- erste produktive POI-Ausschlusslogik ist zentral verankert

## Wichtige Dateien

- Frontend:
  `Statistik/index.html`, `tasks.html`, `records.html`,
  `record-detail.html`, `stats.html`, `help.html`
- Frontend-Logik:
  `Statistik/scripts.js`, `Statistik/quality.js`, `Statistik/main.js`
- Core:
  `Statistik/core/api-config.js`,
  `Statistik/core/api-urls.js`,
  `Statistik/core/app-constants.js`,
  `Statistik/core/app-state.js`,
  `Statistik/core/consent-ui.js`,
  `Statistik/core/context-shell-controller.js`,
  `Statistik/core/page-bootstrap.js`,
  `Statistik/core/page-initializers.js`,
  `Statistik/core/page-shell.js`,
  `Statistik/core/request-cache.js`,
  `Statistik/core/runtime-helpers.js`,
  `Statistik/core/source-systems.js`,
  `Statistik/core/source-systems-bindings.js`,
  `Statistik/core/source-systems-page-bindings.js`,
  `Statistik/core/source-systems-ui.js`,
  `Statistik/core/state-storage.js`
- Übersicht:
  `Statistik/overview/overview-controller.js`,
  `Statistik/overview/overview-data.js`,
  `Statistik/overview/overview-helpers.js`,
  `Statistik/overview/overview-page-bindings.js`,
  `Statistik/overview/overview-ui.js`
- Aufgaben:
  `Statistik/tasks/task-controller.js`,
  `Statistik/tasks/task-data.js`,
  `Statistik/tasks/task-families.js`,
  `Statistik/tasks/task-logic.js`,
  `Statistik/tasks/task-page-bindings.js`,
  `Statistik/tasks/task-record-links.js`,
  `Statistik/tasks/task-texts.js`,
  `Statistik/tasks/tasks-ui.js`
- Records:
  `Statistik/records/record-api.js`,
  `Statistik/records/record-communication.js`,
  `Statistik/records/records-actions.js`,
  `Statistik/records/records-controller.js`,
  `Statistik/records/records-page-bindings.js`,
  `Statistik/records/records-page-controller.js`,
  `Statistik/records/records-page-data.js`,
  `Statistik/records/records-page-interactions.js`,
  `Statistik/records/records-page-queries.js`,
  `Statistik/records/records-page-search-bindings.js`,
  `Statistik/records/records-page-state.js`,
  `Statistik/records/records-page-view.js`,
  `Statistik/records/records-data.js`,
  `Statistik/records/records-filters.js`,
  `Statistik/records/records-helpers.js`,
  `Statistik/records/records-search.js`,
  `Statistik/records/records-ui.js`
- Detail:
  `Statistik/detail/record-detail-bindings.js`,
  `Statistik/detail/record-detail-page-bindings.js`,
  `Statistik/detail/record-detail-controller.js`,
  `Statistik/detail/record-detail-data.js`,
  `Statistik/detail/record-detail-helpers.js`,
  `Statistik/detail/record-detail-ui.js`
- Help:
  `Statistik/help/help-page.js`
- Statistik:
  `Statistik/stats/stats-page.js`
- Quality:
  `Statistik/quality/quality-api.js`
- Proxy:
  `routes/search.js`, `routes/quality.js`, `routes/records.js`, `routes/oi.js`
- OI-Konfiguration:
  `lib/oi-config.js`

## Zuletzt umgesetzt

- gemeinsame Shell-Initialisierung und Seitenstart-Verdrahtung aus
  `scripts.js` in `Statistik/core/page-bootstrap.js` weiter reduziert
- Seiteninitialisierung für Overview, Tasks, Records, Detail, Statistik und
  Hilfe aus `scripts.js` in `Statistik/core/page-initializers.js`
  weiter reduziert
- Arbeitskontext-, View-State- und Shell-Submit-Verdrahtung aus `scripts.js`
  in `Statistik/core/context-shell-controller.js` weiter reduziert
- Statistik-Filter-, Render- und Exportlogik aus `scripts.js` in
  `Statistik/stats/stats-page.js` ausgelagert
- Overview-Bindings aus `scripts.js` in
  `Statistik/overview/overview-page-bindings.js` weiter reduziert
- Records-View-/UI-Bindings aus `scripts.js` in
  `Statistik/records/records-page-bindings.js` weiter reduziert
- Records-Such-/Autocomplete-/Mail-Bindings aus `scripts.js` in
  `Statistik/records/records-page-search-bindings.js` weiter reduziert
- Task-UI-/Paging-/Detail-Bindings aus `scripts.js` in
  `Statistik/tasks/task-page-bindings.js` weiter reduziert
- Detail-Hilfs-/View-Bindings aus `scripts.js` in
  `Statistik/detail/record-detail-page-bindings.js` weiter reduziert
- Quellsystem-/Export-Bindings aus `scripts.js` in
  `Statistik/core/source-systems-page-bindings.js` weiter reduziert
- `Statistik/README.md` auf die aktuelle Modulstruktur nachgezogen

## Technische Richtung

- `scripts.js` ist weiterhin der Orchestrator
- neue Fachlogik soll nicht mehr direkt in `scripts.js` landen
- die nächste Stufe ist das Entfernen toter Wrapper und doppelter Delegationen
- danach kann die eigentliche Framework-Migration auf sauber getrennten Modulen
  aufsetzen
