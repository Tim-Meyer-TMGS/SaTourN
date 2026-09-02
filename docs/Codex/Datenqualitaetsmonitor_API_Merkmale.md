# Datenqualitätsmerkmale für die Nutzung durch andere Apps

Stand: 2026-08-14  
Technische Quelle: `Statistik/quality.js`, `routes/quality.js`, `routes/search.js`

Betriebsprüfung am 2026-08-14: Der produktive Health-Endpunkt, ein
verifizierter API-Count (`image_missing`/`POI`) und ein Server-Scan
(`poi_phone_missing`/`POI`) antworteten jeweils mit HTTP 200.

## 1. Zweck und verbindliche Einordnung

Dieses Dokument beschreibt alle derzeit aktiven Datenqualitätsmerkmale des
SaTourN-Datenqualitätsmonitors und trennt sie in:

1. **belastbar per Destination.One-Suchabfrage filterbare Merkmale**
   (`api_pushdown`, verifiziert für den jeweiligen Datentyp),
2. **nur durch Prüfung der abgerufenen Datensätze filterbare Merkmale**
   (`server_scan`) und
3. **noch nicht belastbare API-Kandidaten**, die nicht von anderen Apps als
   API-Filter verwendet werden dürfen.

Maßgeblich ist die aktuell ausgeführte Kriterienlogik. Ältere Prüf- und
Planungsdokumente können davon abweichen.

Ein API-Pushdown gilt im Projekt nur dann als belastbar, wenn für denselben
Datentyp nachgewiesen wurde:

```text
Anzahl vorhanden + Anzahl fehlend = Anzahl all:all
```

Negative Abfragen werden deshalb immer mit `all:all` verankert.

## 2. API-Endpunkte

Produktive Basis-URL:

```text
https://satourn.onrender.com
```

### 2.1 Empfohlener Endpunkt für die Anzahl fehlender Merkmale

```http
GET /api/quality/count?criterionId=CRITERION_ID&type=TYPE&query=KONTEXT_QUERY
```

Beispiel:

```text
https://satourn.onrender.com/api/quality/count?criterionId=image_missing&type=POI&query=all%3Aall
```

Dieser Endpunkt funktioniert nur für die in Kapitel 4 als `api_pushdown`
aufgeführten Kombinationen aus Kriterium und Datentyp. Für `server_scan`
antwortet er absichtlich mit HTTP 400.

Wichtige Antwortfelder:

```json
{
  "count": 123,
  "criterion": {
    "id": "image_missing",
    "method": "api_pushdown",
    "verified": true,
    "positiveQuery": "media:*",
    "missingQuery": "all:all -media:*"
  },
  "diagnostic": {
    "query": "(all:all) AND (all:all -media:*)",
    "verified": true,
    "verifiedForType": true
  }
}
```

### 2.2 Empfohlener Endpunkt für Datensatzlisten

```http
GET /api/quality/scan?criterionId=CRITERION_ID&type=TYPE&query=KONTEXT_QUERY&limit=50&scanPageSize=100&maxPages=5
```

API-Pushdown-Beispiel:

```text
https://satourn.onrender.com/api/quality/scan?criterionId=image_missing&type=POI&query=all%3Aall&limit=50
```

Server-Scan-Beispiel:

```text
https://satourn.onrender.com/api/quality/scan?criterionId=poi_phone_missing&type=POI&query=all%3Aall&limit=50&scanPageSize=200&maxPages=20
```

Für Folgeseiten muss der zurückgegebene Wert `page.nextCursor` erneut als
`cursor` übergeben werden. Eine Liste ist erst vollständig, wenn
`page.complete === true` und `page.nextCursor === null` gilt. Die Zustände
`scan_budget_exhausted`, `result_limit_reached`, `timeout` oder
`pagination_repeated` bedeuten, dass das Ergebnis noch nicht vollständig ist.

### 2.3 Direkte Suchabfrage über den geschützten Proxy

```http
GET /api/search?type=TYPE&query=META_QUERY&limit=200&offset=0
```

Beispiel für POIs ohne Bild:

```text
https://satourn.onrender.com/api/search?type=POI&query=all%3Aall%20-media%3A%2A&limit=200&offset=0
```

Der Proxy hält den Destination.One-Lizenzschlüssel serverseitig. Der Parameter
heißt am SaTourN-Proxy `query`; nur beim direkten Destination.One-Endpunkt
heißt er `q`.

### 2.4 Direkter Destination.One-Endpunkt

Nur verwenden, wenn die andere App einen eigenen, geheim gehaltenen
Lizenzschlüssel besitzt:

```text
https://meta.et4.de/rest.ashx/search/?experience=statistik_sachsen&licensekey=EIGENER_LICENSEKEY&type=POI&q=all%3Aall%20-media%3A%2A&limit=200&offset=0&template=ET2022A.json
```

Ein Lizenzschlüssel darf nicht in einem öffentlich ausgelieferten Frontend
gespeichert werden.

## 3. Parameter und Datentypen

Unterstützte Qualitäts-Datentypen:

```text
POI, Gastro, Tour, Hotel, Event, Package
```

| Parameter | Bedeutung |
|---|---|
| `criterionId` | Stabile technische ID aus den Tabellen dieses Dokuments |
| `type` | Genau ein Destination.One-Datentyp pro Anfrage |
| `query` | Zusätzlicher Gebiets-, Orts- oder Arbeitskontext; `all:all` bedeutet ohne weitere fachliche Eingrenzung |
| `limit` | Ergebnisgröße, maximal 200 |
| `offset` / `cursor` | Startposition für die Seitennavigation |
| `scanPageSize` | Beim Server-Scan pro Quellseite abzurufende Datensätze, maximal 200 |
| `maxPages` | Scan-Budget pro Anfrage, maximal 20 |

Bei einem zusätzlichen Kontext kombiniert der Server die Abfragen logisch:

```text
(KONTEXT_QUERY) AND (MERKMAL_QUERY)
```

Alle Query-Werte müssen als UTF-8 URL-encoded übergeben werden. Das gilt
insbesondere für `ÖPNV`, Umlaute, Leerzeichen, Anführungszeichen und
Klammern.

## 4. Belastbar per API filterbare Merkmale

Die folgende Tabelle ist die vollständige Allowlist. Nur diese Kombinationen
dürfen von einer anderen App als verifizierte META-Filter behandelt werden.
Die **Vorhanden-Abfrage** findet Datensätze mit mindestens einem der genannten
Werte. Die **Fehlt-Abfrage** findet die komplementäre Menge.

| `criterionId` | Merkmal | Typ(en) | Vorhanden-Abfrage | Fehlt-Abfrage |
|---|---|---|---|---|
| `license_missing` | Gültige Open-Data-Lizenz | POI, Gastro, Tour, Hotel, Event, Package | `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)` | `all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)` |
| `image_missing` | Mindestens ein Bild/Medium | POI, Gastro, Tour | `media:*` | `all:all -media:*` |
| `public_transport_missing` | Merkmal „Mit ÖPNV erreichbar“ | POI, Gastro, Tour, Hotel, Event | `feature:"Mit ÖPNV erreichbar"` | `all:all -feature:"Mit ÖPNV erreichbar"` |
| `hotel_language_english_missing` | Mindestens eine geprüfte Fremdsprache | Hotel | `(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch" OR feature:"Französisch")` | `all:all -(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch" OR feature:"Französisch")` |
| `hotel_payment_cash_missing` | Mindestens eine geprüfte Zahlungsart | Hotel | `(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")` | `all:all -(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")` |
| `hotel_parking_feature_missing` | Mindestens ein geprüfter Parkhinweis | Hotel | `(feature:"Parkplätze" OR feature:"Parkgarage / Tiefgarage" OR feature:"Öffentliches Parkhaus fußläufig" OR feature:"Busparkplatz (-plätze)" OR feature:"E-Ladesäulen")` | `all:all -(feature:"Parkplätze" OR feature:"Parkgarage / Tiefgarage" OR feature:"Öffentliches Parkhaus fußläufig" OR feature:"Busparkplatz (-plätze)" OR feature:"E-Ladesäulen")` |
| `poi_parking_feature_missing` | Merkmal „Parkplätze vorhanden“ | POI | `feature:"Parkplätze vorhanden"` | `all:all -feature:"Parkplätze vorhanden"` |
| `poi_payment_options_missing` | Mindestens eine geprüfte Zahlungsart | POI | `(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"kontaktlose Zahlung")` | `all:all -(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"kontaktlose Zahlung")` |
| `poi_languages_missing` | Mindestens eine geprüfte Fremdsprache | POI | `(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch")` | `all:all -(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch")` |
| `poi_suitability_missing` | Mindestens eine geprüfte Eignungsangabe | POI | `(feature:"Familie" OR feature:"für Gruppen" OR feature:"Senioren geeignet" OR feature:"für Schulklassen" OR feature:"für jedes Wetter")` | `all:all -(feature:"Familie" OR feature:"für Gruppen" OR feature:"Senioren geeignet" OR feature:"für Schulklassen" OR feature:"für jedes Wetter")` |
| `gastro_payment_options_missing` | Mindestens eine geprüfte Zahlungsart | Gastro | `(feature:"Barzahlung" OR feature:"EC-Karte")` | `all:all -(feature:"Barzahlung" OR feature:"EC-Karte")` |
| `gastro_languages_missing` | Mindestens eine geprüfte Fremdsprache | Gastro | `(feature:"Englisch" OR feature:"Polnisch")` | `all:all -(feature:"Englisch" OR feature:"Polnisch")` |
| `gastro_parking_feature_missing` | Merkmal „PKW-Parkplatz am Haus“ | Gastro | `feature:"PKW-Parkplatz am Haus"` | `all:all -feature:"PKW-Parkplatz am Haus"` |
| `gastro_cuisine_category_missing` | Mindestens eine geprüfte Küchenart | Gastro | `(cuisine:"deutsch" OR cuisine:"italienisch" OR cuisine:"vegetarisch" OR cuisine:"sonstiges")` | `all:all -(cuisine:"deutsch" OR cuisine:"italienisch" OR cuisine:"vegetarisch" OR cuisine:"sonstiges")` |
| `booking_link_missing` | Hotel ist als buchbar gekennzeichnet | Hotel | `keyword:"Bookable"` | `all:all -keyword:"Bookable"` |

### 4.1 Beispiel-URLs je Query-Familie

Open-Data-Lizenz fehlt bei Events:

```text
https://satourn.onrender.com/api/quality/count?criterionId=license_missing&type=Event&query=all%3Aall
```

ÖPNV-Merkmal fehlt bei Hotels:

```text
https://satourn.onrender.com/api/quality/scan?criterionId=public_transport_missing&type=Hotel&query=all%3Aall&limit=50
```

Keine der geprüften Fremdsprachen bei POIs:

```text
https://satourn.onrender.com/api/quality/count?criterionId=poi_languages_missing&type=POI&query=all%3Aall
```

Keine der geprüften Küchenarten bei Gastro-Datensätzen:

```text
https://satourn.onrender.com/api/quality/scan?criterionId=gastro_cuisine_category_missing&type=Gastro&query=all%3Aall&limit=50
```

Hotel ohne Buchbarkeitskennzeichen:

```text
https://satourn.onrender.com/api/quality/count?criterionId=booking_link_missing&type=Hotel&query=all%3Aall
```

### 4.2 Wichtige fachliche Grenzen

- Eine OR-Liste bedeutet immer: **mindestens einer** der aufgeführten Werte
  ist vorhanden. Sie beweist nicht, dass alle Werte gepflegt sind.
- `license_missing` bewertet nur die vier zugelassenen Open-Data-Lizenzwerte.
  Eine andere Lizenzangabe zählt für dieses Kriterium als nicht erfüllt.
- `image_missing` prüft das Vorhandensein von Medien, nicht Urheberangaben,
  Bildqualität oder Nutzungsrechte.
- `booking_link_missing` ist nur für `Hotel` als API-Pushdown belastbar. Für
  `Package` ist dasselbe Kriterium ein Server-Scan.
- Beim POI-Kriterium `poi_payment_options_missing` existieren fachliche
  Kategorieausnahmen. `/api/quality/count` zählt die rohe fehlende
  Feature-Menge und kann diese Ausnahmen nicht abziehen. Für die fachlich
  bereinigte Datensatzliste ist `/api/quality/scan` zu verwenden; eine exakt
  bereinigte Anzahl muss aus einem vollständigen Scan gebildet werden.

## 5. Nur serverseitig filterbare Merkmale

Diese Merkmale besitzen keinen belastbaren META-Pushdown. Der Server ruft
Datensätze im gewählten Arbeitskontext ab und prüft deren Felder lokal. Die
Spalte **geprüfte Daten** beschreibt die aktuelle Feldlogik, nicht einen
zulässigen META-Query-Prefix.

### 5.1 Datentypübergreifend

| `criterionId` | Merkmal | Typ(en) | Serverseitig geprüfte Daten |
|---|---|---|---|
| `opening_hours_missing` | Öffnungszeiten fehlen | POI, Gastro | `texts[rel=openings]`, `timeIntervals`, `alwaysOpen` |
| `description_missing` | Beschreibung fehlt | POI, Gastro, Tour, Hotel, Event | `texts[rel=details]` bzw. normalisierte Beschreibungsfelder |
| `image_author_missing` | Bildurheber fehlt | POI, Tour, Hotel, Event, Gastro, Package | Medienobjekte und deren `copyrightText`; nur relevant, wenn ein prüfbares Bild vorhanden ist |

Für `image_author_missing` verwendet der Server den verifizierten Vorfilter
`media:*`, prüft den Urheber aber weiterhin lokal. Die Prefixe
`media_objects.copyrightText:*` und `copyrightText:*` sind nicht verifiziert.

### 5.2 Hotel

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `hotel_street_missing` | Straße/Anschrift fehlt | `street`, `address.street`, `addresses.street` |
| `hotel_phone_missing` | Telefon fehlt | `phone`, `phone2`, `addresses.phone` |
| `hotel_teaser_missing` | Teaser fehlt | `texts[rel=teaser]` |
| `hotel_email_missing` | E-Mail fehlt | `email`, `emailRequest`, `addresses.email` |
| `hotel_website_missing` | Webseite fehlt | `web`, `website`, `url`, `addresses.web` |
| `hotel_features_missing` | Allgemeine Merkmale fehlen | `features`, `features_old` |
| `hotel_price_missing` | Preisinformation fehlt | `prices`, `price`, `texts[rel=PRICE_INFO]`, `texts[rel=PRICE_REDUCEDINFO]` |
| `hotel_contact_person_missing` | Ansprechperson fehlt | `addresses[rel=contact_person]` |

### 5.3 Tour

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `tour_teaser_missing` | Teaser fehlt | `texts[rel=teaser]` |
| `tour_author_missing` | Autor oder Organisation fehlt | `author`, `addresses[rel=author]`, `addresses[rel=organisation]` |
| `tour_start_target_missing` | Start- und Zielbeschreibung fehlt | `texts[rel=start]`, `texts[rel=target]`, `texts[rel=directions]` |
| `tour_season_missing` | Jahreszeitangabe fehlt | `seasons` |
| `tour_parking_missing` | Parkhinweis fehlt | `texts[rel=TourMoreInfos_parking]` oder Parkhinweis in Richtungs-/Anreisetexten |

### 5.4 POI

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `poi_street_missing` | Straße/Anschrift fehlt | `street`, `address.street`, `addresses.street` |
| `poi_teaser_missing` | Teaser fehlt | `texts[rel=teaser]` |
| `poi_email_missing` | E-Mail fehlt | `email`, `addresses.email` |
| `poi_website_missing` | Webseite fehlt | `web`, `website`, `url`, `addresses.web` |
| `poi_phone_missing` | Telefon fehlt | `phone`, `phone2`, `addresses.phone` |
| `poi_price_missing` | Preisinformation fehlt | `prices`, `price`, `texts[rel=PRICE_INFO]`, `texts[rel=PRICE_REDUCEDINFO]` |

Bei mehreren POI-Kriterien werden definierte Kategorien fachlich ausgenommen.
Deshalb darf die fehlende Feldbelegung nicht ohne die zentrale
Kriterienauswertung als Pflegefehler interpretiert werden.

### 5.5 Gastro

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `gastro_street_missing` | Straße/Anschrift fehlt | `street`, `address.street`, `addresses.street` |
| `gastro_phone_missing` | Telefon fehlt | `phone`, `phone2`, `addresses.phone` |
| `gastro_teaser_missing` | Teaser fehlt | `texts[rel=teaser]` |
| `gastro_email_missing` | E-Mail fehlt | `email`, `addresses.email` |
| `gastro_website_missing` | Webseite fehlt | `web`, `website`, `url`, `addresses.web` |
| `gastro_kitchen_missing` | Allgemeine Kücheninformation fehlt | `kitchenTimeIntervals`, `features`, `features_old` |

### 5.6 Event

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `event_street_missing` | Straße/Anschrift fehlt | `street`, `address.street`, `addresses.street` |
| `event_phone_missing` | Telefon fehlt | `phone`, `phone2`, `addresses.phone` |
| `event_teaser_missing` | Teaser fehlt | `texts[rel=teaser]` |
| `event_email_missing` | E-Mail fehlt | `email`, `addresses.email` |
| `event_website_missing` | Webseite fehlt | `web`, `website`, `url`, `addresses.web` |
| `event_price_missing` | Preisinformation fehlt | `prices`, `price`, `texts[rel=PRICE_INFO]`, `texts[rel=PRICE_REDUCEDINFO]` |
| `event_payment_options_missing` | Zahlungsinformation fehlt | `paymentMethods`, `payment_old`, `features` sowie validierte Zahlungswerte |

### 5.7 Package

| `criterionId` | Merkmal | Serverseitig geprüfte Daten |
|---|---|---|
| `booking_link_missing` | Buchungs-, Reservierungs- oder Ticketlink fehlt | Medienobjekte mit Relation `booking` und deren URL |

## 6. Nicht als API-Filter verwenden

Die folgenden Abfragen wurden verworfen oder sind noch nicht verifiziert. Sie
dürfen nicht als belastbare Filter in eine andere App übernommen werden.

| Thema | Nicht verwenden | Grund/Status |
|---|---|---|
| Öffnungszeiten | `openings:*`, `all:all -openings:*` | Für POI/Gastro noch nicht als komplementärer Pushdown bestätigt |
| Straße/Anschrift | `street:*`, `all:all -street:*` | Nicht komplementär zur Baseline |
| Beschreibung | `details:*`, `all:all -details:*` | Nicht komplementär zur Baseline |
| Teaser | `teaser:*`, `all:all -teaser:*` | Liefert keine belastbare Gesamtmenge |
| E-Mail | `email:*`, `all:all -email:*` | Nicht komplementär zur Baseline |
| Webseite | `web:*`, `url:*` und jeweilige Negation | Nicht komplementär zur Baseline |
| Telefon | `phone:*`, `all:all -phone:*` | Liefert keine belastbare Gesamtmenge |
| Preis | `price:*`, `prices:*`, `PRICE_INFO:*` und jeweilige Negation | Nicht komplementär zur Baseline |
| Hotel-Merkmale allgemein | `feature:*`, `all:all -feature:*` | Noch unbestätigt und fachlich zu breit |
| Event-Zahlungsarten | Feature-OR-Liste der Zahlungsarten | Noch nicht für Event verifiziert |
| Gastro-Küche allgemein | `cuisine:*`, `cuisineTypes:*`, `kitchenTimeIntervals:*` | Keine belastbare allgemeine Küchenlogik; nur die verifizierte `cuisine:(...)`-Werteliste aus Kapitel 4 ist zulässig |
| Bildurheber | `media_objects.copyrightText:*`, `copyrightText:*` | Nicht verifiziert; nur `media:*` als Vorfilter zulässig |
| Package-Buchungslink | `booking:*` bzw. Hotel-Query `keyword:"Bookable"` auf Package | Nicht für Package verifiziert |

## 7. Integrationsregeln für eine andere App

1. Die andere App sollte bevorzugt `criterionId` und die Quality-Endpunkte
   verwenden, statt META-Queries selbst zu duplizieren.
2. Vor jeder Verarbeitung müssen `criterion.method === "api_pushdown"`,
   `criterion.verified === true` und
   `diagnostic.verifiedForType === true` geprüft werden.
3. Für eine Datensatzliste ist `/api/quality/scan` fachlich sicherer als eine
   rohe `/api/search`-Abfrage, weil der Scan jeden Treffer noch einmal gegen
   die zentrale Kriterienlogik und Kategorieausnahmen prüft.
4. Ein Server-Scan ist eine paginierte Auswertung, kein sofortiger globaler
   Datenbankfilter. Ergebnisse dürfen nur bei `page.complete === true` als
   vollständig bezeichnet werden.
5. Ein Datentyp darf nicht durch einen fachlich ähnlichen Datentyp ersetzt
   werden. Verifizierung gilt immer nur für die in Kapitel 4 genannten Typen.
6. Die Query-Wertelisten sind eine versionierte Allowlist. Weitere Feature-,
   Cuisine-, Kategorie- oder Lizenzwerte sind nicht automatisch verifiziert.
7. Der Kontext sollte explizit übergeben werden. `all:all` kann sehr große
   Server-Scans verursachen; für produktive Pflegeaufgaben ist eine Regions-
   oder Ortsquery vorzuziehen.

## 8. Kurzübersicht

| Klasse | Nutzung |
|---|---|
| Verifizierter API-Pushdown | `/api/quality/count` für Anzahl und `/api/quality/scan` für geprüfte Trefferliste |
| Server-Scan | Nur `/api/quality/scan`; vollständige Cursor-Paginierung und Abschlussstatus beachten |
| Unverifizierter Kandidat/verworfenes Prefix | Nicht integrieren; bis zu einer erneuten positiven Komplementprüfung als `server_scan` behandeln |
