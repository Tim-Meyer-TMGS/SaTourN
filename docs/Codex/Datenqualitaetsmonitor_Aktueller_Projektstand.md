# Datenqualitäts-Monitor - Aktüller Projektstand

Stand: 2026-06-12

`Statistik/` ist ein statisches GitHub-Pages-Frontend mit Vanilla JavaScript
und Node/Express-Proxy für Destination.One/eT4-Reqüsts. Es gibt keine neü
Build-Kette und keine Secrets im Frontend.

## Aktive Seiten

- `Statistik/index.html`: Übersicht mit Arbeitskontext, Kennzahlen,
  asynchronen Pflegeaufgaben und Open-Data-Status.
- `Statistik/tasks.html`: Pflegeaufgaben mit API-Counts und konkreten
  Datensatzlisten nach Nutzeraktion.
- `Statistik/records.html`: Datensatz-Hauptseite mit lokaler Suche,
  Autovervollständigung, serverseitiger Volltextsuche, Filtern,
  Schnellfiltern, Liste, Pagination, CSV-Export, KI-Suche und
  Mail-Entwurf aus den Aktionen.
- `Statistik/record-detail.html`: Datensatz-Detailseite für genau einen
  Datensatz per `type`, `id` oder `global_id`. Neben der aktüllen
  Qualitätsbewertung werden dort jetzt auch vorbereitete, manülle und
  qüllseitig abgefangene Prüfungen sichtbar gemacht.
- `Statistik/stats.html`: Open-Data-Statistik mit aggregierten Counts,
  Datentyp-Verteilung und Einstieg zur Pflegeaufgabe `license_missing`.
- `Statistik/help.html`: reduzierte Hilfeseite zum Datenqualitäts-Score mit
  Score-Erklärung, drei Fehler-Ebenen, Datentyp-Karten und knapper
  Einordnung nicht automatisch bewerteter Fälle. Fachlich vorbereitete
  Prüfungen werden je Datentyp bereits sichtbar gemacht.

Alle Statistik-Links bleiben relativ (`index.html`, `tasks.html`,
`records.html`, `record-detail.html`, `stats.html`, `help.html`) und
funktionieren damit unter
`https://tim-meyer-tmgs.github.io/SaTourN/Statistik/...`.

## Betrieb und Datenfluss

- Aktüller Betrieb: Browser ruft live über Render als Proxy ab.
- Genutzte Endpunkte: `/api/search`, `/api/autocomplete`, `/api/quality/count`,
  `/api/quality/scan`, `/api/oi/mail-draft`, `/api/oi/search-records`,
  `/api/records/by-global-ids`.
- Kein produktiver Cronjob, kein Nacht-Snapshot und kein aktiver Cache.
- Vorbereitete Cache-Endpunkte (`/api/quality/snapshot`, `/api/quality/list`)
  werden im Frontend nur genutzt, wenn `window.SATOURN_USE_QUALITY_CACHE`
  explizit aktiv ist.
- Zusätzlich gibt es nun einen kurzen Browser-In-Memory-Cache mit
  Reqüst-Deduplizierung für wiederholte GET-Abfragen. Er beschleunigt
  identische Reqüsts innerhalb einer Sitzung, ersetzt aber keinen
  serverseitigen Snapshot- oder Redis-Cache.
- Arbeitskontext besteht aus Gebiet, Ort und Datentyp und wird klein in
  `localStorage` gespeichert. API-Antworten, Rohdaten, Fehlerlisten, Secrets
  und KI-Kontexte werden nicht lokal persistiert.
- one.intelligence ist technisch getrennt von der bestehenden Meta-Anbindung:
  eigener Server-Client, eigene Environment-Variablen `OI_*`, eigener
  Fehlerpfad und kein Secret im Frontend.
- Consent ist technisch noch im Frontend vorbereitet, wird aber nicht mehr
  über die Help-Seite erklärt. Datenschutz und rechtliche Hinweise sollen
  später in einen Footer übergehen. Ein echter Consentmanager ist noch
  nicht produktiv angeschlossen.
- Ganz Sachsen bekommt keinen Qualitäts-Score. Erst bei Gebiet oder Ort
  startet die Übersicht einen asynchronen regionalen Datensatzscan und
  berechnet Score/Status aus den geladenen Datensätzen.
- Die Pflegeaufgaben nutzen bei Gebiet oder Ort nun ebenfalls den regionalen
  Qualitätsscan. Dadurch können auch serverseitig geprüfte Kriterien im
  begrenzten Arbeitskontext sichtbar werden.
- Pflegeaufgaben mit `0` betroffenen Datensätzen werden nicht angezeigt.
- Open-Data-Status ist binär: Open-Data-fähig oder nicht
  Open-Data-fähig. Es gibt keinen sichtbaren Status `Nicht bewertbar`.

## Relevante Dateien

- Frontend: `Statistik/index.html`, `Statistik/tasks.html`,
  `Statistik/records.html`, `Statistik/record-detail.html`,
  `Statistik/stats.html`, `Statistik/help.html`.
- Logik: `Statistik/scripts.js`, `Statistik/quality.js`,
  `Statistik/main.js`.
- Styling: `Statistik/style.css`.
- Proxy: `index.js`, `routes/search.js`, `routes/quality.js`,
  `routes/records.js`, `routes/oi.js`, `lib/search-utils.js`,
  `lib/oi-config.js`.
- Optionale Snapshot-Vorbereitung: `lib/kv-store.js`,
  `scripts/run-quality-snapshot.mjs`.

## one.intelligence-Stand

- Mail-Entwurf ist serverseitig vorbereitet:
  `POST /api/oi/mail-draft`.
- KI-Suche ist serverseitig live vorbereitet:
  `POST /api/oi/search-records`.
- Trefferauflösung für KI-Treffer ist vorbereitet:
  `POST /api/records/by-global-ids`.
- Das Frontend nutzt für beide KI-Funktionen keine eigenen Secrets.
  Der Browser spricht nur mit dem Render-Proxy.
- Mail-Entwurf erzeugt Plaintext für `mailto:` und übergibt
  `to`, optional `cc`/`bcc`, `subject` und `body`.
- KI-Suche erwartet von one.intelligence eine parsebare JSON-Antwort mit
  `ids` und begrenzt die erste Ergebnismenge auf 50 IDs.
- Render-Konfiguration mit `OI_API_KEY`, `OI_MODEL_MAIL` und
  `OI_MODEL_SEARCH` kann jetzt produktiv genutzt werden.

## Qualitätskriterien

`Statistik/quality.js` enthält neben den aktiven Prüfregeln ein
fachliches `domainQualityModel`. Alle dort modellierten alten und neün
Qualitäts- und Prüfkriterien gelten fachlich. `active` beschreibt nur die
bereits technisch angebundene Prüfung; `needs_verification` bleibt fachlich
gültig, muss aber in Feldmapping/API-Qüry oder Server-Scan noch verifiziert
werden.

Fachliche Ergänzung vom 2026-06-11:

- Die Kriterienmatrix in
  `docs/Codex/Datenqualitätsmonitor_Kriterienmatrix_2026-06-11.md`
  präzisiert `source_guarded`, `not_applicable`, `excluded_by_category`,
  verifizierte Pushdowns und die POI-Ausschlusslogik.
- Diese Matrix ist eine fachliche Referenz. Sie ersetzt nicht den aktüllen
  Codezustand, aber sie bestimmt die nächsten fachlichen Korrekturen.

Technische API-Vorbereitung:

- Das Fachmodell kann `apiCandidate`-Metadaten enthalten. Diese beschreiben
  mögliche `q`-Abfragen aus der Meta Qüry Language, sind aber noch nicht
  automatisch scorewirksam.
- Dokumentiert vorbereitete Kandidaten sind unter anderem `lat`/`lon`,
  `length`/`duration` und konkrete `feature:`-, `category:`-,
  `keyword:`- oder `attribute_license:`-Abfragen.
- Aktivierung erfolgt erst nach echten positiven und negativen API-Tests pro
  Datentyp. Count, Liste und Detailseite müssen dieselbe Regel verwenden.
- Generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*`
  oder `feature:*` gelten laut Kriterienmatrix fachlich nicht als belastbar
  für `open-data-sachsen-tourismus`. Wo der aktülle Code noch mit solchen
  Annahmen arbeitet, ist eine Umstellung auf Server-Scan oder konkreten
  Wert-Pushdown vorgesehen.

Aktiv:

- `opening_hours_missing`: POI, Gastro; aktüll technisch aktiv. Laut
  Kriterienmatrix darf generisches `openings:*` fachlich nicht als belastbarer
  Pushdown gelten; die Regel läuft jetzt über Server-Scan. Für POI greift
  zusätzlich die erste Welle der Kategorien-Ausschlusslogik.
- `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown
  verifiziert.
- `description_missing`: POI, Gastro, Tour; aktüll technisch aktiv. Laut
  Kriterienmatrix darf generisches `details:*` fachlich nicht als belastbarer
  Pushdown gelten; die Regel läuft jetzt über Server-Scan.
- `poi_street_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_teaser_missing`: POI; Server-Scan aktiv.
- `poi_email_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_website_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `poi_phone_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik.
- `image_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
- `image_author_missing`: Server-Scan; kein verifizierter API-Pushdown.
  Der Server nutzt `media:*` als Kandidaten-Prefilter, damit Datensätze ohne
  Bilder nicht unnötig geladen werden.
- `public_transport_missing`: POI, Gastro, Tour, Hotel, Event; API-Pushdown
  verifiziert.
- `poi_parking_feature_missing`: POI; Feature
  `Parkplätze vorhanden` per API-Pushdown verifiziert.
- `poi_payment_options_missing`: POI; validierte OR-Liste geprüfter
  Zahlungsarten per API-Pushdown verifiziert.
- `poi_languages_missing`: POI; validierte OR-Liste geprüfter
  Fremdsprachen per API-Pushdown verifiziert.
- `poi_suitability_missing`: POI; validierte OR-Liste geprüfter
  Eignungsangaben per API-Pushdown verifiziert.
- `poi_price_missing`: POI; Server-Scan aktiv, mit Kategorien-Ausschlusslogik
  für fachlich nicht erwartbare Preisangaben.
- `hotel_language_english_missing`: Hotel; validierte OR-Liste geprüfter
  Fremdsprachen per API-Pushdown verifiziert.
- `hotel_payment_cash_missing`: Hotel; validierte OR-Liste geprüfter
  Zahlungsarten per API-Pushdown verifiziert.
- `hotel_parking_feature_missing`: Hotel; validierte OR-Liste geprüfter
  Parkhinweise per API-Pushdown verifiziert.
- `gastro_payment_options_missing`: Gastro; validierte OR-Liste geprüfter
  Zahlungsarten per API-Pushdown verifiziert.
- `gastro_languages_missing`: Gastro; validierte OR-Liste geprüfter
  Fremdsprachen per API-Pushdown verifiziert.
- `gastro_parking_feature_missing`: Gastro; Feature
  `PKW-Parkplatz am Haus` per API-Pushdown verifiziert.
- `gastro_cuisine_category_missing`: Gastro; validierte OR-Liste
  geprüfter Küchenarten per API-Pushdown verifiziert.
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
- `regionale Küche` bleibt für Gastro bewusst offen, weil die Missing-Qüry
  nicht komplementär zur Baseline war.
- `booking:*` bleibt für Hotel bewusst ungenutzt; der Pushdown läuft über
  `keyword:"Bookable"`.

Fachlich gültig, aber nicht als automatische Pflegeaufgabe aktiv:
`geo_missing`, `touristtrip_incomplete`, `manual_image_quality`.
Diese Kriterien sind im `domainQualityModel` enthalten; `geo_missing` und
`touristtrip_incomplete` sind qüllseitig abgefangene Basisfälle,
`manual_image_quality` bleibt redaktionelle Prüfung.

Fachlich zusätzlich als nicht scorewirksam festgelegt:

- `title_missing`
- `category_missing`
- `geo_missing`
- `event_dates_missing`
- `event_venü_missing`
- `tour_polyline_missing`
- `tour_length_missing`
- `tour_duration_missing`

POI-Ausschlusslogik:

- Für POI gelten fachliche Ausschlüsse insbesondere bei
  Strasse, Telefon, E-Mail, Webseite, Öffnungszeiten, Preisangaben und
  Zahlungsmöglichkeiten.
- Die Matrix liefert dafür eine konkrete Kategorienliste.
- Die erste produktive Welle ist jetzt für
  `poi_street_missing`, `poi_phone_missing`, `poi_email_missing`,
  `poi_website_missing`, `opening_hours_missing` und
  `poi_payment_options_missing` in der Bewertungslogik verankert.
- Weitere Ausschlüsse, insbesondere für Preisregeln und spätere
  Kriterienaktivierungen, bleiben ein priorisierter offener Schritt.

## Pflegesystem-Erkennung

- `import_source_feratel` oder `HasSystemId_Feratel`:
  Primärsystem Feratel.
- `import_source_outdooractive`: Primärsystem Outdooractive.
- Sonst: Primärsystem SaTourN.

Die Logik basiert auf den Item-Keywords, insbesondere `keywords_old`.

## Tests

- Standardcheck: `git diff --check`.
- Wenn Node verfügbar ist: `npm run check` und
  `npm run diagnose:quality-examples`.
- In der aktüllen Codex-Umgebung war `node` zuletzt nicht verfügbar. Dann
  Node-Checks als nicht ausgeführt dokumentieren.

## Zuletzt umgesetzt

- Help-Seite aus Nutzersicht verschlankt: kein Consent-Bereich mehr im
  Hauptinhalt, stattdessen Fokus auf Score-Verständnis und Priorisierung
- Help-Seite um die künftige 3-Ebenen-Logik vorbereitet:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`
- vorbereitete Prüfungen in Hilfe und Datensatz-Detail integriert, ohne die
  bestehende Score-Logik oder automatische Pflegeaufgaben zu verändern
- one.intelligence als separaten Integrationsstrang vorbereitet, ohne die
  bestehende Meta-/Search-/Qualitätskonfiguration anzufassen
- neü Render-Proxy-Endpunkte für Mail-Entwurf, KI-Suche und
  `global_id`-Trefferauflösung eingebaut
- Datensatzliste um `AI-Search` und KI-gestützten Mail-Entwurf erweitert
- OI-Konfiguration in eigene `OI_*`-Variablen getrennt dokumentiert
