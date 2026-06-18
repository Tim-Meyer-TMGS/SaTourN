# DatenqualitÃ¤tsmonitor â€“ Aktueller Projektstand

Stand: 2026-06-18

## Kurzfassung

`Statistik/` ist ein statisches Frontend mit Vanilla JavaScript. GeschÃ¼tzte
oder modellgestÃ¼tzte Zugriffe laufen serverseitig Ã¼ber den Render-Proxy.
Secrets liegen nicht im Frontend.

Neu dokumentiert:

- die aktuelle Systemarchitektur
- das Zielbild fÃ¼r spÃ¤tere Framework-Migration
- die Zieltrennung fÃ¼r Ãœbergabe und Eigenhosting
- die konkrete Frontend-Zielstruktur mit Modulen, Stores und Services

Siehe:

- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`
- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

## Aktive Seiten

- `Statistik/index.html`
  Ãœbersicht mit Arbeitskontext, KPIs, Pflegeaufgaben und Open-Data-Status
- `Statistik/tasks.html`
  Pflegeaufgaben mit Typwahl und Sprung in die Datensatzliste
- `Statistik/records.html`
  Datensatzliste mit Suche, KI-Suche, Filtern, CSV und Mailaktion
- `Statistik/record-detail.html`
  Detailansicht eines einzelnen Datensatzes
- `Statistik/stats.html`
  Open-Data-Statistik
- `Statistik/help.html`
  reduzierte Hilfeseite fÃ¼r Score, Datentypen und PflegeverstÃ¤ndnis

## Produktiver Betrieb

- GitHub Pages liefert das Frontend aus
- Render bleibt der produktive Node-/Express-Proxy
- aktuell keine Cronjobs, keine produktiven Snapshots, kein serverseitiger Cache
- ein kurzer Browser-In-Memory-Cache fÃ¼r wiederholte GET-Anfragen ist aktiv

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

- KI-Suche ist produktiv angebunden Ã¼ber `POST /api/oi/search-records`
- Mailentwurf ist produktiv angebunden Ã¼ber `POST /api/oi/mail-draft`
- die OI-Integration ist sauber von der Meta-/Search-Anbindung getrennt
- `OI_API_KEY`, `OI_MODEL_MAIL` und `OI_MODEL_SEARCH` laufen nur serverseitig

Wichtige Produktentscheidung:

- FÃ¼r die KI-Suche darf im OI-Suchmodell kein vorgeschalteter Skill aktiv sein,
  der den direkten Tool-Call Ã¼berlagert.
- Produktiv funktioniert der direkte OI-Toolpfad mit:
  `server:meta-open-data-sachsen-tourismus`

## UI-Stand

- Pflegeaufgaben mit `0` Treffern bleiben unsichtbar
- Open-Data-Status wird binÃ¤r dargestellt
- Pflegeaufgaben springen wieder korrekt auf `records.html`
- Dropdown-MenÃ¼s wurden global an das Ã¼brige Design angepasst
- Mailto-Links werden Outlook-tauglich als `%20`-kodierte URLs erzeugt

## Bewertungslogik

- Ganz Sachsen zeigt keinen berechneten QualitÃ¤tsscore
- Scoreberechnung lÃ¤uft nur fÃ¼r Gebiet oder Ort
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
- ausgelagerte State-/Storage-Helfer:
  `Statistik/core/state-storage.js`
- ausgelagerte API-URL-Helfer:
  `Statistik/core/api-urls.js`
- ausgelagerte Frontend-Record-API-Helfer:
  `Statistik/records/record-api.js`
- ausgelagerte reine Records-Helfer:
  `Statistik/records/records-helpers.js`
- ausgelagerte Records-Aktionen:
  `Statistik/records/records-actions.js`
- ausgelagerte Records-Datenadapter:
  `Statistik/records/records-data.js`
- ausgelagerte Records-Filter- und Listensteuerung:
  `Statistik/records/records-filters.js`
- ausgelagerte Records-Steuerung:
  `Statistik/records/records-controller.js`
- ausgelagerte Records-UI:
  `Statistik/records/records-ui.js`
- ausgelagerte Detail-Helfer:
  `Statistik/detail/record-detail-helpers.js`
- ausgelagerte Detail-UI:
  `Statistik/detail/record-detail-ui.js`
- ausgelagerte Frontend-Quality-API-Helfer:
  `Statistik/quality/quality-api.js`
- ausgelagerte Ãœbersichts-Helfer:
  `Statistik/overview/overview-helpers.js`
- ausgelagerte Ãœbersichts-UI:
  `Statistik/overview/overview-ui.js`
- ausgelagerte Aufgaben-UI:
  `Statistik/tasks/tasks-ui.js`
- ausgelagerte Aufgaben- und Fehlertexte:
  `Statistik/tasks/task-texts.js`
- Styling:
  `Statistik/style.css`
- Proxy:
  `routes/search.js`, `routes/quality.js`, `routes/records.js`, `routes/oi.js`
- OI-Konfiguration:
  `lib/oi-config.js`
- Architektur-Zielbild:
  `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`
- Frontend-Migrationsplan:
  `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

## Zuletzt umgesetzt

- KI-Suche Ã¼ber OI-API erfolgreich live geschaltet
- Mailentwurf Ã¼ber OI-API erfolgreich live geschaltet
- temporÃ¤rer OI-Diagnosecode wieder entfernt
- Pflegeaufgaben-Link zurÃ¼ck auf `records.html` korrigiert
- Dropdown-Design vereinheitlicht
- Codex-Dokumentation verkleinert und Analysematerial archiviert
- Systemarchitektur und Zielbild fÃ¼r Ãœbergabe/Eigenhosting dokumentiert
- Frontend-Zielmodule, Stores und Komponenten fÃ¼r spÃ¤tere Migration dokumentiert
- erster Storage-/View-State-Bereich aus `scripts.js` in `Statistik/core/state-storage.js` ausgelagert
- erster API-Builder-Bereich aus `scripts.js` in `Statistik/core/api-urls.js` ausgelagert
- erste Frontend-Record-/OI-Aufrufe aus `scripts.js` in `Statistik/records/record-api.js` ausgelagert
- erste reine Records-Helfer aus `scripts.js` in `Statistik/records/records-helpers.js` ausgelagert
- erste Records-Such-, KI- und Autocomplete-Aktionen aus `scripts.js` in `Statistik/records/records-actions.js` ausgelagert
- Record-Mailentwurf aus `scripts.js` in `Statistik/records/record-communication.js` zusammengeführt
- Record-Suchadapter, Datensatz-Normalisierung und Record-View-Model-Bau aus `scripts.js` in `Statistik/records/records-data.js` ausgelagert
- Record-Filter-, Paginations- und Listensteuerung aus `scripts.js` in `Statistik/records/records-filters.js` ausgelagert
- erste Records-Steuerung aus `scripts.js` in `Statistik/records/records-controller.js` ausgelagert
- erste Records-Renderer aus `scripts.js` in `Statistik/records/records-ui.js` ausgelagert
- erste Suchentscheidungslogik in `Statistik/records/records-search.js` gebÃ¼ndelt
- Mojibake in `Statistik/tasks/task-families.js` und `Statistik/tasks/task-logic.js` bereinigt
- erste reine Detail-Helfer aus `scripts.js` in `Statistik/detail/record-detail-helpers.js` ausgelagert
- erster Detail-Renderer aus `scripts.js` in `Statistik/detail/record-detail-ui.js` ausgelagert
- erste Frontend-Quality-Request-Helfer aus `scripts.js` in `Statistik/quality/quality-api.js` ausgelagert
- erste reine Ãœbersichts-Helfer aus `scripts.js` in `Statistik/overview/overview-helpers.js` ausgelagert
- erster Ãœbersichts-Renderer aus `scripts.js` in `Statistik/overview/overview-ui.js` ausgelagert
- erste Aufgaben-Renderer aus `scripts.js` in `Statistik/tasks/tasks-ui.js` ausgelagert
- erste Aufgaben-, Fehler- und Icontexte aus `scripts.js` in `Statistik/tasks/task-texts.js` ausgelagert
