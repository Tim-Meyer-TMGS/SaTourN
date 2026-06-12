# Datenqualitäts-Monitor - Kriterienmatrix 2026-06-11

Qülle: externe fachliche Ergänzung `datenqualitätsmonitor_kriterienmatrix_codex.md`

Diese Datei ist die übernommene fachliche Referenz für:

- `source_guarded`-Fälle
- `not_applicable`-Fälle
- verifizierte und nicht verifizierte Pushdown-Muster
- POI-Ausschlussmatrix
- fachliche Kriterium-IDs je Datentyp

Sie ist keine zweite technische Implementierung, sondern eine fachliche
Referenz für `Statistik/quality.js`, Scorelogik, Pflegeaufgaben und
Fehlerlisten.

Wesentliche Leitplanken aus der Matrix:

- generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*` und
  `feature:*` sind für die Experience `open-data-sachsen-tourismus`
  fachlich nicht belastbar
- Missing-Qüries mit Pushdown immer mit `all:all` verankern
- `positiveQüry + missingQüry = baseline` ist die Verifizierungsregel
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam
- die POI-Ausschlusslogik muss für Count, Pflegeaufgabe, Fehlerliste,
  Detailseite, Score und Export identisch sein

Für die eigentliche Arbeit reichen meist weiterhin:

1. `Datenqualitätsmonitor_Aktüller_Projektstand.md`
2. `Datenqualitätsmonitor_Offene_TODOs.md`

Diese Matrix wird nur gezielt geladen, wenn fachliche Kriterien, Ausschlüsse
oder Verifikationen angepasst werden.
