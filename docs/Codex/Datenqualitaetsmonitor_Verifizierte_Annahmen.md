# Datenqualitaets-Monitor - Verifizierte Annahmen und neue Teilschritte

Stand: 2026-06-03

Diese Datei uebernimmt die zwischenzeitlich verifizierten fachlichen und technischen Annahmen aus `SaTourN_Codex_TODO_aktuell.md` und bildet daraus neue Teilschritte fuer die weitere Umsetzung.

## Grundregeln

- Kein kompletter Neubau.
- Bestehendes Dashboard, Statistiklogik, statische Auslieferung und Node/Express-Proxy bleiben Grundlage.
- Keine Qualitaetskriterien gegen theoretische Feldnamen bauen.
- Nur verifizierte eT4-/Lucene-Prefixe als API-Pushdown nutzen.
- Nicht verifizierte Kriterien ueber lokalen oder serverseitigen Scan pruefen.
- UI so umbauen, dass nicht beim Start alle API-Anfragen gleichzeitig feuern.
- Fehlerlisten erst laden, wenn Datentyp und Kriterium eindeutig gewaehlt wurden.
- Browser-Samples duerfen nicht als vollstaendige Gesamtstatistik dargestellt werden.
- `overallcount` fuer Statistik-Counts und itembasierte Qualitaetswerte strikt trennen.

## Neuer Teilschritt A - Kriterienkonfiguration korrigieren

Aktive automatisch pruefbare Kriterien:

| Kriterium | Datentypen | Methode | Status |
|---|---|---|---|
| `opening_hours_missing` | POI, Gastro | API-Pushdown | bestaetigt |
| `license_missing` | POI, Gastro, Tour, Hotel, Package | API-Pushdown | bestaetigt |
| `description_missing` | POI, Gastro, Tour | API-Pushdown | bestaetigt |
| `image_missing` | POI, Gastro, Tour | API-Pushdown | bestaetigt |
| `image_author_missing` | alle Typen mit pruefbaren Medien | Server-Scan | API-Pushdown widerlegt |
| `public_transport_missing` | POI, Gastro, Tour, Hotel, Event | API-Pushdown | bestaetigt |
| `booking_link_missing` | Hotel, Package | Hotel bestaetigt, Package offen | teilweise bestaetigt |

Zu entfernen oder zu deaktivieren:

- `geo_missing`: Datensaetze ohne Geo werden API-seitig nicht ausgegeben.
- `touristtrip_incomplete`: TouristTrip soll nicht bewertet werden.
- Tour-Geometrie, Laenge, Dauer und Hoehenwerte: technische Pflichtfelder, nicht als Fehler bewerten.
- Gastro-Speisekarte/Karte: nicht einfuehren.
- Buchungslink fuer POI, Tour, Gastro und Event: nicht pruefen.
- OePNV fuer Package: nicht pruefen.
- `manual_image_quality`: nur optionaler manueller Hinweis, nicht als automatisch berechneter Fehler.

## Neuer Teilschritt B - Verifizierte Query-Matrix uebernehmen

| Kriterium | Typen | Positive Query | Negative Query | Methode |
|---|---|---|---|---|
| `opening_hours_missing` | POI, Gastro | `openings:*` | `*:* -openings:*` | API |
| `license_missing` | POI, Gastro, Tour, Hotel, Package | `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)` | `*:* -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)` | API |
| `description_missing` | POI, Gastro, Tour | `details:*` | `*:* -details:*` | API |
| `image_missing` | POI, Gastro, Tour | `media:*` | `*:* -media:*` | API |
| `image_author_missing` | alle mit pruefbaren Medien | keine | keine | Scan |
| `public_transport_missing` | POI, Gastro, Tour, Hotel, Event | `feature:"Mit OePNV erreichbar"` | `*:* -feature:"Mit OePNV erreichbar"` | API |
| `booking_link_missing` | Hotel | `booking:*` | `*:* NOT booking:*` | API |
| `booking_link_missing` | Package | offen | offen | offen |

Wichtig:

- Hotel-Buchungslink darf nicht mit `*:* -booking:*` gesucht werden.
- Hotel-Buchungslink darf nicht mit `*:* AND NOT booking:*` gesucht werden.
- Negativqueries duerfen nicht pauschal generiert werden; sie muessen je Kriterium aus der Konfiguration kommen.
- Diese ASCII-Dokumentation schreibt `OePNV`; die technische Query-Konfiguration muss den echten destination.one-Wert mit Umlaut oder die korrekt URL-kodierte Variante verwenden.

## Neuer Teilschritt C - Reale Feldmappings nutzen

Status: umgesetzt am 2026-06-03 in `Statistik/quality.js`,
`Statistik/scripts.js` und `routes/quality.js`.

Gemeinsame Felder:

- `id`, `global_id`, `title`, `type`
- `texts[]`
- `areas[]`, `areas_old[]`
- `categories[]`, `categories_old[]`
- `features[]`, `features_old[]`
- `media_objects[]`
- `attributes[]`
- `addresses[]`
- `geo.main`
- `created`, `changed`, `source`
- `web`, `email`, `phone`

Wichtige lokale Fallbacks:

- Oeffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen === true`.
- Lizenz: `attributes[].key = license` mit `CC0`, `CC-BY`, `CC-BY-SA`, `PD`.
- Beschreibung: `texts[].rel = details` mit nicht-leerem Text; Teaser allein zaehlt nicht.
- Bild: pruefbare `media_objects[]`, nicht `canonical`, nicht `socialmedia`; Logo fachlich fuer Bildpflicht klaeren.
- Bildurheber: pruefbare Medien mit leerem `copyrightText`.
- OePNV: `features[].value` oder `features_old[]` enthaelt `Mit OePNV erreichbar`.
- Buchungslink Hotel: `media_objects[].rel = booking` mit nicht-leerer `url`.

## Neuer Teilschritt D - Helper und Tests auf reale Beispiele ausrichten

Status: umgesetzt am 2026-06-03 in `Statistik/quality.js` und
`scripts/diagnose-quality-examples.mjs`.

Beispieldaten liegen unter:

- `docs/Codex/examples/poi.json`
- `docs/Codex/examples/gastro.json`
- `docs/Codex/examples/tour.json`
- `docs/Codex/examples/hotel.json`

Zu implementierende oder zu korrigierende Helper:

- `getTextsByRel(item, rel)`
- `hasTextByRel(item, rel)`
- `hasDetailsText(item)`
- `isNonEmptyHtmlOrText(value)`
- `getAttributeValue(item, key)`
- `hasValidDatasetLicense(item)`
- `getFeatureValues(item)`
- `hasPublicTransportFeature(item)`
- `getMediaObjects(item)`
- `isCheckableMediaObject(mo)`
- `hasCheckableMedia(item)`
- `findMissingCopyrightMedia(item)`
- `hasBookingLink(item)`
- `getAreaValues(item)`
- `getCategoryValues(item)`

Diagnose:

- `npm run diagnose:quality-examples`
- `npm run diagnose:quality-examples:json`

Die Diagnose prueft:

- Verfuegbarkeit aller D-Helper.
- Helper-Zaehler und Beispiel-IDs je Datentyp.
- fehlende und erfuellte Kriterien je Datentyp.
- Scan-Methode, verifizierte Query, Warnungen und Beispiel-IDs je Kriterium.

## Neuer Teilschritt E - Proxy und Query-Erzeugung umbauen

Status: umgesetzt am 2026-06-03 in `routes/quality.js` und
`Statistik/scripts.js`.

Ziel:

- Query aus `criterionId` + `type` serverseitig ableiten.
- Nur verifizierte Query fuer passenden Typ verwenden.
- Bei nicht verifizierter Query auf `server_scan` zurueckfallen.
- Methode, Query, Verifikation, Pagination und Warnungen in der Antwort sichtbar machen.

Mindestanforderung fuer Fehlerlisten:

- Typ und Kriterium muessen eindeutig gewaehlt sein.
- Fehlerliste laedt erst nach dieser Auswahl.
- UI zeigt Methode, Query, Verifikation und Vollstaendigkeitsstatus.

Umsetzung:

- `/api/quality/scan` leitet Query, Methode und Verifikation aus `criterionId` und `type` ab.
- Verifizierte Missing-Queries werden serverseitig mit der Basisquery kombiniert.
- Nicht verifizierte Kriterien fallen auf serverseitigen Scan zurueck.
- Die Antwort enthaelt `diagnostic`, `page`, `stats` und effektive Criterion-Metadaten fuer den angefragten Typ.
- Die Fehlerliste nutzt den Server-Scan, sobald Kriterium und Datentyp eindeutig sind.
- Die UI zeigt Quelle, Methode, Query, Verifikation, Vollstaendigkeit, `overallcount`, gescannte Items/Seiten und Warnungen.

## Neuer Teilschritt F - UI-Struktur API-schonend weiterentwickeln

Langfristige Zielstruktur:

- Uebersicht
- Statistik
- Datenqualitaet
- Fehlerlisten
- Datentypen
- Kriterien-Matrix
- KI-Analyse
- Einstellungen/Diagnose

Mindestregeln:

- Initial Load maximal 1 bis 2 kleine Requests.
- Statistikbereich laedt nur Statistik-Counts.
- Fehlerlisten laden erst nach Datentyp + Kriterium.
- Matrix zeigt zuerst Struktur, Counts erst auf Klick oder gezielte Aktualisierung.
- KI baut Kontext nur beim Oeffnen oder explizitem Start.

## Neuer Teilschritt G - Diagnose und Tests

Zu ergaenzen:

- Unit-Tests oder Diagnose-Skript fuer Helper gegen `docs/Codex/examples/*.json`.
- Kriterien-Tests je Datentyp.
- Query-Diagnose-Skript, z. B. `scripts/test-et4-quality-filters.mjs`.
- Plausibilitaetsabgleich zwischen API-Query-Samples und lokalen Helpern.

## Noch offene verifizierungsnahe Fragen

- Package-Buchungslink: Query und reale Feldstruktur testen.
- Hotel `image_missing`: fachlich entscheiden und Query `media:*` fuer Hotel testen.
- Hotel `description_missing`: fachlich entscheiden und Query `details:*` fuer Hotel testen.
- Event-Beispiele analysieren, falls weitere Event-spezifische Kriterien entstehen sollen.
