# Datenqualitätsmonitor - API-Pushdown-TODOs

Stand: 2026-07-06

Diese Datei ist die aktive Arbeitsliste für API-Pushdowns. Oben stehen nur noch
offene Prüfungen. Abgeschlossene Aktivierungen und verworfene Prefixe sind
darunter kompakt dokumentiert, damit sie nicht erneut geprüft werden.

## Prüfregel

Eine API-Regel wird nur aktiviert, wenn für denselben Datentyp gilt:

```text
Positive Count + Missing Count = Baseline Count
```

Vorgaben:

- Baseline ist immer `all:all`.
- Missing-Queries immer mit `all:all` ankern.
- Kontrolltests mit `id:` durchführen, nicht mit `global_id:`.
- Count, Fehlerliste, Detailseite und Score müssen dieselbe Aussage liefern.
- Wenn eine Feldlogik für einen Datentyp bestätigt ist, darf sie für fachlich
  passende Datentypen übernommen werden.
- Nicht komplementäre Prefixe bleiben `server_scan` und werden nicht als
  Pushdown reaktiviert.

## Prüfprotokoll

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

## Aktive offene Prüfungen

### 1. Öffnungszeiten

- Kriterium: `opening_hours_missing`
- Fachliche Typen: `POI`, `Gastro`
- Positive Query: `openings:*`
- Missing Query: `all:all -openings:*`
- Wichtig: `Tour` bleibt ausgeschlossen.

Zu prüfen:

- POI: Baseline, Positive, Missing, Beispiel positiv, Beispiel negativ
- Gastro: Baseline, Positive, Missing, Beispiel positiv, Beispiel negativ

Entscheidung nach Test:

- nur aktivieren, wenn `positive + missing = baseline`
- sonst `openings:*` verwerfen und `opening_hours_missing` bei `server_scan`
  belassen

### 2. Event-Zahlungsarten

- Kriterium: `event_payment_options_missing`
- Fachlicher Typ: `Event`
- Positive Query:

```text
(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")
```

- Missing Query:

```text
all:all -(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")
```

Zu prüfen:

- Event: Baseline, Positive, Missing, Beispiel positiv, Beispiel negativ
- Detailseite muss dieselbe Zahlungsartenlogik zeigen.

### 3. Hotel-Merkmale allgemein

- Kriterium: `hotel_features_missing`
- Fachlicher Typ: `Hotel`
- Kandidat: `feature:*`
- Missing Query: `all:all -feature:*`

Hinweis:

- Nur aktivieren, wenn `feature:*` fachlich wirklich Hotel-Merkmale abbildet.
- Wenn `feature:*` zu breit ist oder nur Teilmengen trifft, verwerfen und
  `hotel_features_missing` bei `server_scan` belassen.

## Aktivierte Pushdowns

### Event-Lizenz

- Status: aktiviert am 2026-07-06
- Kriterium: `license_missing`
- Typ: `Event`
- Positive Query:

```text
attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

- Missing Query:

```text
all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

Nachweis:

- Event: Baseline 1378, Positive 1378, Missing 0, Summe 1378

Entscheidung:

- `Event` ist in `verifiedForTypes` ergänzt.

### Gastro-Küchenarten

- Status: aktiviert am 2026-07-06
- Kriterium: `gastro_cuisine_category_missing`
- Typ: `Gastro`
- Positive Query:

```text
cuisine:("deutsch" OR "italienisch" OR "vegetarisch" OR "sonstiges")
```

- Missing Query:

```text
all:all -cuisine:("deutsch" OR "italienisch" OR "vegetarisch" OR "sonstiges")
```

Nachweise für einzelne Werte:

- `cuisine:"sonstiges"`: Baseline 627, Positive 400, Missing 227, Summe 627
- `cuisine:"deutsch"`: Baseline 627, Positive 106, Missing 521, Summe 627
- `cuisine:"italienisch"`: Baseline 627, Positive 22, Missing 605, Summe 627

Entscheidung:

- Küchenarten werden wertbasiert über `cuisine:(...)` geprüft.
- `gastro_kitchen_missing` bleibt getrennt davon `server_scan`, weil allgemeine
  Küchenfelder nicht als Pushdown belastbar sind.

## Verworfene Pushdowns

Diese Prefixe nicht erneut als API-Pushdown aktivieren, solange keine neue
belastbare API-Erkenntnis vorliegt.

### Adressen

- Betroffene Kriterien: `hotel_street_missing`, `poi_street_missing`,
  `gastro_street_missing`, `event_street_missing`
- Nicht verwenden:
  - `street:*`
  - `all:all -street:*`
- Nachweis:
  - Hotel: Baseline 1222, Positive 0, Missing 0
  - Gastro: Baseline 627, Positive 0, Missing 0

### Beschreibung

- Betroffenes Kriterium: `description_missing`
- Nicht verwenden:
  - `details:*`
  - `all:all -details:*`
- Nachweis:
  - Hotel: Baseline 1222, Positive 61, Missing 26, Summe 87
  - Event: Baseline 1378, Positive 39, Missing 28, Summe 67

### Teaser

- Betroffene Kriterien: `hotel_teaser_missing`, `tour_teaser_missing`,
  `poi_teaser_missing`, `gastro_teaser_missing`, `event_teaser_missing`
- Nicht verwenden:
  - `teaser:*`
  - `all:all -teaser:*`
- Nachweis:
  - POI: Baseline 4595, Positive 0, Missing 0

### E-Mail

- Betroffene Kriterien: `hotel_email_missing`, `poi_email_missing`,
  `gastro_email_missing`, `event_email_missing`
- Nicht verwenden:
  - `email:*`
  - `all:all -email:*`
- Nachweis:
  - Hotel: Baseline 1222, Positive 15, Missing 4, Summe 19
  - POI: Baseline 4595, Positive 12, Missing 2, Summe 14

### Webseite

- Betroffene Kriterien: `hotel_website_missing`, `poi_website_missing`,
  `gastro_website_missing`, `event_website_missing`
- Nicht verwenden:
  - `web:*`
  - `all:all -web:*`
  - `url:*`
  - `all:all -url:*`
- Nachweis:
  - Hotel `web:*`: Baseline 1222, Positive 40, Missing 25, Summe 65
  - POI `web:*`: Baseline 4595, Positive 170, Missing 25, Summe 195
  - POI `url:*`: Baseline 4595, Positive 347, Missing 110, Summe 457

### Telefon

- Betroffene Kriterien: `hotel_phone_missing`, `poi_phone_missing`,
  `gastro_phone_missing`, `event_phone_missing`
- Nicht verwenden:
  - `phone:*`
  - `all:all -phone:*`
- Nachweis:
  - Hotel: Baseline 1222, Positive 0, Missing 0

### Preisinformation

- Betroffene Kriterien: `hotel_price_missing`, `poi_price_missing`,
  `event_price_missing`
- Nicht verwenden:
  - `price:*`
  - `all:all -price:*`
  - `prices:*`
  - `all:all -prices:*`
  - `PRICE_INFO:*`
  - `all:all -PRICE_INFO:*`
- Nachweis:
  - POI `PRICE_INFO:*`: Baseline 4595, Positive 2, Missing 1, Summe 3
  - POI `price:*`: Baseline 4595, Positive 41, Missing 20, Summe 61
  - POI `prices:*`: Baseline 4595, Positive 41, Missing 20, Summe 61
  - Event `price:*`: Baseline 1378, Positive 0, Missing 0, Summe 0
  - Event `PRICE_INFO:*`: Baseline 1378, Positive 0, Missing 0, Summe 0
  - Hotel `price:*`: Baseline 1222, Positive 1, Missing 0, Summe 1
  - Hotel `prices:*`: Baseline 1222, Positive 1, Missing 0, Summe 1

### Gastro-Küche allgemein

- Betroffenes Kriterium: `gastro_kitchen_missing`
- Nicht verwenden:
  - `cuisine:*`
  - `cuisineTypes:*`
  - `kitchenTimeIntervals:*`
  - `category:"<Küchenart>"` als primäre Küchenart-Logik
  - `keyword:"<Küchenart>"` als primäre Küchenart-Logik
- Nachweis:
  - Gastro `cuisine:*`: Baseline 627, Positive 21, Missing 10, Summe 31
  - Gastro `cuisineTypes:*`: Baseline 627, Positive 0, Missing 0
  - Gastro `kitchenTimeIntervals:*`: Baseline 627, Positive 0, Missing 0

## Weiterhin Server-Scan

Diese Kriterien bleiben vorerst bewusst `server_scan`:

- `image_author_missing`
- `hotel_contact_person_missing`
- `tour_author_missing`
- `tour_start_target_missing`
- `tour_season_missing`
- `tour_parking_missing`
- `gastro_kitchen_missing`

## Umsetzung nach erfolgreichem Test

In `Statistik/quality.js`:

- `method: 'api_pushdown'` setzen
- `api.verified: true`
- `api.verifiedForTypes` auf alle fachlich passenden Typen erweitern
- `positiveQuery` und `missingQuery` exakt aus dem bestätigten Test übernehmen

Danach prüfen:

- Count stimmt mit Baseline
- Fehlerliste lädt betroffene Datensätze
- Detailseite zeigt denselben Befund
- Score reagiert konsistent
