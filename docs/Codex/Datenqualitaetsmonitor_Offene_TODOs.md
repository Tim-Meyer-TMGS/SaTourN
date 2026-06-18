# Datenqualitätsmonitor – Offene TODOs

Stand: 2026-06-15

Diese Datei ist die kurze, aktive Arbeitsliste. Abgeschlossene Analysen und
alte Nachweise liegen im Archiv.

## Priorität A – Als Nächstes

### 1. one.intelligence Mailfunktion produktionsreif machen

Offen:

- Mailtexte gegen echte Datensätze fachlich prüfen
- Betreffzeilen vereinheitlichen
- prüfen, ob pro Kontext nur die relevanten Fehler in die Mail gehen
- optional Fallback vorsehen, falls `mailto:` lokal beim Nutzer nicht sauber öffnet

Betroffene Dateien:

- `Statistik/scripts.js`
- `routes/oi.js`
- `docs/Codex/Render_OI_Einrichtung.md`

### 2. KI-Suche im Frontend fachlich gegen echte Suchfälle testen

Offen:

- reale Themenanfragen durchtesten:
  `Museum`, `Wanderwege mit Hund`, `Familienausflug`, `Wellnesshotel`
- prüfen, ob OI-IDs immer sauber in Datensätze aufgelöst werden
- leere Ergebnisse, mehrdeutige Suchanfragen und Fehlermeldungen UX-seitig schärfen

Betroffene Dateien:

- `Statistik/records.html`
- `Statistik/scripts.js`
- `routes/oi.js`

### 3. Hilfeseite und KI-Texte auf den aktuellen Produktstand ziehen

Offen:

- Hilfeseite an die tatsächlich aktiven Kriterien anpassen
- Mail- und Sucheinstieg kurz und verständlich dokumentieren
- spätere 3-Ebenen-Logik weiter fachlich vorbereiten:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`

Betroffene Dateien:

- `Statistik/help.html`
- `Statistik/scripts.js`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`

## Priorität B – Bewertungslogik erweitern

### 4. Weitere Kriterien sauber verifizieren und aktivieren

Offen:

- weitere Hotel-, Gastro-, Tour-, Event- und Package-Kriterien gezielt gegen echte Daten prüfen
- nur Kriterien aktivieren, die fachlich und technisch belastbar sind
- Count, Fehlerliste, Detailseite und Score müssen dieselbe Regel nutzen

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

- Preisregel und weitere sichere POI-Ausschlüsse gegen echte Daten absichern
- Ausschlüsse nur zentral in der Bewertungslogik erweitern, nicht im UI

Betroffene Dateien:

- `Statistik/quality.js`
- `routes/quality.js`

## Priorität C – UI und Betrieb

### 6. UI weiter glätten

Offen:

- Datensatzdetail weiter auf handlungsrelevante Inhalte zuschneiden
- Statistikseite weiter entschlacken
- Zustände, Ladeanimationen und Fehlermeldungen vereinheitlichen

### 7. Betrieb und Plattform

Offen:

- Render bleibt vorerst produktiver Proxy
- Vercel-Migration nur separat behandeln
- Cache-/Snapshot-Strategie erst wieder anfassen, wenn fachliche Logik stabil ist

## Priorität D – Architektur, Framework und Übergabe

### 8. Zielarchitektur für Übergabe und Eigenhosting festziehen

Ziel:

- Projekt so strukturieren, dass es sauber an externe Entwickler übergeben werden kann
- Frontend und Backend fachlich und technisch klar trennen
- späterer Betrieb auf eigenem Server ohne Render-Abhängigkeit vorbereiten

Erledigt:

- Ist-Architektur als Systemübersicht dokumentiert
- Zielarchitektur mit getrenntem Frontend und Backend festgelegt
- Verantwortlichkeiten für Frontend und Backend beschrieben
- Hosting-Zielbild für eigenen Server beschrieben

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

Begründung:

- gute Passung zur heutigen HTML-/JS-Struktur
- klarere Komponentenlogik
- sauberer gemeinsamer State
- bessere Wartbarkeit bei mehreren Ansichten und vielen Filterzuständen

Erledigt:

- Seitenlogik fachlich in Zielmodule zerlegt
- gemeinsame Ziel-Stores identifiziert
- wiederverwendbare Ziel-Komponenten definiert
- Ziel-Routing und Migrationsreihenfolge dokumentiert

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

Offen:

- technische Einführung des neuen Frontend-Gerüsts noch nicht begonnen
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

- das bestehende Frontend erst fachlich aufräumen, dann migrieren

Bereits umgesetzt:

- erster Storage-/View-State-Bereich aus `scripts.js` in
  `Statistik/state-storage.js` ausgelagert
- erster API-Builder-Bereich aus `scripts.js` in
  `Statistik/api-urls.js` ausgelagert
- erste Frontend-Record-/OI-Aufrufe aus `scripts.js` in
  `Statistik/record-api.js` ausgelagert
- erste reine Records-Helfer aus `scripts.js` in
  `Statistik/records-helpers.js` ausgelagert
- erste reine Detail-Helfer aus `scripts.js` in
  `Statistik/record-detail-helpers.js` ausgelagert
- erster Detail-Renderer aus `scripts.js` in
  `Statistik/record-detail-ui.js` ausgelagert
- erste Frontend-Quality-Request-Helfer aus `scripts.js` in
  `Statistik/quality-api.js` ausgelagert
- erste reine Übersichts-Helfer aus `scripts.js` in
  `Statistik/overview-helpers.js` ausgelagert
- erster Übersichts-Renderer aus `scripts.js` in
  `Statistik/overview-ui.js` ausgelagert
- erste Aufgaben-Renderer aus `scripts.js` in
  `Statistik/tasks-ui.js` ausgelagert
- erste Aufgaben-, Fehler- und Icontexte aus `scripts.js` in
  `Statistik/task-texts.js` ausgelagert

Offen:

- `scripts.js` weiter in fachliche Teilmodule zerlegen
- API-Zugriffe von Rendering und Event-Handling trennen
- globale State-Logik in klar abgegrenzte Bereiche aufteilen
- Texte, Labels und Hilfemeldungen aus Logikblöcken herauslösen
- Qualitätslogik in kleinere, lesbare Module überführen, wo dies ohne Fachbruch möglich ist

Technische Leitlinie:

- kein harter Komplettumbau in einem Schritt
- erst Entkopplung, dann Framework-Einführung
- bestehende Funktionen müssen während der Umstellung nutzbar bleiben

Betroffene Dateien:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/task-logic.js`
- `Statistik/task-families.js`
- `Statistik/records-search.js`
- `Statistik/record-communication.js`
- `Statistik/records-helpers.js`
- `Statistik/record-detail-helpers.js`
- `Statistik/record-detail-ui.js`
- `Statistik/state-storage.js`
- `Statistik/api-urls.js`
- `Statistik/record-api.js`
- `Statistik/quality-api.js`
- `Statistik/overview-helpers.js`
- `Statistik/overview-ui.js`
- `Statistik/tasks-ui.js`
- `Statistik/task-texts.js`

### 11. Übergabedokumentation für Entwickler vorbereiten

Ziel:

- ein neuer Entwickler soll das Projekt ohne mündliches Zusatzwissen übernehmen können

Offen:

- Entwicklerdokumentation für lokale Einrichtung ergänzen
- Dokumentation der Umgebungsvariablen vervollständigen
- API-Endpunkte und Verantwortlichkeiten dokumentieren
- fachliche Bewertungslogik und bekannte Grenzen beschreiben
- Betriebsdokumentation für späteres Eigenhosting vorbereiten:
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

- KI-Suche läuft produktiv über OI-API mit direktem Open-Data-Tool
- Mailentwurf läuft produktiv über OI-API
- temporärer OI-Debug-Code wurde wieder entfernt
- Pflegeaufgaben öffnen Datensatzlisten wieder korrekt auf `records.html`
- Dropdown-Menüs wurden optisch vereinheitlicht
- Codex-Dokumentation wurde aufgeräumt und Analysematerial archiviert
