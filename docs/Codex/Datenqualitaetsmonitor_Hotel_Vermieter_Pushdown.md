# Datenqualitaetsmonitor - Hotel/Vermieter Pushdown

Stand: 2026-06-11
Quelle: `codex_hotel_vermieter_pushdown.md` aus dem Download-Ordner

Diese Datei haelt die nachgeprueften Hotel-/Vermieter-Regeln fest.

## Harte Aussagen

- Event-Termine sind kein API-Pushdown-Kriterium.
  Events ohne Termine sind ueber die API nicht abrufbar und duerfen daher
  nicht als `event_dates_missing` modelliert werden.
- Hotel/Vermieter unterstuetzt `feature:"..."`.
- Hotel/Vermieter unterstuetzt `category:"..."`.
- Hotel/Vermieter unterstuetzt `feature`-OR-Regeln.
- Hotel-Buchbarkeit ist nicht ueber `booking:*` pushdownfaehig.
- Hotel-Buchbarkeit ist ueber `keyword:"Bookable"` pushdownfaehig.

## Aktivierte Hotel-Regeln

- `public_transport_missing`
  positive: `feature:"Mit ÖPNV erreichbar"`
  missing: `all:all -feature:"Mit ÖPNV erreichbar"`
- `hotel_language_english_missing`
  positive: `feature:"Englisch"`
  missing: `all:all -feature:"Englisch"`
- `hotel_payment_cash_missing`
  positive: `feature:"Barzahlung"`
  missing: `all:all -feature:"Barzahlung"`
- `booking_link_missing` fuer `Hotel`
  positive: `keyword:"Bookable"`
  missing: `all:all -keyword:"Bookable"`
  Hinweis: lokal bleibt der echte Buchungslink weiter im Export unter
  `media_objects[].rel = "booking"` sichtbar, aber der serverseitige Pushdown
  laeuft ueber den Bookable-Indikator.

## Technisch bestaetigt, aber noch nicht als eigenes Qualitaetskriterium aktiv

- `category:"Hotel"`
  Grund: Der Wert ist technisch komplementaer pushdownfaehig, beschreibt aber
  nur die Kategorie `Hotel` und waere als allgemeine Pflegeaufgabe fuer
  Unterkunftsdaten fachlich zu unscharf.
- Feature-OR aus `Englisch`, `Barzahlung`, `Mit ÖPNV erreichbar`
  Grund: Technischer Nachweis fuer Hotel-OR-Kombinationen, aber keine eigene
  Nutzeraufgabe.

## Nicht aktivieren

- `booking:*`
- `all:all -booking:*`
- `keywords:"Bookable"`
- `all:all -keywords:"Bookable"`

## Offen fuer spaetere Nachpruefung

- Weitere Hotel-Fremdsprachen aus `VermieterMerkmalTree.xml`
- Weitere Hotel-Zahlungsarten aus `VermieterMerkmalTree.xml`
- Weitere Hotel-Unterkunftsarten aus `VermieterTree.xml`
- Weitere Hotel-Eignungs- und Ausstattungsmerkmale

