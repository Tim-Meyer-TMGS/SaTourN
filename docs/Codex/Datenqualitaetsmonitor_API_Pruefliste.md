# Datenqualitaetsmonitor - API-Pruefliste

Stand: 2026-06-11

Diese Datei sammelt die API-Anfragen, die fachlich und technisch geprueft
werden sollen, bevor neue Kriterien in `qualityCriteria` und damit in Score,
Pflegeaufgaben, Listen und Detailseite aktiviert werden.

## Pruefprinzip

Pro Kriterium und Datentyp bitte mindestens pruefen:

- Positive Query liefert Datensaetze, bei denen das Feld vorhanden ist.
- Missing Query liefert Datensaetze, bei denen das Feld wirklich fehlt.
- Ein positiver und ein negativer Beispieldatensatz werden mit `global_id`
  dokumentiert.
- Count, Fehlerliste und Detailansicht zeigen denselben Befund.
- Erst danach darf ein `apiCandidate` als aktive Regel umgesetzt werden.

Wichtig: Reine Negativabfragen sollen mit `all:all` kombiniert werden. Das
kommt aus der Meta Query Language und verhindert unklare negative-only Queries.

## Request-Vorlagen

### Direkt gegen Destination.One / eT4

```text
https://meta.et4.de/rest.ashx/search/ET2014A.json/?experience=DESTINATION_ONE_EXPERIENCE&licensekey=LICENSEKEY&type=TYPE&q=QUERY&limit=10&offset=0&mkt=de-DE
```

### Ueber den Render-Proxy

Die konkrete Proxy-URL kann je nach Parameterstruktur im Frontend variieren.
Als Orientierung:

```text
https://satourn.onrender.com/api/search?type=TYPE&q=QUERY&limit=10&offset=0
```

Wenn ein Gebiet oder Ort geprueft wird, dieselben Kontextparameter wie im
Frontend ergaenzen. Die technische Aktivierung darf nur mit derselben
Kontextlogik erfolgen, die spaeter auch Count und Liste verwenden.

## Einzutragende Nachweise

Pro Test bitte eintragen:

```text
Geprueft am:
Datentyp:
Query:
Count:
Positiver Beispiel-Datensatz global_id:
Negativer Beispiel-Datensatz global_id:
Detailseite stimmt? ja/nein
Bemerkung:
Entscheidung: aktivieren / weiter pruefen / verwerfen
```

## API-Kandidaten

### 1. Strasse fehlt - Hotel

- Fachkriterium: `hotel_street`
- Datentyp: `Hotel`
- Positive Query:

```text
street:*
```

- Missing Query:

```text
all:all -street:*
```

Zu pruefen:

- Stimmt `street:*` mit sichtbarer Anschrift im Datensatz ueberein?
- Liefert `all:all -street:*` echte Hotels ohne Strasse?
- Reicht `street` oder braucht der Datensatz intern ein anderes Adressfeld?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
street:*
```

- Missing Query:

```text
all:all -street:*
```

Zu pruefen:

- Gibt es fachlich erlaubte POIs ohne Strasse, z. B. Naturpunkte?
- Falls ja, braucht das Kriterium Ausschlussregeln nach Kategorie.

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
street:*
```

- Missing Query:

```text
all:all -street:*
```

Zu pruefen:

- Stimmt das Feld mit der sichtbaren Gastro-Anschrift ueberein?
- Gibt es Importquellen, bei denen die Strasse anders gemappt wird?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
street:*
```

- Missing Query:

```text
all:all -street:*
```

Zu pruefen:

- Bezieht sich `street` bei Events auf den Veranstaltungsort?
- Sind Online-Events oder ortslose Events fachlich auszuschliessen?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
details:*
```

- Missing Query:

```text
all:all -details:*
```

Zu pruefen:

- Ist `details:*` fuer Hotels verfuegbar?
- Entspricht `details` dem Beschreibungstext, der in der Detailseite angezeigt
  wird?
- Gibt es Hotels mit Teaser, aber ohne Details, die trotzdem als fehlende
  Beschreibung gelten sollen?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
details:*
```

- Missing Query:

```text
all:all -details:*
```

Zu pruefen:

- Ist `details:*` fuer Events verfuegbar?
- Gibt es Events, bei denen nur Termin- oder Kurztextfelder vorhanden sind?
- Muss eine Beschreibung fuer Events ueber `details` oder ein anderes Feld
  bewertet werden?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

- Missing Query:

```text
all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

Zu pruefen:

- Funktioniert `attribute_license` bei Events genauso wie bei POI, Gastro,
  Tour, Hotel und Package?
- Werden Events ohne Open-Data-Lizenz korrekt als nicht Open-Data-faehig
  erkannt?
- Muss Event-Lizenz fachlich in die Open-Data-Statistik aufgenommen werden?

Nachweis:

```text
Geprueft am:
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
- Positive Query:

```text
lat:* AND lon:*
```

- Missing Query:

```text
all:all AND (-lat:* OR -lon:*)
```

Zu pruefen:

- Werden Datensaetze ohne Koordinaten ueberhaupt in der normalen Suche
  ausgegeben?
- Wenn nein, bleibt das Kriterium `source_guarded` und wird nicht als normale
  Pflegeaufgabe aktiviert.
- Wenn ja, pruefen, ob `lat` und `lon` reichen oder weitere Geo-Felder
  relevant sind.

Nachweis je Datentyp:

```text
Datentyp:
Geprueft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

### 9. Tour-Basisdaten unvollstaendig

- Fachkriterium: `touristtrip_incomplete`
- Datentyp: `Tour`
- Positive Query:

```text
length:[1 TO *] AND duration:[1 TO *]
```

- Missing Query:

```text
all:all AND (-length:* OR -duration:*)
```

Zu pruefen:

- Laesst sich fehlende Laenge oder Dauer per API sicher finden?
- Reicht das fachlich nicht aus, weil auch Route, Geometrie, Start/Ziel oder
  weitere Tour-Basisdaten fehlen koennen?
- Falls nur ein Teil pruefbar ist, als separates technisches Teilkriterium
  dokumentieren, nicht als vollstaendige Tour-Basisdaten-Regel aktivieren.

Nachweis:

```text
Geprueft am:
Count positive:
Count missing:
Positiver global_id:
Negativer global_id:
Entscheidung:
Bemerkung:
```

## Bereits aktive API-Regeln zum Gegencheck

Diese Regeln sind bereits aktiv, koennen aber beim Testen als Vergleich dienen.
Bitte nicht ohne konkreten Grund umbauen.

### Oeffnungszeiten fehlen

- Kriterium: `opening_hours_missing`
- Datentypen: `POI`, `Gastro`
- Positive Query:

```text
openings:*
```

- Missing Query aktuell:

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
- Positive Query:

```text
attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)
```

- Missing Query aktuell:

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
- Positive Query:

```text
details:*
```

- Missing Query aktuell:

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
- Positive Query:

```text
media:*
```

- Missing Query aktuell:

```text
*:* -media:*
```

Optionaler Gegencheck:

```text
all:all -media:*
```

### OePNV-Anreise fehlt

- Kriterium: `public_transport_missing`
- Datentypen: `POI`, `Gastro`, `Tour`, `Hotel`, `Event`
- Positive Query:

```text
feature:"Mit ÖPNV erreichbar"
```

- Missing Query aktuell:

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
- Positive Query:

```text
keyword:"Bookable"
```

- Missing Query aktuell:

```text
all:all -keyword:"Bookable"
```

Hinweis:

```text
booking:* ist fuer Hotel nicht belastbar und bleibt bewusst deaktiviert.
```

## Nicht per API-Kandidat vorbereitet

Fuer folgende fachliche Kriterien fehlt aktuell noch ein belastbarer
Query-Prefix oder ein sicherer Feldname. Hier zuerst Feldmapping klaeren:

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
- Kuechenart
- Kueche
- Event-Termine und Veranstalter
- Bildurheber per API-Pushdown
- Package-Buchungslink per API-Pushdown

## Fachlich bewusst per Server-Scan

Diese Kriterien bleiben derzeit bewusst ohne belastbaren API-Pushdown und
werden nur im begrenzten Arbeitskontext per Server-Scan bewertet:

- `poi_price_missing`
  Grund: `prices:*` und verwandte Preisabfragen liefern keine belastbare
  Komplementaerlogik; textuelle Preisfelder wie `PRICE_INFO` muessen direkt am
  Datensatz geprueft werden.
- `tour_season_missing`
  Grund: Saisonangaben sind in den Datensaetzen strukturiert vorhanden, aber
  nicht ueber einen sauberen Meta-Query-Pushdown verifizierbar.
- `tour_parking_missing`
  Grund: Parkhinweise liegen in der Praxis vor allem in Tourtexten und nicht
  als belastbarer Pushdown-Wert vor.
