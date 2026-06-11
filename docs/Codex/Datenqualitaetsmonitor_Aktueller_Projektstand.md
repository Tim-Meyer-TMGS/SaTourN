# Datenqualitaets-Monitor - Aktueller Projektstand

Stand: 2026-06-11

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
  Score-Matrix, automatisch geprueften Kriterien, Erklaerung zu
  nicht scorewirksamen Faellen und fachlichem Kriterienmodell.

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
- Zusaetzlich gibt es nun einen kurzen Browser-In-Memory-Cache mit
  Request-Deduplizierung fuer wiederholte GET-Abfragen. Er beschleunigt
  identische Requests innerhalb einer Sitzung, ersetzt aber keinen
  serverseitigen Snapshot- oder Redis-Cache.
- Arbeitskontext besteht aus Gebiet, Ort und Datentyp und wird klein in
  `localStorage` gespeichert. API-Antworten, Rohdaten, Fehlerlisten, Secrets
  und KI-Kontexte werden nicht lokal persistiert.
- Consent ist technisch vorbereitet: Runtime-Inventar externer Dienste,
  lokale Consent-Einstellungen fuer optionale Kategorien und ein
  Datenschutz-/Consent-Bereich auf der Help-Seite. Ein echter
  Consentmanager ist noch nicht produktiv angeschlossen.
- Ganz Sachsen bekommt keinen Qualitaets-Score. Erst bei Gebiet oder Ort
  startet die Uebersicht einen asynchronen regionalen Datensatzscan und
  berechnet Score/Status aus den geladenen Datensaetzen.
- Die Pflegeaufgaben nutzen bei Gebiet oder Ort nun ebenfalls den regionalen
  Qualitaetsscan. Dadurch koennen auch serverseitig gepruefte Kriterien im
  begrenzten Arbeitskontext sichtbar werden.
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

Fachliche Ergaenzung vom 2026-06-11:

- Die Kriterienmatrix in
  `docs/Codex/Datenqualitaetsmonitor_Kriterienmatrix_2026-06-11.md`
  praezisiert `source_guarded`, `not_applicable`, `excluded_by_category`,
  verifizierte Pushdowns und die POI-Ausschlusslogik.
- Diese Matrix ist eine fachliche Referenz. Sie ersetzt nicht den aktuellen
  Codezustand, aber sie bestimmt die naechsten fachlichen Korrekturen.

Technische API-Vorbereitung:

- Das Fachmodell kann `apiCandidate`-Metadaten enthalten. Diese beschreiben
  moegliche `q`-Abfragen aus der Meta Query Language, sind aber noch nicht
  automatisch scorewirksam.
- Dokumentiert vorbereitete Kandidaten sind unter anderem `lat`/`lon`,
  `length`/`duration` und konkrete `feature:`-, `category:`-,
  `keyword:`- oder `attribute_license:`-Abfragen.
- Aktivierung erfolgt erst nach echten positiven und negativen API-Tests pro
  Datentyp. Count, Liste und Detailseite muessen dieselbe Regel verwenden.
- Generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*`
  oder `feature:*` gelten laut Kriterienmatrix fachlich nicht als belastbar
  fuer `open-data-sachsen-tourismus`. Wo der aktuelle Code noch mit solchen
  Annahmen arbeitet, ist eine Umstellung auf Server-Scan oder konkreten
  Wert-Pushdown vorgesehen.

Aktiv:

- `opening_hours_missing`: POI, Gastro; aktuell technisch aktiv. Laut
  Kriterienmatrix darf generisches `openings:*` fachlich nicht als belastbarer
  Pushdown gelten; die Regel laeuft jetzt ueber Server-Scan. Fuer POI greift
  zusaetzlich die erste Welle der Kategorien-Ausschlusslogik.
- `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown
  verifiziert.
- `description_missing`: POI, Gastro, Tour; aktuell technisch aktiv. Laut
  Kriterienmatrix darf generisches `details:*` fachlich nicht als belastbarer
  Pushdown gelten; die Regel laeuft jetzt ueber Server-Scan.
- `poi_street_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_teaser_missing`: POI; Server-Scan aktiv.
- `poi_email_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_website_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_phone_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
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
- `poi_price_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik
  fuer fachlich nicht erwartbare Preisangaben.
- `hotel_language_english_missing`: Hotel; validierte OR-Liste gepruefter
  Fremdsprachen per API-Pushdown verifiziert.
- `hotel_payment_cash_missing`: Hotel; validierte OR-Liste gepruefter
  Zahlungsarten per API-Pushdown verifiziert.
- `hotel_parking_feature_missing`: Hotel; validierte OR-Liste gepruefter
  Parkhinweise per API-Pushdown verifiziert.
- `gastro_payment_options_missing`: Gastro; validierte OR-Liste gepruefter
  Zahlungsarten per API-Pushdown verifiziert.
- `gastro_languages_missing`: Gastro; validierte OR-Liste gepruefter
  Fremdsprachen per API-Pushdown verifiziert.
- `gastro_parking_feature_missing`: Gastro; Feature
  `PKW-Parkplatz am Haus` per API-Pushdown verifiziert.
- `gastro_cuisine_category_missing`: Gastro; validierte OR-Liste
  gepruefter Kuechenarten per API-Pushdown verifiziert.
- `booking_link_missing`: Hotel per `keyword:"Bookable"` API-Pushdown
  verifiziert, Package per Server-Scan verifiziert.
- `tour_season_missing`: Tour; Server-Scan aktiv auf Basis gepflegter
  Saisonangaben.
- `tour_parking_missing`: Tour; Server-Scan aktiv auf Basis gepflegter
  Parkhinweise in Tourtexten.

Nicht als Pushdown aktiviert:

- Telefon, E-Mail, Webseite, Teaser, Preisfelder, Bild-/Medienurheber,
  Ansprechperson/Organisation/Veranstalter, Event-Termine,
  Tour-Start-/Zielbeschreibung.
- `regionale Kueche` bleibt fuer Gastro bewusst offen, weil die Missing-Query
  nicht komplementaer zur Baseline war.
- `booking:*` bleibt fuer Hotel bewusst ungenutzt; der Pushdown laeuft ueber
  `keyword:"Bookable"`.

Fachlich gueltig, aber nicht als automatische Pflegeaufgabe aktiv:
`geo_missing`, `touristtrip_incomplete`, `manual_image_quality`.
Diese Kriterien sind im `domainQualityModel` enthalten; `geo_missing` und
`touristtrip_incomplete` sind quellseitig abgefangene Basisfaelle,
`manual_image_quality` bleibt redaktionelle Pruefung.

Fachlich zusaetzlich als nicht scorewirksam festgelegt:

- `title_missing`
- `category_missing`
- `geo_missing`
- `event_dates_missing`
- `event_venue_missing`
- `tour_polyline_missing`
- `tour_length_missing`
- `tour_duration_missing`

POI-Ausschlusslogik:

- Fuer POI gelten fachliche Ausschluesse insbesondere bei
  Strasse, Telefon, E-Mail, Webseite, Oeffnungszeiten, Preisangaben und
  Zahlungsmoeglichkeiten.
- Die Matrix liefert dafuer eine konkrete Kategorienliste.
- Die erste produktive Welle ist jetzt fuer
  `poi_street_missing`, `poi_phone_missing`, `poi_email_missing`,
  `poi_website_missing`, `opening_hours_missing` und
  `poi_payment_options_missing` in der Bewertungslogik verankert.
- Weitere Ausschluesse, insbesondere fuer Preisregeln und spaetere
  Kriterienaktivierungen, bleiben ein priorisierter offener Schritt.

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
