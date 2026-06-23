# Datenqualitätsmonitor - Aktueller Projektstand

Stand: 2026-06-23

## Kurzfassung

`Statistik/` bleibt aktuell das produktive Frontend mit Vanilla JavaScript.
Geschützte oder modellgestützte Zugriffe laufen serverseitig über den
Render-Proxy. Secrets liegen nicht im Frontend.

Parallel existiert ein neues Frontend unter `frontend/`. Es dient als
Migrationspfad für `React + Vite + TypeScript`, ohne den laufenden Produktstand
zu gefährden. Die GitHub-Pages-Preview läuft getrennt unter:

```text
https://tim-meyer-tmgs.github.io/SaTourN/frontend-preview/
```

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

## Neues Frontend

Aktueller Stand:

- React-/Vite-/TypeScript-Basis steht
- Router steht
- GitHub-Pages-Preview ist eingerichtet
- Shell und Navigation sind an das bestehende Live-Design angenähert
- SaTourN-Logo, Arbeitskontext-Leiste, Sidebar, Kartenstil und Tabellenstil sind im Preview-CSS abgebildet
- Arbeitskontext-Store steht
- zentraler Arbeitskontext-Dialog steht im React-Shell-Pfad
- Runtime-API-Konfiguration steht
- HTTP-Client-Basis steht
- gemeinsame Feldnormalisierung für Datensatzliste und Detailseite steht unter `frontend/src/shared/records/record-fields.ts`
- Platzhalterseiten für alle aktuellen Fachbereiche stehen
- `Datensätze` ist die erste fachliche Pilotseite

Die Records-Pilotseite kann aktuell:

- Suche gegen `/api/search`
- KI-Suche gegen `/api/oi/search-records`
- ID-Auflösung über `/api/records/by-global-ids`
- clientseitige Qualitätsauswertung auf Basis des bestehenden Qualitätsmodells
- lokale Filter für Kategorie und Problem
- Schnellfilter für Lizenz, Beschreibung, Bilder und Öffnungszeiten
- Paginierung im Frontend
- CSV-Export der aktuell gefilterten Treffer
- Detailverlinkung im neuen Routing
- Mailentwurf über `/api/oi/mail-draft`
- vollständiges Zurücksetzen des AI-Search-Modus über `Filter zurücksetzen`

Die neue React-Detailseite kann aktuell:

- Datensatz per `id` oder `global_id` über `/api/records/by-global-ids` laden
- Qualitätsstatus und Score mit dem bestehenden Qualitätsmodell auswerten
- wichtigste Pflegepunkte, Nutzbarkeit, Kategorien/Gebiet und Detail-Informationen im 3-Spalten-Layout anzeigen
- Live-nahe Aktionszeile mit Zurücklink, Vorher/Nächster, et4-Link und Aktionen-Menü anzeigen
- Vorher/Nächster-Navigation aus dem letzten Records-Listenstand anbieten
- ID, `global_id` und aktuellen Detail-Link kopieren
- Beschreibung, Medien, Öffnungszeiten, ÖPNV-Anreise und Preisinfo anzeigen
- die gesamte Qualitätsbewertung nach automatisch bewerteten, vorbereiteten, manuellen und ausgenommenen Kriterien darstellen
- Kontext-Hinweis anzeigen, wenn die Detailseite aus einer Pflegeaufgabe geöffnet wird

Noch nicht umgesetzt:

- vollständiger visueller Feinschliff der React-Detailseite gegen echte Beispiel-Datensätze
- Autocomplete im neuen Frontend
- Feinschliff am Arbeitskontext-Dialog auf vollständiges Live-Niveau
- fachliche Migration der übrigen Produktseiten

## Produktiver Betrieb

- GitHub Pages liefert das bestehende Frontend aus
- Render bleibt der produktive Node-/Express-Proxy
- aktuell keine Cronjobs, keine produktiven Snapshots, kein serverseitiger Cache
- ein kurzer Browser-In-Memory-Cache für wiederholte GET-Anfragen ist aktiv
- die Framework-Preview ersetzt keine produktive URL

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

## Bewertungslogik

- Ganz Sachsen zeigt keinen berechneten Qualitätsscore
- Scoreberechnung läuft nur für Gebiet oder Ort
- `source_guarded`, `not_applicable` und `excluded_by_category`
  sind nicht scorewirksam
- generische Wildcard-Pushdowns bleiben fachlich ausgeschlossen
- erste produktive POI-Ausschlusslogik ist zentral verankert
- KI-Suchergebnisse werden gegen die Prüfkriterien ausgewertet

## Zuletzt umgesetzt

- GitHub-Pages-Preview für das neue Frontend eingerichtet
- Frontend-Build in den Pages-Workflow integriert, ohne `Statistik/` umzuschalten
- Records-Pilotseite grafisch näher an das Live-Design gebracht
- React-Shell auf Live-nahe Header-, Sidebar-, Logo- und Tabellenstruktur umgestellt
- Schnellfilter, CSV-Export und AI-Search-Reset in der Records-Pilotseite ergänzt
- Arbeitskontext-Dialog in die React-Shell verlagert und Inline-Gebiets-/Ortfilter aus der Records-Seite entfernt
- React-Detailseite um Aktionszeile, Beschreibung, Medien, Öffnungszeiten, ÖPNV-Anreise und Preisinfo erweitert
- Records-Pilot speichert den letzten Listenstand für die Detailnavigation
- React-Detailseite um Vorher/Nächster-Navigation und Kopieraktionen erweitert
- Feldzugriffe aus Records- und Detailseite in ein gemeinsames Shared-Modul verschoben
- aktive Preview-Dateien auf saubere Umlaute geprüft

## Technische Richtung

- `scripts.js` bleibt vorerst Orchestrator des Bestandsfrontends
- neue Fachlogik soll nicht mehr direkt in `scripts.js` landen
- das neue `frontend/` ist der Migrationspfad
- wiederverwendbare Feldnormalisierung liegt im neuen Frontend unter `shared/records`
- Umschaltung erfolgt später seitenweise und nur nach visueller und fachlicher Abnahme
