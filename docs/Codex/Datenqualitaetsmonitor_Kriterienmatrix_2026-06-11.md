# Datenqualitaets-Monitor - Kriterienmatrix 2026-06-11

Quelle: externe fachliche Ergaenzung `datenqualitaetsmonitor_kriterienmatrix_codex.md`

Diese Datei ist die uebernommene fachliche Referenz fuer:

- `source_guarded`-Faelle
- `not_applicable`-Faelle
- verifizierte und nicht verifizierte Pushdown-Muster
- POI-Ausschlussmatrix
- fachliche Kriterium-IDs je Datentyp

Sie ist keine zweite technische Implementierung, sondern eine fachliche
Referenz fuer `Statistik/quality.js`, Scorelogik, Pflegeaufgaben und
Fehlerlisten.

Wesentliche Leitplanken aus der Matrix:

- generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*` und
  `feature:*` sind fuer die Experience `open-data-sachsen-tourismus`
  fachlich nicht belastbar
- Missing-Queries mit Pushdown immer mit `all:all` verankern
- `positiveQuery + missingQuery = baseline` ist die Verifizierungsregel
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam
- die POI-Ausschlusslogik muss fuer Count, Pflegeaufgabe, Fehlerliste,
  Detailseite, Score und Export identisch sein

Fuer die eigentliche Arbeit reichen meist weiterhin:

1. `Datenqualitaetsmonitor_Aktueller_Projektstand.md`
2. `Datenqualitaetsmonitor_Offene_TODOs.md`

Diese Matrix wird nur gezielt geladen, wenn fachliche Kriterien, Ausschluesse
oder Verifikationen angepasst werden.
