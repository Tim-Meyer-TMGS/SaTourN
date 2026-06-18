# Datenqualitätsmonitor – Aktueller Projektstand

Stand: 2026-06-18

## Kurzfassung

`Statistik/` ist ein statisches Frontend mit Vanilla JavaScript. Geschützte
oder modellgestützte Zugriffe laufen serverseitig über den Render-Proxy.
Secrets liegen nicht im Frontend.

Neu dokumentiert:

- die aktuelle Systemarchitektur
- das Zielbild für spätere Framework-Migration
- die Zieltrennung für Übergabe und Eigenhosting
- die konkrete Frontend-Zielstruktur mit Modulen, Stores und Services

Siehe:

- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`
- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

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
  der den direkten Tool-Call überlagert.
- Produktiv funktioniert der direkte OI-Toolpfad mit:
  `server:meta-open-data-sachsen-tourismus`

## UI-Stand

- Pflegeaufgaben mit `0` Treffern bleiben unsichtbar
- Open-Data-Status wird binär dargestellt
- Pflegeaufgaben springen wieder korrekt auf `records.html`
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
- ausgelagerte State-/Storage-Helfer:
  `Statistik/state-storage.js`
- ausgelagerte API-URL-Helfer:
  `Statistik/api-urls.js`
- ausgelagerte Frontend-Record-API-Helfer:
  `Statistik/record-api.js`
- ausgelagerte reine Records-Helfer:
  `Statistik/records-helpers.js`
- ausgelagerte Detail-Helfer:
  `Statistik/record-detail-helpers.js`
- ausgelagerte Frontend-Quality-API-Helfer:
  `Statistik/quality-api.js`
- ausgelagerte Übersichts-Helfer:
  `Statistik/overview-helpers.js`
- ausgelagerte Aufgaben- und Fehlertexte:
  `Statistik/task-texts.js`
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

- KI-Suche über OI-API erfolgreich live geschaltet
- Mailentwurf über OI-API erfolgreich live geschaltet
- temporärer OI-Diagnosecode wieder entfernt
- Pflegeaufgaben-Link zurück auf `records.html` korrigiert
- Dropdown-Design vereinheitlicht
- Codex-Dokumentation verkleinert und Analysematerial archiviert
- Systemarchitektur und Zielbild für Übergabe/Eigenhosting dokumentiert
- Frontend-Zielmodule, Stores und Komponenten für spätere Migration dokumentiert
- erster Storage-/View-State-Bereich aus `scripts.js` in `Statistik/state-storage.js` ausgelagert
- erster API-Builder-Bereich aus `scripts.js` in `Statistik/api-urls.js` ausgelagert
- erste Frontend-Record-/OI-Aufrufe aus `scripts.js` in `Statistik/record-api.js` ausgelagert
- erste reine Records-Helfer aus `scripts.js` in `Statistik/records-helpers.js` ausgelagert
- erste reine Detail-Helfer aus `scripts.js` in `Statistik/record-detail-helpers.js` ausgelagert
- erste Frontend-Quality-Request-Helfer aus `scripts.js` in `Statistik/quality-api.js` ausgelagert
- erste reine Übersichts-Helfer aus `scripts.js` in `Statistik/overview-helpers.js` ausgelagert
- erste Aufgaben-, Fehler- und Icontexte aus `scripts.js` in `Statistik/task-texts.js` ausgelagert
