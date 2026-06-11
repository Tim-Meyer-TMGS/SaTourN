# Datenqualitaets-Monitor - Aktueller Projektstand

Stand: 2026-06-05

`Statistik/` ist ein statisches GitHub-Pages-Frontend mit Vanilla JavaScript
und Node/Express-Proxy fuer Destination.One/eT4-Requests. Es gibt keine neue
Build-Kette und keine Secrets im Frontend.

## Aktive Seiten

- `Statistik/index.html`: Uebersicht mit Arbeitskontext, Kennzahlen,
  asynchronen Pflegeaufgaben und Open-Data-Status.
- `Statistik/tasks.html`: Pflegeaufgaben mit API-Counts und konkreten
  Datensatzlisten nach Nutzeraktion.
- `Statistik/records.html`: Datensatz-Hauptseite mit lokaler Suche,
  Autovervollstaendigung, serverseitiger Volltextsuche, Filtern,
  Schnellfiltern, Liste, Pagination und CSV-Export.
- `Statistik/record-detail.html`: Datensatz-Detailseite fuer genau einen
  Datensatz per `type`, `id` oder `global_id`.
- `Statistik/stats.html`: Open-Data-Statistik mit aggregierten Counts,
  Datentyp-Verteilung und Einstieg zur Pflegeaufgabe `license_missing`.
- `Statistik/help.html`: Hilfeseite zum Datenqualitaets-Score mit
  Score-Matrix, automatisch geprueften Kriterien und fachlichem
  Kriterienmodell.

Alle Statistik-Links bleiben relativ (`index.html`, `tasks.html`,
`records.html`, `record-detail.html`, `stats.html`, `help.html`) und
funktionieren damit unter
`https://tim-meyer-tmgs.github.io/SaTourN/Statistik/...`.

## Betrieb und Datenfluss

- Aktueller Betrieb: Browser ruft live ueber Render als Proxy ab.
- Genutzte Endpunkte: `/api/search`, `/api/autocomplete`, `/api/quality/count`,
  `/api/quality/scan`.
- Kein produktiver Cronjob, kein Nacht-Snapshot und kein aktiver Cache.
- Vorbereitete Cache-Endpunkte (`/api/quality/snapshot`, `/api/quality/list`)
  werden im Frontend nur genutzt, wenn `window.SATOURN_USE_QUALITY_CACHE`
  explizit aktiv ist.
- Arbeitskontext besteht aus Gebiet, Ort und Datentyp und wird klein in
  `localStorage` gespeichert. API-Antworten, Rohdaten, Fehlerlisten, Secrets
  und KI-Kontexte werden nicht lokal persistiert.
- Ganz Sachsen bekommt keinen Qualitaets-Score. Erst bei Gebiet oder Ort
  startet die Uebersicht einen asynchronen regionalen Datensatzscan und
  berechnet Score/Status aus den geladenen Datensaetzen.
- Pflegeaufgaben mit `0` betroffenen Datensaetzen werden nicht angezeigt.
- Open-Data-Status ist binaer: Open-Data-faehig oder nicht
  Open-Data-faehig. Es gibt keinen sichtbaren Status `Nicht bewertbar`.

## Relevante Dateien

- Frontend: `Statistik/index.html`, `Statistik/tasks.html`,
  `Statistik/records.html`, `Statistik/record-detail.html`,
  `Statistik/stats.html`, `Statistik/help.html`.
- Logik: `Statistik/scripts.js`, `Statistik/quality.js`,
  `Statistik/main.js`.
- Styling: `Statistik/style.css`.
- Proxy: `index.js`, `routes/search.js`, `routes/quality.js`,
  `lib/search-utils.js`.
- Optionale Snapshot-Vorbereitung: `lib/kv-store.js`,
  `scripts/run-quality-snapshot.mjs`.

## Qualitaetskriterien

`Statistik/quality.js` enthaelt neben den aktiven Pruefregeln ein
fachliches `domainQualityModel`. Alle dort modellierten alten und neuen
Qualitaets- und Pruefkriterien gelten fachlich. `active` beschreibt nur die
bereits technisch angebundene Pruefung; `needs_verification` bleibt fachlich
gueltig, muss aber in Feldmapping/API-Query oder Server-Scan noch verifiziert
werden.

Technische API-Vorbereitung:

- Das Fachmodell kann `apiCandidate`-Metadaten enthalten. Diese beschreiben
  moegliche `q`-Abfragen aus der Meta Query Language, sind aber noch nicht
  automatisch scorewirksam.
- Dokumentiert vorbereitete Kandidaten sind unter anderem `street:*`,
  `lat`/`lon`, `length`/`duration`, `details:*` fuer weitere Typen und
  `attribute_license` fuer Event.
- Aktivierung erfolgt erst nach echten positiven und negativen API-Tests pro
  Datentyp. Count, Liste und Detailseite muessen dieselbe Regel verwenden.

Aktiv:

- `opening_hours_missing`: POI, Gastro; API-Pushdown verifiziert.
- `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown
  verifiziert.
- `description_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_author_missing`: Server-Scan; kein verifizierter API-Pushdown.
  Der Server nutzt `media:*` als Kandidaten-Prefilter, damit Datensaetze ohne
  Bilder nicht unnoetig geladen werden.
- `public_transport_missing`: POI, Gastro, Tour, Hotel, Event; API-Pushdown
  verifiziert.
- `poi_parking_feature_missing`: POI; Feature
  `Parkplaetze vorhanden` per API-Pushdown verifiziert.
- `poi_payment_options_missing`: POI; validierte OR-Liste gepruefter
  Zahlungsarten per API-Pushdown verifiziert.
- `poi_languages_missing`: POI; validierte OR-Liste gepruefter
  Fremdsprachen per API-Pushdown verifiziert.
- `poi_suitability_missing`: POI; validierte OR-Liste gepruefter
  Eignungsangaben per API-Pushdown verifiziert.
- `gastro_payment_options_missing`: Gastro; validierte OR-Liste gepruefter
  Zahlungsarten per API-Pushdown verifiziert.
- `gastro_languages_missing`: Gastro; validierte OR-Liste gepruefter
  Fremdsprachen per API-Pushdown verifiziert.
- `gastro_parking_feature_missing`: Gastro; Feature
  `PKW-Parkplatz am Haus` per API-Pushdown verifiziert.
- `gastro_cuisine_category_missing`: Gastro; validierte OR-Liste
  gepruefter Kuechenarten per API-Pushdown verifiziert.
- `booking_link_missing`: Hotel per API-Pushdown verifiziert, Package per
  Server-Scan verifiziert.

Nicht als Pushdown aktiviert:

- Telefon, E-Mail, Webseite, Teaser, Preisfelder, Bild-/Medienurheber,
  Ansprechperson/Organisation/Veranstalter, Event-Termine,
  Tour-Start-/Zielbeschreibung.
- `regionale Kueche` bleibt fuer Gastro bewusst offen, weil die Missing-Query
  nicht komplementaer zur Baseline war.

Fachlich gueltig, aber nicht als automatische Pflegeaufgabe aktiv:
`geo_missing`, `touristtrip_incomplete`, `manual_image_quality`.
Diese Kriterien sind im `domainQualityModel` enthalten; `geo_missing` und
`touristtrip_incomplete` sind quellseitig abgefangene Basisfaelle,
`manual_image_quality` bleibt redaktionelle Pruefung.

## Pflegesystem-Erkennung

- `import_source_feratel` oder `HasSystemId_Feratel`:
  Primaersystem Feratel.
- `import_source_outdooractive`: Primaersystem Outdooractive.
- Sonst: Primaersystem SaTourN.

Die Logik basiert auf den Item-Keywords, insbesondere `keywords_old`.

## Tests

- Standardcheck: `git diff --check`.
- Wenn Node verfuegbar ist: `npm run check` und
  `npm run diagnose:quality-examples`.
- In der aktuellen Codex-Umgebung war `node` zuletzt nicht verfuegbar. Dann
  Node-Checks als nicht ausgefuehrt dokumentieren.
