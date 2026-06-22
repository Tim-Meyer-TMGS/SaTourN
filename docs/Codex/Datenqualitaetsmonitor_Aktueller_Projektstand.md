# Datenqualitätsmonitor – Aktueller Projektstand

Stand: 2026-06-22

## Kurzfassung

`Statistik/` bleibt aktuell das produktive Frontend mit Vanilla JavaScript.
Geschützte oder modellgestützte Zugriffe laufen serverseitig über den
Render-Proxy. Secrets liegen nicht im Frontend.

Parallel wurde jetzt ein neues Frontend-Grundgerüst unter `frontend/` angelegt.
Es dient als Migrationspfad für `React + Vite + TypeScript`, ohne den
laufenden Produktstand zu gefährden.

## Aktive Seiten im Bestandsfrontend

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

## Neues Frontend-Gerüst

Neu angelegt:

- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/app/`
- `frontend/src/features/`
- `frontend/src/shared/`
- `frontend/src/styles/`

Aktueller Stand des neuen Frontends:

- React-/Vite-/TypeScript-Basis steht
- Router steht
- Shell und Navigation stehen
- Arbeitskontext-Store steht
- Runtime-API-Konfiguration steht
- HTTP-Client-Basis steht
- Platzhalterseiten für alle aktuellen Fachbereiche stehen
- `Datensätze` hat bereits eine erste echte Pilotimplementierung mit:
  - Arbeitskontext-Steuerung
  - Suche gegen `/api/search`
  - KI-Suche gegen `/api/oi/search-records`
  - ID-Auflösung über `/api/records/by-global-ids`
  - clientseitiger Qualitätsauswertung auf Basis des bestehenden Qualitätsmodells
  - lokalen Filtern für Status, Kategorie und Problem
  - Paginierung im Frontend
  - Detailverlinkung im neuen Routing
  - Mailentwurf über `/api/oi/mail-draft`

Noch nicht umgesetzt:

- fachliche Migration der übrigen Produktseiten
- vollständige Übernahme der Detailseite in React
- UI-Feinschliff auf 1:1-Produktniveau des bestehenden Frontends
- Export, Schnellfilter und Autocomplete im neuen Frontend

## Produktiver Betrieb

- GitHub Pages liefert das bestehende Frontend aus
- Render bleibt der produktive Node-/Express-Proxy
- aktuell keine Cronjobs, keine produktiven Snapshots, kein serverseitiger Cache
- ein kurzer Browser-In-Memory-Cache für wiederholte GET-Anfragen ist aktiv

## Relevante API-Endpunkte

- `/api/search`
- `/api/autocomplete`
- `/api/quality/count`
- `/api/quality/scan`
- `/api/quality/list`
- `/api/quality/snapshot`
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
- KI-Suchergebnisse werden wieder gegen die Prüfkriterien ausgewertet

## Wichtige Dateien

### Bestandsfrontend

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/main.js`
- `Statistik/core/`
- `Statistik/overview/`
- `Statistik/tasks/`
- `Statistik/records/`
- `Statistik/detail/`
- `Statistik/stats/`
- `Statistik/help/`

### Neues Frontend

- `frontend/src/app/`
- `frontend/src/features/`
- `frontend/src/shared/`
- `frontend/src/styles/global.css`

### Proxy

- `routes/search.js`
- `routes/quality.js`
- `routes/records.js`
- `routes/oi.js`
- `lib/oi-config.js`

## Zuletzt umgesetzt

- React-/Vite-/TypeScript-Frontend als paralleles Grundgerüst angelegt
- Router, Shell, Runtime-Konfiguration und Context-Store vorbereitet
- `Datensätze` als erste Pilotseite im neuen Frontend mit Suche, KI-Suche, Filtern, Paging und Mailentwurf erweitert
- KI-Suche auf korrekten Qualitätsdurchlauf nach Typauflösung nachgezogen
- OI-Timeouts für Suche und Mailentwurf erhöht

## Technische Richtung

- `scripts.js` bleibt vorerst Orchestrator des Bestandsfrontends
- neue Fachlogik soll nicht mehr direkt in `scripts.js` landen
- das neue `frontend/` ist der Migrationspfad
- der nächste echte Umsetzungsschritt ist die fachliche Migration der Seite
  `Datensätze`
