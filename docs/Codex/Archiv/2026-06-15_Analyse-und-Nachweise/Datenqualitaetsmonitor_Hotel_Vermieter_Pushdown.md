# Datenqualitätsmonitor - Hotel/Vermieter Pushdown

Stand: 2026-06-11
Qülle: `codex_hotel_vermieter_pushdown.md` aus dem Download-Ordner

Diese Datei hält die nachgeprüften Hotel-/Vermieter-Regeln fest.

## Harte Aussagen

- Event-Termine sind kein API-Pushdown-Kriterium.
  Events ohne Termine sind über die API nicht abrufbar und dürfen daher
  nicht als `event_dates_missing` modelliert werden.
- Hotel/Vermieter unterstützt `feature:"..."`.
- Hotel/Vermieter unterstützt `category:"..."`.
- Hotel/Vermieter unterstützt `feature`-OR-Regeln.
- Hotel-Buchbarkeit ist nicht über `booking:*` pushdownfähig.
- Hotel-Buchbarkeit ist über `keyword:"Bookable"` pushdownfähig.

## Aktivierte Hotel-Regeln

- `public_transport_missing`
  positive: `feature:"Mit ÖPNV erreichbar"`
  missing: `all:all -feature:"Mit ÖPNV erreichbar"`
- `hotel_language_english_missing`
  positive:
  `(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch" OR feature:"Französisch")`
  missing:
  `all:all -(feature:"Englisch" OR feature:"Polnisch" OR feature:"Tschechisch" OR feature:"Französisch")`
- `hotel_payment_cash_missing`
  positive:
  `(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")`
  missing:
  `all:all -(feature:"Barzahlung" OR feature:"EC-Karte" OR feature:"Visa" OR feature:"Mastercard" OR feature:"PayPal" OR feature:"kontaktlose Zahlung")`
- `hotel_parking_feature_missing`
  positive:
  `(feature:"Parkplätze" OR feature:"Parkgarage / Tiefgarage" OR feature:"Öffentliches Parkhaus fußläufig" OR feature:"Busparkplatz (-plätze)" OR feature:"E-Ladesäulen")`
  missing:
  `all:all -(feature:"Parkplätze" OR feature:"Parkgarage / Tiefgarage" OR feature:"Öffentliches Parkhaus fußläufig" OR feature:"Busparkplatz (-plätze)" OR feature:"E-Ladesäulen")`
- `booking_link_missing` für `Hotel`
  positive: `keyword:"Bookable"`
  missing: `all:all -keyword:"Bookable"`
  Hinweis: lokal bleibt der echte Buchungslink weiter im Export unter
  `media_objects[].rel = "booking"` sichtbar, aber der serverseitige Pushdown
  läuft über den Bookable-Indikator.

## Technisch bestätigt, aber noch nicht als eigenes Qualitätskriterium aktiv

- `category:"Hotel"`
  Grund: Der Wert ist technisch komplementär pushdownfähig, beschreibt aber
  nur die Kategorie `Hotel` und wäre als allgemeine Pflegeaufgabe für
  Unterkunftsdaten fachlich zu unscharf.
- Feature-OR aus `Englisch`, `Barzahlung`, `Mit ÖPNV erreichbar`
  Grund: Technischer Nachweis für Hotel-OR-Kombinationen; Sprache und
  Zahlungsarten sind inzwischen als konkrete Nutzerkriterien übernommen.

## Live-Nachweis 2026-06-11 über Render-Proxy

Baseline `Hotel`: `1591`

- Sprachen:
  positive `604`, missing `987`, Summe `1591`
  positiver Beispiel-Datensatz `h_34527`
  negativer Beispiel-Datensatz `h_80305`
- Zahlungsarten:
  positive `765`, missing `826`, Summe `1591`
  positiver Beispiel-Datensatz `h_45620`
  negativer Beispiel-Datensatz `h_80305`
- Parken:
  positive `341`, missing `1250`, Summe `1591`
  positiver Beispiel-Datensatz `h_79024`
  negativer Beispiel-Datensatz `h_80305`

## Nicht aktivieren

- `booking:*`
- `all:all -booking:*`
- `keywords:"Bookable"`
- `all:all -keywords:"Bookable"`

## Offen für spätere Nachprüfung

- Weitere Hotel-Fremdsprachen aus `VermieterMerkmalTree.xml`
- Weitere Hotel-Zahlungsarten aus `VermieterMerkmalTree.xml`
- Weitere Hotel-Unterkunftsarten aus `VermieterTree.xml`
- Weitere Hotel-Eignungs- und Ausstattungsmerkmale
