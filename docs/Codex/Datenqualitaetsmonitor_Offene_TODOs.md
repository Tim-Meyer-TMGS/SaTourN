# DatenqualitÃ¤tsmonitor â€“ Offene TODOs

Stand: 2026-06-15

Diese Datei ist die kurze, aktive Arbeitsliste. Abgeschlossene Analysen und
alte Nachweise liegen im Archiv.

## PrioritÃ¤t A â€“ Als NÃ¤chstes

### 1. one.intelligence Mailfunktion produktionsreif machen

Offen:

- Mailtexte gegen echte DatensÃ¤tze fachlich prÃ¼fen
- Betreffzeilen vereinheitlichen
- prÃ¼fen, ob pro Kontext nur die relevanten Fehler in die Mail gehen
- optional Fallback vorsehen, falls `mailto:` lokal beim Nutzer nicht sauber Ã¶ffnet

Betroffene Dateien:

- `Statistik/scripts.js`
- `routes/oi.js`
- `docs/Codex/Render_OI_Einrichtung.md`

### 2. KI-Suche im Frontend fachlich gegen echte SuchfÃ¤lle testen

Offen:

- reale Themenanfragen durchtesten:
  `Museum`, `Wanderwege mit Hund`, `Familienausflug`, `Wellnesshotel`
- prÃ¼fen, ob OI-IDs immer sauber in DatensÃ¤tze aufgelÃ¶st werden
- leere Ergebnisse, mehrdeutige Suchanfragen und Fehlermeldungen UX-seitig schÃ¤rfen

Betroffene Dateien:

- `Statistik/records.html`
- `Statistik/scripts.js`
- `routes/oi.js`

### 3. Hilfeseite und KI-Texte auf den aktuellen Produktstand ziehen

Offen:

- Hilfeseite an die tatsÃ¤chlich aktiven Kriterien anpassen
- Mail- und Sucheinstieg kurz und verstÃ¤ndlich dokumentieren
- spÃ¤tere 3-Ebenen-Logik weiter fachlich vorbereiten:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`

Betroffene Dateien:

- `Statistik/help.html`
- `Statistik/scripts.js`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`

## PrioritÃ¤t B â€“ Bewertungslogik erweitern

### 4. Weitere Kriterien sauber verifizieren und aktivieren

Offen:

- weitere Hotel-, Gastro-, Tour-, Event- und Package-Kriterien gezielt gegen echte Daten prÃ¼fen
- nur Kriterien aktivieren, die fachlich und technisch belastbar sind
- Count, Fehlerliste, Detailseite und Score mÃ¼ssen dieselbe Regel nutzen

Verifikationsregel:

- `baseline`
- `positiveQuery`
- `missingQuery`
- `positive + missing = baseline`
- positiver Beispieldatensatz
- negativer Beispieldatensatz

Nachweise:

- Archivdokumente unter `Archiv/2026-06-15_Analyse-und-Nachweise/`

### 5. POI-Ausschlusslogik gezielt erweitern

Offen:

- Preisregel und weitere sichere POI-AusschlÃ¼sse gegen echte Daten absichern
- AusschlÃ¼sse nur zentral in der Bewertungslogik erweitern, nicht im UI

Betroffene Dateien:

- `Statistik/quality.js`
- `routes/quality.js`

## PrioritÃ¤t C â€“ UI und Betrieb

### 6. UI weiter glÃ¤tten

Offen:

- Datensatzdetail weiter auf handlungsrelevante Inhalte zuschneiden
- Statistikseite weiter entschlacken
- ZustÃ¤nde, Ladeanimationen und Fehlermeldungen vereinheitlichen

### 7. Betrieb und Plattform

Offen:

- Render bleibt vorerst produktiver Proxy
- Vercel-Migration nur separat behandeln
- Cache-/Snapshot-Strategie erst wieder anfassen, wenn fachliche Logik stabil ist

## PrioritÃ¤t D â€“ Architektur, Framework und Ãœbergabe

### 8. Zielarchitektur fÃ¼r Ãœbergabe und Eigenhosting festziehen

Ziel:

- Projekt so strukturieren, dass es sauber an externe Entwickler Ã¼bergeben werden kann
- Frontend und Backend fachlich und technisch klar trennen
- spÃ¤terer Betrieb auf eigenem Server ohne Render-AbhÃ¤ngigkeit vorbereiten

Erledigt:

- Ist-Architektur als SystemÃ¼bersicht dokumentiert
- Zielarchitektur mit getrenntem Frontend und Backend festgelegt
- Verantwortlichkeiten fÃ¼r Frontend und Backend beschrieben
- Hosting-Zielbild fÃ¼r eigenen Server beschrieben

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`

Betroffene Dateien:

- `docs/Codex/README.md`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- `docs/Codex/Render_OI_Einrichtung.md`
- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`

### 9. Frontend-Migration auf Framework vorbereiten

Empfohlene Richtung:

- `Vue 3`
- `Vite`
- `Vue Router`
- `Pinia`

BegrÃ¼ndung:

- gute Passung zur heutigen HTML-/JS-Struktur
- klarere Komponentenlogik
- sauberer gemeinsamer State
- bessere Wartbarkeit bei mehreren Ansichten und vielen FilterzustÃ¤nden

Erledigt:

- Seitenlogik fachlich in Zielmodule zerlegt
- gemeinsame Ziel-Stores identifiziert
- wiederverwendbare Ziel-Komponenten definiert
- Ziel-Routing und Migrationsreihenfolge dokumentiert

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

Offen:

- technische EinfÃ¼hrung des neuen Frontend-GerÃ¼sts noch nicht begonnen
- bestehender Code muss vor der eigentlichen Migration weiter entkoppelt werden

Betroffene Dateien:

- `Statistik/scripts.js`
- `Statistik/records.html`
- `Statistik/tasks.html`
- `Statistik/record-detail.html`
- `Statistik/index.html`
- `Statistik/stats.html`
- `Statistik/help.html`
- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

### 10. Vor der Framework-Migration weitere Entkopplung im Bestand umsetzen

Ziel:

- das bestehende Frontend erst fachlich aufrÃ¤umen, dann migrieren

Bereits umgesetzt:

- erster Storage-/View-State-Bereich aus `scripts.js` in
  `Statistik/core/state-storage.js` ausgelagert
- erster API-Builder-Bereich aus `scripts.js` in
  `Statistik/core/api-urls.js` ausgelagert
- erste Frontend-Record-/OI-Aufrufe aus `scripts.js` in
  `Statistik/records/record-api.js` ausgelagert
- erste reine Records-Helfer aus `scripts.js` in
  `Statistik/records/records-helpers.js` ausgelagert
- erste Records-Such-, KI- und Autocomplete-Aktionen aus `scripts.js` in
  `Statistik/records/records-actions.js` ausgelagert
- Record-Mailentwurf aus `scripts.js` in
  `Statistik/records/record-communication.js` zusammengeführt
- Record-Suchadapter, Datensatz-Normalisierung und Record-View-Model-Bau aus `scripts.js` in
  `Statistik/records/records-data.js` ausgelagert
- Record-Filter-, Paginations- und Listensteuerung aus `scripts.js` in
  `Statistik/records/records-filters.js` ausgelagert
- erste Records-Steuerung aus `scripts.js` in
  `Statistik/records/records-controller.js` ausgelagert
- erste Records-Renderer aus `scripts.js` in
  `Statistik/records/records-ui.js` ausgelagert
- erste Suchentscheidungslogik in
  `Statistik/records/records-search.js` gebÃ¼ndelt
- erste reine Detail-Helfer aus `scripts.js` in
  `Statistik/detail/record-detail-helpers.js` ausgelagert
- erster Detail-Renderer aus `scripts.js` in
  `Statistik/detail/record-detail-ui.js` ausgelagert
- erste Frontend-Quality-Request-Helfer aus `scripts.js` in
  `Statistik/quality/quality-api.js` ausgelagert
- erste reine Ãœbersichts-Helfer aus `scripts.js` in
  `Statistik/overview/overview-helpers.js` ausgelagert
- erster Ãœbersichts-Renderer aus `scripts.js` in
  `Statistik/overview/overview-ui.js` ausgelagert
- erste Aufgaben-Renderer aus `scripts.js` in
  `Statistik/tasks/tasks-ui.js` ausgelagert
- erste Aufgaben-, Fehler- und Icontexte aus `scripts.js` in
  `Statistik/tasks/task-texts.js` ausgelagert

Offen:

- `scripts.js` weiter in fachliche Teilmodule zerlegen
- API-Zugriffe von Rendering und Event-Handling trennen
- globale State-Logik in klar abgegrenzte Bereiche aufteilen
- Texte, Labels und Hilfemeldungen aus LogikblÃ¶cken herauslÃ¶sen
- QualitÃ¤tslogik in kleinere, lesbare Module Ã¼berfÃ¼hren, wo dies ohne Fachbruch mÃ¶glich ist

Technische Leitlinie:

- kein harter Komplettumbau in einem Schritt
- erst Entkopplung, dann Framework-EinfÃ¼hrung
- bestehende Funktionen mÃ¼ssen wÃ¤hrend der Umstellung nutzbar bleiben

Betroffene Dateien:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/tasks/task-logic.js`
- `Statistik/tasks/task-families.js`
- `Statistik/records/records-search.js`
- `Statistik/records/records-actions.js`
- `Statistik/records/records-data.js`
- `Statistik/records/records-filters.js`
- `Statistik/records/record-communication.js`
- `Statistik/records/records-controller.js`
- `Statistik/records/records-helpers.js`
- `Statistik/records/records-ui.js`
- `Statistik/detail/record-detail-helpers.js`
- `Statistik/detail/record-detail-ui.js`
- `Statistik/core/state-storage.js`
- `Statistik/core/api-urls.js`
- `Statistik/records/record-api.js`
- `Statistik/quality/quality-api.js`
- `Statistik/overview/overview-helpers.js`
- `Statistik/overview/overview-ui.js`
- `Statistik/tasks/tasks-ui.js`
- `Statistik/tasks/task-texts.js`

### 11. Ãœbergabedokumentation fÃ¼r Entwickler vorbereiten

Ziel:

- ein neuer Entwickler soll das Projekt ohne mÃ¼ndliches Zusatzwissen Ã¼bernehmen kÃ¶nnen

Offen:

- Entwicklerdokumentation fÃ¼r lokale Einrichtung ergÃ¤nzen
- Dokumentation der Umgebungsvariablen vervollstÃ¤ndigen
- API-Endpunkte und Verantwortlichkeiten dokumentieren
- fachliche Bewertungslogik und bekannte Grenzen beschreiben
- Betriebsdokumentation fÃ¼r spÃ¤teres Eigenhosting vorbereiten:
  - Build
  - Start
  - Reverse Proxy
  - Secrets
  - Logs
  - Health-Checks

Betroffene Dateien:

- `docs/Codex/README.md`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- `docs/Codex/Render_OI_Einrichtung.md`

## Nicht aktiv bearbeiten

Diese Themen sind aktuell bewusst nachrangig:

- generische Wildcard-Pushdowns
- eigener Snapshot-Job
- Redis/KV-Cache
- Vercel-Migration
- n8n-Produktivanschluss

## Zuletzt erledigt

- KI-Suche lÃ¤uft produktiv Ã¼ber OI-API mit direktem Open-Data-Tool
- Mailentwurf lÃ¤uft produktiv Ã¼ber OI-API
- temporÃ¤rer OI-Debug-Code wurde wieder entfernt
- Pflegeaufgaben Ã¶ffnen Datensatzlisten wieder korrekt auf `records.html`
- Dropdown-MenÃ¼s wurden optisch vereinheitlicht
- Codex-Dokumentation wurde aufgerÃ¤umt und Analysematerial archiviert
