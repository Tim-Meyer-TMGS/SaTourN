# Datenqualitaetsmonitor - API-Pushdown-Erkenntnisse

Stand: 2026-06-11
Quelle: `codex_api_pushdown_erkenntnisse.md` aus dem Download-Ordner

Diese Datei haelt die belastbaren Pushdown-Regeln fest, die in den Monitor
eingebaut oder bewusst nicht eingebaut werden sollen.

## Harte Regeln

- Baseline pro Datentyp ist `all:all`.
- Ein Pushdown gilt nur dann als belastbar, wenn
  `positiveQuery + missingQuery = all:all` fuer denselben Datentyp ergibt.
- Missing-Queries verwenden immer `all:all` als Anker.
- `*:* -field:*` wird fuer Missing-Regeln nicht mehr verwendet.
- Exakte Merkmalwerte nur aus Trees oder echten Exportdaten uebernehmen.
- Exakte Kategoriewerte nur aus Trees oder echten Exportdaten uebernehmen.
- Kontrolltests mit `id:`, nicht mit `global_id:`.

## Aktivierte Pushdown-Muster

Bereits bekannte feldbasierte Regeln:

- `opening_hours_missing`
  positive: `openings:*`
  missing: `all:all -openings:*`
- `license_missing`
  positive: `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`
  missing: `all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)`
- `description_missing`
  positive: `details:*`
  missing: `all:all -details:*`
- `image_missing`
  positive: `media:*`
  missing: `all:all -media:*`
- `public_transport_missing`
  positive: `feature:"Mit ÖPNV erreichbar"`
  missing: `all:all -feature:"Mit ÖPNV erreichbar"`
- `booking_link_missing` fuer `Hotel`
  positive: `booking:*`
  missing: `all:all -booking:*`

Neu aktivierte validierte `feature`-/`category`-Regeln:

- POI
  - `poi_parking_feature_missing`
    Wert: `feature:"Parkplätze vorhanden"`
  - `poi_payment_options_missing`
    Werte: `Barzahlung`, `EC-Karte`, `Visa`, `Mastercard`, `kontaktlose Zahlung`
  - `poi_languages_missing`
    Werte: `Englisch`, `Polnisch`, `Tschechisch`
  - `poi_suitability_missing`
    Werte: `Familie`, `für Gruppen`, `Senioren geeignet`,
    `für Schulklassen`, `für jedes Wetter`
- Gastro
  - `gastro_payment_options_missing`
    Werte: `Barzahlung`, `EC-Karte`
  - `gastro_languages_missing`
    Werte: `Englisch`, `Polnisch`
  - `gastro_parking_feature_missing`
    Wert: `feature:"PKW-Parkplatz am Haus"`
  - `gastro_cuisine_category_missing`
    Werte: `category:"vegetarisch"`, `category:"deutsch"`,
    `category:"italienisch"`

## Nicht als Pushdown aktivieren

Diese Themen bleiben offen oder clientseitig:

- Telefon
- E-Mail
- Webseite
- Teaser
- Preisfelder / Preisinformation
- Bild-/Medienurheber
- Ansprechperson / Organisation / Veranstalter
- Event-Termine
- Tour-Startbeschreibung / Tour-Zielbeschreibung
- `category:"regionale Küche"` als Missing-Regel

## Offene Nachpruefung

- Weitere validierte `feature`-OR-Listen je Datentyp
- Weitere validierte `category`-OR-Listen je Datentyp
- Event-Lizenz
- Event-Beschreibung
- Strassenregeln je Datentyp
- Geo und Tour-Basisdaten nur als API-Teilpruefung, nicht blind aktivieren

