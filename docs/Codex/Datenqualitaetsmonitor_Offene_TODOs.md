# Datenqualitätsmonitor – Offene TODOs

Stand: 2026-06-19

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

- `Statistik/records/record-communication.js`
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
- `Statistik/records/records-actions.js`
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

Erledigt:

- Ist-Architektur als Systemübersicht dokumentiert
- Zielarchitektur mit getrenntem Frontend und Backend festgelegt
- Verantwortlichkeiten für Frontend und Backend beschrieben
- Hosting-Zielbild für eigenen Server beschrieben

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`

### 9. Frontend-Migration auf Framework vorbereiten

Empfohlene Richtung:

- `Vue 3`
- `Vite`
- `Vue Router`
- `Pinia`

Offen:

- technische Einführung des neuen Frontend-Gerüsts noch nicht begonnen
- bestehender Code muss vor der eigentlichen Migration weiter entkoppelt werden

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

### 10. Vor der Framework-Migration weitere Entkopplung im Bestand umsetzen

Ziel:

- das bestehende Frontend erst fachlich aufräumen, dann migrieren

Bereits umgesetzt:

- Core-Helfer für State und API-URLs aus `scripts.js` ausgelagert
- Records-API, Records-Helfer, Records-Aktionen, Records-Steuerung,
  Records-Datenadapter, Records-Filter und Records-UI ausgelagert
- Records-Seitenlauf in `records-page-controller.js` ausgelagert
- Detail-Helfer, Detail-Datenaufbereitung, Detail-UI und Detail-Seitenlauf ausgelagert
- Overview-Datenlogik, Overview-Helfer, Overview-UI und Overview-Controller ausgelagert
- Task-Datenlogik, Task-Logik, Task-Texte, Task-UI und Task-Controller ausgelagert
- Quellsystem-/Pflegesystem-Logik in gemeinsames Core-Modul ausgelagert
- gemeinsame Shell-Initialisierung und Arbeitskontext-Helfer in Core-Modul ausgelagert
- gemeinsamer Startzustand und seitenabhängige State-Vorbelegung in Core-Modul ausgelagert
- Consent-, Refresh- und Cache-Grundverdrahtung in Core-Modul ausgelagert
- `Statistik/README.md` auf die neue Ordnerstruktur aktualisiert

Offen:

- `scripts.js` weiter in fachliche Teilmodule zerlegen
- API-Zugriffe von Rendering und Event-Handling weiter trennen
- globale State-Logik in klar abgegrenzte Bereiche aufteilen
- Texte, Labels und Hilfemeldungen weiter aus Logikblöcken herauslösen
- Qualitätslogik in kleinere, lesbare Module überführen, wo dies ohne Fachbruch möglich ist
- Mojibake-Restbestände in weiteren Dateien systematisch prüfen

Nächste sinnvolle Entkopplung:

- verbleibende Records-Such- und Interaktionsverdrahtung weiter reduzieren
- verbleibende Help-/Consent-Speziallogik vom Kern entkoppeln
- gemeinsame Seiteninitialisierung und Seitennavigation weiter aus `scripts.js` ziehen

Betroffene Dateien:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/records/`
- `Statistik/detail/`
- `Statistik/overview/`
- `Statistik/tasks/`
- `Statistik/core/`

### 11. Übergabedokumentation für Entwickler vorbereiten

Offen:

- Entwicklerdokumentation für lokale Einrichtung ergänzen
- Dokumentation der Umgebungsvariablen vervollständigen
- API-Endpunkte und Verantwortlichkeiten dokumentieren
- fachliche Bewertungslogik und bekannte Grenzen beschreiben
- Betriebsdokumentation für späteres Eigenhosting vorbereiten:
  Build, Start, Reverse Proxy, Secrets, Logs, Health-Checks

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

- Records-Seitenlauf aus `scripts.js` in `Statistik/records/records-page-controller.js` ausgelagert
- Detail-Seitenlauf aus `scripts.js` in `Statistik/detail/record-detail-controller.js` ausgelagert
- `Statistik/detail/record-detail-data.js` sauber in UTF-8 neu aufgebaut
- `Statistik/README.md` und die aktiven Codex-Dokumente auf die neue Struktur nachgezogen
