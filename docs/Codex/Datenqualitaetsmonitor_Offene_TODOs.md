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
