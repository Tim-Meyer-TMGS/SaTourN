# Datenqualitätsmonitor - API-Pushdown-TODOs

Stand: 2026-07-06

Diese Liste enthält die API-Pushdowns, die geprüft werden sollen, um
`server_scan`-Prüfungen schneller zu machen. Die Kandidaten sind im Code
bereits als nicht verifizierte `api_pushdown`-Kandidaten hinterlegt. Solange
`verifiedForTypes` leer ist, bleibt automatisch `server_scan` aktiv.

## Prüfprotokoll je Kriterium

```text
Kriterium:
Datentyp des Tests:
Baseline Count all:all:
Positive Query:
Positive Count:
Missing Query:
Missing Count:
Positive + Missing = Baseline? ja/nein
Positiver Beispieldatensatz ID:
Negativer Beispieldatensatz ID:
Detailbefund stimmt? ja/nein
Entscheidung: aktivieren / verwerfen / weiter prüfen
Bemerkung:
```

Wichtig:

- Missing-Queries immer mit `all:all` ankern.
- Kontrolltests mit `id:` durchführen, nicht mit `global_id:`.
- Wenn eine Feldlogik für einen Datentyp bestätigt ist, darf sie für alle
  fachlich passenden Datentypen übernommen werden.

## Priorität 1 - Hohe Performance-Wirkung

### 1. Straße fehlt

- Kriterien: `hotel_street_missing`, `poi_street_missing`,
  `gastro_street_missing`, `event_street_missing`
- Positive Query: `street:*`
- Missing Query: `all:all -street:*`
- Bei Erfolg aktivieren für: `Hotel`, `POI`, `Gastro`, `Event`

### 2. Beschreibung fehlt

- Kriterium: `description_missing`
- Positive Query: `details:*`
- Missing Query: `all:all -details:*`
- Bei Erfolg aktivieren für: `POI`, `Gastro`, `Tour`, `Hotel`, `Event`

### 3. Teaser fehlt

- Kriterien: `hotel_teaser_missing`, `tour_teaser_missing`,
  `poi_teaser_missing`, `gastro_teaser_missing`, `event_teaser_missing`
- Positive Query: `teaser:*`
- Missing Query: `all:all -teaser:*`
- Bei Erfolg aktivieren für: `Hotel`, `Tour`, `POI`, `Gastro`, `Event`

### 4. E-Mail fehlt

- Kriterien: `hotel_email_missing`, `poi_email_missing`,
  `gastro_email_missing`, `event_email_missing`
- Primär prüfen:
  - Positive Query: `email:*`
  - Missing Query: `all:all -email:*`
- Falls nötig zusätzlich prüfen:
  - Positive Query: `emailRequest:*`
  - Missing Query: `all:all -emailRequest:*`
- Ziel: klären, welches Feld die sichtbare Datensatz-E-Mail abbildet.

### 5. Webseite fehlt

- Kriterien: `hotel_website_missing`, `poi_website_missing`,
  `gastro_website_missing`, `event_website_missing`
- Primär prüfen:
  - Positive Query: `web:*`
  - Missing Query: `all:all -web:*`
- Falls nötig zusätzlich prüfen:
  - Positive Query: `url:*`
  - Missing Query: `all:all -url:*`
- Ziel: klären, welches Feld die sichtbare Webseite abbildet.

### 6. Telefon fehlt

- Kriterien: `hotel_phone_missing`, `poi_phone_missing`,
  `gastro_phone_missing`, `event_phone_missing`
- Primär prüfen:
  - Positive Query: `phone:*`
  - Missing Query: `all:all -phone:*`
- Falls nötig zusätzlich prüfen:
  - Positive Query: `phone2:*`
  - Missing Query: `all:all -phone2:*`

## Priorität 2 - Open Data und wichtige KPIs

### 7. Event-Lizenz

- Kriterium: `license_missing`
- Datentyp-Test: `Event`
- Positive Query: `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`
- Missing Query: `all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`
- Bei Erfolg `Event` in `verifiedForTypes` ergänzen.

### 8. Öffnungszeiten

- Kriterium: `opening_hours_missing`
- Fachliche Typen: `POI`, `Gastro`
- Positive Query: `openings:*`
- Missing Query: `all:all -openings:*`
- Wichtig: `Tour` bleibt ausgeschlossen.

### 9. Preisinformation

- Kriterien: `hotel_price_missing`, `poi_price_missing`,
  `event_price_missing`
- Primär prüfen:
  - Positive Query: `price:*`
  - Missing Query: `all:all -price:*`
- Zusätzlich prüfen:
  - `prices:*`
  - `PRICE_INFO:*`, falls als Textrel suchbar

## Priorität 3 - Feature- und Spezialfelder

### 10. Event-Zahlungsarten

- Kriterium: `event_payment_options_missing`
- Positive Query:

```text
(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")
```

- Missing Query:

```text
all:all -(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")
```

### 11. Hotel-Merkmale allgemein

- Kriterium: `hotel_features_missing`
- Positive Query: `feature:*`
- Missing Query: `all:all -feature:*`
- Nur aktivieren, wenn `feature:*` fachlich nicht zu breit ist und echte
  Hotel-Merkmale abbildet.

### 12. Gastro-Küche

- Kriterium: `gastro_kitchen_missing`
- Primär prüfen:
  - Positive Query: `kitchenTimeIntervals:*`
  - Missing Query: `all:all -kitchenTimeIntervals:*`
- Falls dokumentiert zusätzlich passende Küchen-Textrels oder Featurewerte
  prüfen.

## Voraussichtlich Server-Scan behalten

Diese Kriterien nur weiter prüfen, wenn konkrete API-Felder gefunden werden:

- `image_author_missing`
- `hotel_contact_person_missing`
- `tour_author_missing`
- `tour_start_target_missing`
- `tour_season_missing`
- `tour_parking_missing`
- `gastro_kitchen_missing`, falls keine eindeutige API-Query existiert

## Nach erfolgreicher Prüfung

In `Statistik/quality.js`:

- `method: 'api_pushdown'` setzen, falls noch nicht gesetzt
- `api.verified: true`
- `api.verifiedForTypes` auf alle fachlich passenden Typen erweitern
- `positiveQuery` und `missingQuery` exakt aus dem bestätigten Test übernehmen

Danach prüfen:

- Count stimmt mit Baseline
- Fehlerliste lädt betroffene Datensätze
- Detailseite zeigt denselben Befund
- Score reagiert konsistent
