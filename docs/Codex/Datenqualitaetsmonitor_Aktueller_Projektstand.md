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

Unterseiten der Preview nutzen Hash-Routing, zum Beispiel:

```text
https://tim-meyer-tmgs.github.io/SaTourN/frontend-preview/#/tasks
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
- GitHub-Pages-Preview nutzt Hash-Routing und statische Redirects für bekannte Unterseiten
- Shell und Navigation sind an das bestehende Live-Design angenähert
- SaTourN-Logo, Arbeitskontext-Leiste, Sidebar, Kartenstil und Tabellenstil sind im Preview-CSS abgebildet
- Light-/Dark-Mode ist in der React-Shell umschaltbar und wird lokal gespeichert
- Arbeitskontext-Store steht
- zentraler Arbeitskontext-Dialog steht im React-Shell-Pfad
- Runtime-API-Konfiguration steht
- HTTP-Client-Basis steht
- gemeinsame Feldnormalisierung für Datensatzliste und Detailseite steht unter `frontend/src/shared/records/record-fields.ts`
- gemeinsame Bewertungsbasis für Datensatzliste und Detailseite steht über `buildQualityEvaluationInput`
- `Übersicht`, `Pflegeaufgaben`, `Datensätze`, `Datensatz-Detail` und `Open-Data-Statistik` sind fachliche Pilotseiten
- `Hilfe` ist als fachliche Pilotseite mit Score-Erklärung, drei Fehler-Ebenen und Mindestanforderungen je Datentyp umgesetzt

Die Overview-Pilotseite kann aktuell:

- Statistik-Counts pro Datentyp über den bestehenden Search-Proxy laden
- Open-Data-Quote aus Gesamt- und Open-Data-Counts berechnen
- wichtigste Pflegeaufgaben über verifizierte Qualitäts-Count-Endpunkte laden
- Pflegeaufgaben in die React-Datensatzliste mit `criterionId` und Datentyp übergeben
- bei ganz Sachsen bewusst keinen Qualitäts-Score anzeigen
- bei konkretem Gebiet oder Ort eine deduplizierte Qualitätszusammenfassung über `/api/quality/summary` laden
- `Mit Pflegebedarf`, gute Datensätze und kritische Datensätze aus der echten Datensatzbewertung berechnen, nicht aus aufsummierten Pflegeaufgaben-Counts
- Schnellzugriffe auf die migrierten und vorbereiteten Bereiche darstellen

Die Records-Pilotseite kann aktuell:

- Suche gegen `/api/search`
- KI-Suche gegen `/api/oi/search-records`
- ID-Auflösung über `/api/records/by-global-ids`
- Pflegeaufgabenlisten aus `/api/quality/scan` laden, wenn `criterionId` und `type` in der URL gesetzt sind
- clientseitige Qualitätsauswertung auf Basis des bestehenden Qualitätsmodells
- lokale Filter für Kategorie und Problem
- Schnellfilter für Lizenz, Beschreibung, Bilder und Öffnungszeiten
- Paginierung im Frontend
- CSV-Export der aktuell gefilterten Treffer
- Detailverlinkung im neuen Routing
- Mailentwurf über `/api/oi/mail-draft`
- vollständiges Zurücksetzen des AI-Search-Modus über `Filter zurücksetzen`
- den aktuell gefilterten Listenstand für die Detailnavigation speichern

Die Pflegeaufgaben-Pilotseite kann aktuell:

- Pflegeaufgaben aus denselben Qualitätsdaten wie die Übersicht laden
- fachlich verwandte Kriterien wie Zahlungsarten, Sprachen und Parkhinweise gruppieren
- Aufgaben nach Suche, Priorität, Datentyp und Auswirkung filtern
- Kennzahlen zu offenen Aufgaben, hoher Priorität, betroffenen Treffern, Open-Data-Relevanz und Potenzial anzeigen
- eine Detailspalte mit Problem, Auswirkung, nächstem Schritt und betroffenen Datentypen anzeigen
- aus Aufgaben direkt in die React-Datensatzliste springen und dabei einzelne oder mehrere betroffene Typen übergeben

Die neue React-Detailseite kann aktuell:

- Datensatz per `id` oder `global_id` über `/api/records/by-global-ids` laden
- Qualitätsstatus und Score mit dem bestehenden Qualitätsmodell auswerten
- wichtigste Pflegepunkte, Nutzbarkeit, Kategorien/Gebiet und Detail-Informationen im 3-Spalten-Layout anzeigen
- Live-nahe Aktionszeile mit Zurücklink, Vorher/Nächster, et4-Link und Aktionen-Menü anzeigen
- Vorher/Nächster-Navigation aus dem letzten Records-Listenstand anbieten
- Pflegeaufgaben-Kontext aus der gefilterten Records-Liste übernehmen
- ID, `global_id` und aktuellen Detail-Link kopieren
- Beschreibung, Medien, Öffnungszeiten, ÖPNV-Anreise und Preisinfo anzeigen
- die gesamte Qualitätsbewertung nach automatisch bewerteten, vorbereiteten, manuellen und ausgenommenen Kriterien darstellen
- Kontext-Hinweis anzeigen, wenn die Detailseite aus einer Pflegeaufgabe geöffnet wird
- Pflegesystem mit Logo darstellen, sofern ein Logo im Bestandsfrontend vorhanden ist
- Quelle, Lizenz-URL, Koordinaten, externe IDs, Kontakt-/Adressrollen und technischen Auszug anzeigen, wenn diese Daten im Datensatz vorhanden sind

Die Open-Data-Statistik-Pilotseite kann aktuell:

- Gesamtbestand, Open-Data-fähige Datensätze, Open-Data-Quote und nicht Open-Data-fähige Datensätze aus denselben Statistik-Counts wie die Übersicht laden
- die Verteilung nach Datentyp als Donut und Tabelle darstellen
- die Open-Data-Quote je Datentyp als Balkendiagramm anzeigen
- den bestehenden Arbeitskontext aus der React-Shell übernehmen, ohne eigene doppelte Filterleiste
- bei nicht Open-Data-fähigen Datensätzen direkt zur Lizenz-Pflegeaufgabe in der Datensatzliste springen

Die Hilfe-Pilotseite kann aktuell:

- den Score nutzerverständlich erklären
- die drei Ebenen `Kritische Fehler`, `Fehler` und `Leichte Optimierungen` darstellen
- je Datentyp Mindestanforderungen und sinnvolle Optimierungen aus dem bestehenden Qualitätsmodell ableiten
- fachlich vorbereitete, aber noch nicht automatisch bewertete Kriterien getrennt erklären
- technische Prüfbegriffe aus der Nutzerkommunikation heraushalten

Noch nicht umgesetzt:

- vollständiger visueller Feinschliff der React-Detailseite gegen echte Beispiel-Datensätze
- Autocomplete im neuen Frontend
- Feinschliff am Arbeitskontext-Dialog auf vollständiges Live-Niveau
- weiterer fachlicher Abgleich der migrierten Produktseiten gegen echte Beispieldaten

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
- `/api/quality/summary`
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
- `/api/quality/summary` bewertet konkrete Arbeitskontexte serverseitig und dedupliziert Datensätze vor der Aggregation

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
- React-Detailseite um Pflegesystem-Logo, externe IDs, Kontakt-/Adressrollen, Quelle, Lizenz-URL, Koordinaten und technischen Auszug erweitert
- React-Detailseite in Controller, Mapping, Typen und UI-Komponenten getrennt
- React-Übersicht nutzt für Gebiet/Ort eine deduplizierte Qualitätszusammenfassung statt aufsummierter Fehlercounts
- React-Pflegeaufgaben-Seite mit gruppierten Aufgaben, Filtern, Detailspalte und Records-Verlinkung migriert
- React-Open-Data-Statistik mit KPI-Karten, Datentypverteilung, Quote-Balken und Lizenz-Pflegehinweis migriert
- React-Hilfeseite mit Score-Verständnis, Fehler-Ebenen und Datentyp-Anforderungen migriert
- React-Preview um persistenten Dark Mode ergänzt
- React-Datensatzliste und React-Detailseite nutzen dieselbe Bewertungsbasis für Score und Kriterien
- aktive Preview-Dateien auf saubere Umlaute geprüft

## Technische Richtung

- `scripts.js` bleibt vorerst Orchestrator des Bestandsfrontends
- neue Fachlogik soll nicht mehr direkt in `scripts.js` landen
- das neue `frontend/` ist der Migrationspfad
- wiederverwendbare Feldnormalisierung liegt im neuen Frontend unter `shared/records`
- Umschaltung erfolgt später seitenweise und nur nach visueller und fachlicher Abnahme
