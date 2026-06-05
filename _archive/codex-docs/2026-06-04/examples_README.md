# Beispiel-Datensaetze

Diese Dateien enthalten reale bzw. repraesentative destination.one/eT4-Beispieldaten
fuer spaetere lokale Tests der Qualitaetskriterien.

## Dateien

- `poi.json`
- `gastro.json`
- `tour.json`
- `hotel.json`

## Nutzung

Die Dateien sind fuer Entwicklung, Mapping-Pruefung und Helper-/Kriterien-Tests
gedacht. Sie sollen nicht direkt in das ausgelieferte Frontend eingebunden oder
beim Dashboard-Start geladen werden.

Bevorzugte Verwendung:

- lokale Unit-Tests und Diagnosen fuer Helper in `Statistik/quality.js`.
- Diagnose-Skripte fuer Feldmapping und Query-Plausibilisierung.
- Abgleich von API-Pushdown-Queries mit lokalen Fallback-Pruefungen.

Aktuelles Skript:

- `npm run diagnose:quality-examples`
- `npm run diagnose:quality-examples:json`
