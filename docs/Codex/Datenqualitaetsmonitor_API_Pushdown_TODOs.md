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

Status: verworfen am 2026-07-06

- Kriterien: `hotel_street_missing`, `poi_street_missing`,
  `gastro_street_missing`, `event_street_missing`
- Positive Query: `street:*`
- Missing Query: `all:all -street:*`

Prüfergebnis:

- Hotel: Baseline 1222, Positive 0, Missing 0
- Gastro: Baseline 627, Positive 0, Missing 0

Bewertung:

- `street:*` ist nicht komplementär zur Baseline.
- `street` ist im ET2022A-Export sichtbar, aber in der META-Suche dieser
  Experience kein belastbarer Suchprefix.
- POI und Event wurden nicht separat geprüft; wegen des übereinstimmenden
  Verhaltens bei Hotel und Gastro wird `street:*` auch dort nicht aktiviert.

Entscheidung:

- `hotel_street_missing`, `poi_street_missing`, `gastro_street_missing` und
  `event_street_missing` bleiben `server_scan`.
- Nicht verwenden: `street:*`
- Nicht verwenden: `all:all -street:*`

### 2. Beschreibung fehlt

Status: verworfen am 2026-07-06

- Kriterium: `description_missing`
- Positive Query: `details:*`
- Missing Query: `all:all -details:*`

Prüfergebnis:

- Hotel: Baseline 1222, Positive 61, Missing 26, Summe 87
- Event: Baseline 1378, Positive 39, Missing 28, Summe 67

Bewertung:

- `details:*` ist nicht komplementär zur Baseline.
- Die Query bildet nur einen kleinen Teil der Datensatzmenge ab.
- Wegen der typübergreifenden Feldannahme wird `details:*` nicht für weitere
  Datentypen als API-Pushdown priorisiert.

Entscheidung:

- `description_missing` bleibt für `POI`, `Gastro`, `Tour`, `Hotel` und
  `Event` `server_scan`.
- Nicht verwenden: `details:*`
- Nicht verwenden: `all:all -details:*`

### 3. Teaser fehlt

Status: verworfen am 2026-07-06

- Kriterien: `hotel_teaser_missing`, `tour_teaser_missing`,
  `poi_teaser_missing`, `gastro_teaser_missing`, `event_teaser_missing`
- Positive Query: `teaser:*`
- Missing Query: `all:all -teaser:*`

Prüfergebnis:

- POI: Baseline 4595, Positive 0, Missing 0

Bewertung:

- `teaser:*` ist nicht komplementär zur Baseline.
- `teaser` kann im ET2022A-Export als Textrel sichtbar sein, ist in der
  META-Suche aber kein belastbarer Pushdown-Prefix.

Entscheidung:

- `hotel_teaser_missing`, `tour_teaser_missing`, `poi_teaser_missing`,
  `gastro_teaser_missing` und `event_teaser_missing` bleiben `server_scan`.
- Nicht verwenden: `teaser:*`
- Nicht verwenden: `all:all -teaser:*`

### 4. E-Mail fehlt

Status: verworfen am 2026-07-06

- Kriterien: `hotel_email_missing`, `poi_email_missing`,
  `gastro_email_missing`, `event_email_missing`
- Geprüfte Positive Query: `email:*`
- Geprüfte Missing Query: `all:all -email:*`

Prüfergebnis:

- Hotel: Baseline 1222, Positive 15, Missing 4, Summe 19
- POI: Baseline 4595, Positive 12, Missing 2, Summe 14

Bewertung:

- `email:*` ist nicht komplementär zur Baseline.
- Das Feld kann im Export oder in Adressobjekten vorkommen, wird aber über die
  META-Suche nicht vollständig abgebildet.

Entscheidung:

- `hotel_email_missing`, `poi_email_missing`, `gastro_email_missing` und
  `event_email_missing` bleiben `server_scan`.
- Nicht verwenden: `email:*`
- Nicht verwenden: `all:all -email:*`

### 5. Webseite fehlt

Status: verworfen am 2026-07-06

- Kriterien: `hotel_website_missing`, `poi_website_missing`,
  `gastro_website_missing`, `event_website_missing`
- Geprüfte Positive Querys: `web:*`, `url:*`
- Geprüfte Missing Querys: `all:all -web:*`, `all:all -url:*`

Prüfergebnis:

- Hotel `web:*`: Baseline 1222, Positive 40, Missing 25, Summe 65
- POI `web:*`: Baseline 4595, Positive 170, Missing 25, Summe 195
- POI `url:*`: Baseline 4595, Positive 347, Missing 110, Summe 457

Bewertung:

- Weder `web:*` noch `url:*` sind komplementär zur Baseline.
- Website-Daten können im Export vorhanden sein, werden über die META-Suche
  aber nicht vollständig abgebildet.

Entscheidung:

- `hotel_website_missing`, `poi_website_missing`,
  `gastro_website_missing` und `event_website_missing` bleiben `server_scan`.
- Nicht verwenden: `web:*`
- Nicht verwenden: `all:all -web:*`
- Nicht verwenden: `url:*`
- Nicht verwenden: `all:all -url:*`

### 6. Telefon fehlt

Status: verworfen am 2026-07-06

- Kriterien: `hotel_phone_missing`, `poi_phone_missing`,
  `gastro_phone_missing`, `event_phone_missing`
- Geprüfte Positive Query: `phone:*`
- Geprüfte Missing Query: `all:all -phone:*`

Prüfergebnis:

- Hotel: Baseline 1222, Positive 0, Missing 0, Summe 0

Bewertung:

- `phone:*` ist nicht komplementär zur Baseline.
- Beide Querys liefern 0 Treffer, obwohl die Baseline 1222 Hotels enthält.

Entscheidung:

- `hotel_phone_missing`, `poi_phone_missing`, `gastro_phone_missing` und
  `event_phone_missing` bleiben `server_scan`.
- Nicht verwenden: `phone:*`
- Nicht verwenden: `all:all -phone:*`

## Priorität 2 - Open Data und wichtige KPIs

### 7. Event-Lizenz

Status: aktiviert am 2026-07-06

- Kriterium: `license_missing`
- Datentyp-Test: `Event`
- Positive Query: `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`
- Missing Query: `all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`

Prüfergebnis:

- Event: Baseline 1378, Positive 1378, Missing 0, Summe 1378

Bewertung:

- Die Query ist komplementär zur Baseline.
- Alle aktuell geprüften Events sind Open-Data-fähig; die Missing-Query liefert
  deshalb 0 Treffer, bleibt aber technisch korrekt.

Entscheidung:

- `license_missing` ist für `Event` als API-Pushdown aktiviert.
- `Event` ist in `verifiedForTypes` ergänzt.

### 8. Öffnungszeiten

- Kriterium: `opening_hours_missing`
- Fachliche Typen: `POI`, `Gastro`
- Positive Query: `openings:*`
- Missing Query: `all:all -openings:*`
- Wichtig: `Tour` bleibt ausgeschlossen.

### 9. Preisinformation

Status: verworfen am 2026-07-06

- Kriterien: `hotel_price_missing`, `poi_price_missing`,
  `event_price_missing`
- Geprüfte Positive Querys: `price:*`, `prices:*`, `PRICE_INFO:*`
- Geprüfte Missing Querys: `all:all -price:*`, `all:all -prices:*`,
  `all:all -PRICE_INFO:*`

Prüfergebnis:

- POI `PRICE_INFO:*`: Baseline 4595, Positive 2, Missing 1, Summe 3
- POI `price:*`: Baseline 4595, Positive 41, Missing 20, Summe 61
- POI `prices:*`: Baseline 4595, Positive 41, Missing 20, Summe 61
- Event `price:*`: Baseline 1378, Positive 0, Missing 0, Summe 0
- Event `PRICE_INFO:*`: Baseline 1378, Positive 0, Missing 0, Summe 0
- Hotel `price:*`: Baseline 1222, Positive 1, Missing 0, Summe 1
- Hotel `prices:*`: Baseline 1222, Positive 1, Missing 0, Summe 1

Bewertung:

- Keiner der geprüften Preis-Prefixe ist komplementär zur jeweiligen Baseline.
- Die Querys liefern entweder 0/0 oder decken nur einen sehr kleinen Teil der
  Gesamtmenge ab.

Entscheidung:

- `hotel_price_missing`, `poi_price_missing` und `event_price_missing` bleiben
  `server_scan`.
- Nicht verwenden: `price:*`
- Nicht verwenden: `all:all -price:*`
- Nicht verwenden: `prices:*`
- Nicht verwenden: `all:all -prices:*`
- Nicht verwenden: `PRICE_INFO:*`
- Nicht verwenden: `all:all -PRICE_INFO:*`

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

Status: teilweise aktiviert am 2026-07-06

Getrennte fachliche Entscheidung:

- `gastro_cuisine_category_missing`: als wertbasierter API-Pushdown über
  `cuisine:(...)` aktiviert
- `gastro_kitchen_missing`: bleibt `server_scan`, weil allgemeine Küchenfelder
  nicht als Pushdown belastbar sind

Verworfen:

- `cuisine:*`
- `cuisineTypes:*`
- `kitchenTimeIntervals:*`
- `category:"<Küchenart>"` als primäre Küchenart-Logik
- `keyword:"<Küchenart>"` als primäre Küchenart-Logik

Prüfergebnis verworfene Feldtests:

- Gastro `cuisine:*`: Baseline 627, Positive 21, Missing 10, Summe 31
- Gastro `cuisineTypes:*`: Baseline 627, Positive 0, Missing 0, Summe 0
- Gastro `kitchenTimeIntervals:*`: Baseline 627, Positive 0, Missing 0,
  Summe 0

Bestätigte wertbasierte Tests:

- Gastro `cuisine:"sonstiges"`: Baseline 627, Positive 400, Missing 227,
  Summe 627
- Gastro `cuisine:"deutsch"`: Baseline 627, Positive 106, Missing 521,
  Summe 627
- Gastro `cuisine:"italienisch"`: Baseline 627, Positive 22, Missing 605,
  Summe 627
- Gastro `cuisine:"regional"`: technisch komplementär, aber fachlich nicht als
  einzelnes Pflichtkriterium aktiviert

Aktivierte Positive Query:

```text
cuisine:("deutsch" OR "italienisch" OR "vegetarisch" OR "sonstiges")
```

Aktivierte Missing Query:

```text
all:all -cuisine:("deutsch" OR "italienisch" OR "vegetarisch" OR "sonstiges")
```

Entscheidung:

- `gastro_cuisine_category_missing` nutzt künftig die bestätigte
  `cuisine`-OR-Liste statt `category`.
- `gastro_kitchen_missing` bleibt `server_scan`.

## Voraussichtlich Server-Scan behalten

Diese Kriterien nur weiter prüfen, wenn konkrete API-Felder gefunden werden:

- `image_author_missing`
- `hotel_contact_person_missing`
- `tour_author_missing`
- `tour_start_target_missing`
- `tour_season_missing`
- `tour_parking_missing`
- `gastro_kitchen_missing`

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
