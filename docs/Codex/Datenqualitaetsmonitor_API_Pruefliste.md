# Datenqualitätsmonitor - API-Prüfliste

Stand: 2026-06-11

Diese Datei sammelt die API-Anfragen, die fachlich und technisch geprüft
werden sollen, bevor neü Kriterien in `qualityCriteria` und damit in Score,
Pflegeaufgaben, Listen und Detailseite aktiviert werden.

## Prüfprinzip

Pro Kriterium und Datentyp bitte mindestens prüfen:

- Positive Qüry liefert Datensätze, bei denen das Feld vorhanden ist.
- Missing Qüry liefert Datensätze, bei denen das Feld wirklich fehlt.
- Ein positiver und ein negativer Beispieldatensatz werden mit `global_id`
  dokumentiert.
- Count, Fehlerliste und Detailansicht zeigen denselben Befund.
- Erst danach darf ein `apiCandidate` als aktive Regel umgesetzt werden.

Wichtig: Reine Negativabfragen sollen mit `all:all` kombiniert werden. Das
kommt aus der Meta Qüry Language und verhindert unklare negative-only Qüries.

## Reqüst-Vorlagen

### Direkt gegen Destination.One / eT4

```text
https://meta.et4.de/rest.ashx/search/ET2014A.json/?experience=DESTINATION_ONE_EXPERIENCE&licensekey=LICENSEKEY&type=TYPE&q=QUERY&limit=10&offset=0&mkt=de-DE
```

### Über den Render-Proxy

Die konkrete Proxy-URL kann je nach Parameterstruktur im Frontend variieren.
Als Orientierung:

```text
https://satourn.onrender.com/api/search?type=TYPE&q=QUERY&limit=10&offset=0
```

Wenn ein Gebiet oder Ort geprüft wird, dieselben Kontextparameter wie im
Frontend ergänzen. Die technische Aktivierung darf nur mit derselben
Kontextlogik erfolgen, die später auch Count und Liste verwenden.

## Einzutragende Nachweise

Pro Test bitte eintragen:

```text
Geprüft am:
Datentyp:
Qüry:
Count:
Positiver Beispiel-Datensatz global_id:
Negativer Beispiel-Datensatz global_id:
Detailseite stimmt? ja/nein
Bemerkung:
Entscheidung: aktivieren / weiter prüfen / verwerfen
```

## API-Kandidaten

### 1. Strasse fehlt - Hotel

- Fachkriterium: `hotel_street`
- Datentyp: `Hotel`
- Positive Qüry:

```text
street:*
```

- Missing Qüry:

```text
all:all -street:*
```

Zu prüfen:

- Stimmt `street:*` mit sichtbarer Anschrift im Datensatz überein?
- Liefert `all:all -street:*` echte Hotels ohne Strasse?
- Reicht `street` oder braucht der Datensatz intern ein anderes Adressfeld?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 2. Strasse fehlt - POI

- Fachkriterium: `poi_street`
- Datentyp: `POI`
- Positive Qüry:

```text
street:*
```

- Missing Qüry:

```text
all:all -street:*
```

Zu prüfen:

- Gibt es fachlich erlaubte POIs ohne Strasse, z. B. Naturpunkte?
- Falls ja, braucht das Kriterium Ausschlussregeln nach Kategorie.

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 3. Strasse fehlt - Gastro

- Fachkriterium: `gastro_street`
- Datentyp: `Gastro`
- Positive Qüry:

```text
street:*
```

- Missing Qüry:

```text
all:all -street:*
```

Zu prüfen:

- Stimmt das Feld mit der sichtbaren Gastro-Anschrift überein?
- Gibt es Importqüllen, bei denen die Strasse anders gemappt wird?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 4. Strasse fehlt - Event

- Fachkriterium: `event_street`
- Datentyp: `Event`
- Positive Qüry:

```text
street:*
```

- Missing Qüry:

```text
all:all -street:*
```

Zu prüfen:

- Bezieht sich `street` bei Events auf den Veranstaltungsort?
- Sind Online-Events oder ortslose Events fachlich auszuschliessen?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 5. Beschreibung fehlt - Hotel

- Fachkriterium: `hotel_details`
- Datentyp: `Hotel`
- Positive Qüry:

```text
details:*
```

- Missing Qüry:

```text
all:all -details:*
```

Zu prüfen:

- Ist `details:*` für Hotels verfügbar?
- Entspricht `details` dem Beschreibungstext, der in der Detailseite angezeigt
  wird?
- Gibt es Hotels mit Teaser, aber ohne Details, die trotzdem als fehlende
  Beschreibung gelten sollen?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 6. Beschreibung fehlt - Event

- Fachkriterium: `event_details`
- Datentyp: `Event`
- Positive Qüry:

```text
details:*
```

- Missing Qüry:

```text
all:all -details:*
```

Zu prüfen:

- Ist `details:*` für Events verfügbar?
- Gibt es Events, bei denen nur Termin- oder Kurztextfelder vorhanden sind?
- Muss eine Beschreibung für Events über `details` oder ein anderes Feld
  bewertet werden?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 7. Event-Lizenz fehlt

- Fachkriterium: `event_license`
- Datentyp: `Event`
- Positive Qüry:

```text
attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

- Missing Qüry:

```text
all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

Zu prüfen:

- Funktioniert `attribute_license` bei Events genauso wie bei POI, Gastro,
  Tour, Hotel und Package?
- Werden Events ohne Open-Data-Lizenz korrekt als nicht Open-Data-fähig
  erkannt?
- Muss Event-Lizenz fachlich in die Open-Data-Statistik aufgenommen werden?

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 8. Geo-Information fehlt

- Fachkriterium: `geo_missing`
- Datentypen: `POI`, `Gastro`, `Tour`, `Hotel`, `Event`
- Positive Qüry:

```text
lat:* AND lon:*
```

- Missing Qüry:

```text
all:all AND (-lat:* OR -lon:*)
```

Zu prüfen:

- Werden Datensätze ohne Koordinaten überhaupt in der normalen Suche
  ausgegeben?
- Wenn nein, bleibt das Kriterium `source_guarded` und wird nicht als normale
  Pflegeaufgabe aktiviert.
- Wenn ja, prüfen, ob `lat` und `lon` reichen oder weitere Geo-Felder
  relevant sind.

Nachweis je Datentyp:

```text
Datentyp:
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 9. Tour-Basisdaten unvollständig

- Fachkriterium: `touristtrip_incomplete`
- Datentyp: `Tour`
- Positive Qüry:

```text
length:[1 TO *] AND duration:[1 TO *]
```

- Missing Qüry:

```text
all:all AND (-length:* OR -duration:*)
```

Zu prüfen:

- Lässt sich fehlende Länge oder Daür per API sicher finden?
- Reicht das fachlich nicht aus, weil auch Route, Geometrie, Start/Ziel oder
  weitere Tour-Basisdaten fehlen können?
- Falls nur ein Teil prüfbar ist, als separates technisches Teilkriterium
  dokumentieren, nicht als vollständige Tour-Basisdaten-Regel aktivieren.

Nachweis:

```text
Geprüft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

## Bereits aktive API-Regeln zum Gegencheck

Diese Regeln sind bereits aktiv, können aber beim Testen als Vergleich dienen.
Bitte nicht ohne konkreten Grund umbaün.

### Öffnungszeiten fehlen

- Kriterium: `opening_hours_missing`
- Datentypen: `POI`, `Gastro`
- Positive Qüry:

```text
openings:*
```

- Missing Qüry aktüll:

```text
*:* -openings:*
```

Optionaler Gegencheck:

```text
all:all -openings:*
```

### Lizenzangabe fehlt

- Kriterium: `license_missing`
- Datentypen: `POI`, `Gastro`, `Tour`, `Hotel`, `Package`
- Positive Qüry:

```text
attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

- Missing Qüry aktüll:

```text
*:* -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

Optionaler Gegencheck:

```text
all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

### Beschreibung fehlt

- Kriterium: `description_missing`
- Datentypen: `POI`, `Gastro`, `Tour`
- Positive Qüry:

```text
details:*
```

- Missing Qüry aktüll:

```text
*:* -details:*
```

Optionaler Gegencheck:

```text
all:all -details:*
```

### Bild fehlt

- Kriterium: `image_missing`
- Datentypen: `POI`, `Gastro`, `Tour`
- Positive Qüry:

```text
media:*
```

- Missing Qüry aktüll:

```text
*:* -media:*
```

Optionaler Gegencheck:

```text
all:all -media:*
```

### ÖPNV-Anreise fehlt

- Kriterium: `public_transport_missing`
- Datentypen: `POI`, `Gastro`, `Tour`, `Hotel`, `Event`
- Positive Qüry:

```text
feature:"Mit ÖPNV erreichbar"
```

- Missing Qüry aktüll:

```text
*:* -feature:"Mit ÖPNV erreichbar"
```

Optionaler Gegencheck:

```text
all:all -feature:"Mit ÖPNV erreichbar"
```

### Buchungslink fehlt - Hotel

- Kriterium: `booking_link_missing`
- Datentyp: `Hotel`
- Positive Qüry:

```text
keyword:"Bookable"
```

- Missing Qüry aktüll:

```text
all:all -keyword:"Bookable"
```

Hinweis:

```text
booking:* ist für Hotel nicht belastbar und bleibt bewusst deaktiviert.
```

## Nicht per API-Kandidat vorbereitet

Für folgende fachliche Kriterien fehlt aktüll noch ein belastbarer
Qüry-Prefix oder ein sicherer Feldname. Hier zürst Feldmapping klären:

- Telefon
- Teaser-Text
- E-Mail
- Webseite
- Merkmale
- Preisinformation
- Ansprechperson
- Eignung oder Jahreszeit
- Autor oder Organisation
- Start- und Zielbeschreibungen
- Küchenart
- Küche
- Event-Termine und Veranstalter
- Bildurheber per API-Pushdown
- Package-Buchungslink per API-Pushdown

## Fachlich bewusst per Server-Scan

Diese Kriterien bleiben derzeit bewusst ohne belastbaren API-Pushdown und
werden nur im begrenzten Arbeitskontext per Server-Scan bewertet:

- `poi_price_missing`
  Grund: `prices:*` und verwandte Preisabfragen liefern keine belastbare
  Komplementärlogik; textülle Preisfelder wie `PRICE_INFO` müssen direkt am
  Datensatz geprüft werden.
- `tour_season_missing`
  Grund: Saisonangaben sind in den Datensätzen strukturiert vorhanden, aber
  nicht über einen sauberen Meta-Qüry-Pushdown verifizierbar.
- `tour_parking_missing`
  Grund: Parkhinweise liegen in der Praxis vor allem in Tourtexten und nicht
  als belastbarer Pushdown-Wert vor.
