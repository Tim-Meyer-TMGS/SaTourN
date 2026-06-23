# Datenqualitätsmonitor – Offene TODOs

Stand: 2026-06-23

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
- prüfen, ob KI-Treffer in allen Fällen sauber durch die Prüfkriterien laufen
- leere Ergebnisse, mehrdeutige Suchanfragen und Fehlermeldungen UX-seitig schärfen

Betroffene Dateien:

- `Statistik/records.html`
- `Statistik/records/records-actions.js`
- `Statistik/records/records-data.js`
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

- React-Detailseite gegen echte Datensätze visuell mit der produktiven Detailseite vergleichen
- React-Detailseite auf mobile Darstellung, lange Texte, viele Medien und fehlende Felder prüfen
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

Festgelegte Zielrichtung:

- `React`
- `Vite`
- `TypeScript`
- `React Router`
- `Zustand`

Erledigt:

- Zielstack für die Frontend-Migration festgelegt
- Zielstruktur für `frontend/src/app`, `features` und `shared` beschrieben
- Pilotseite `Datensätze` als erster Migrationskandidat festgelegt
- Migrationsreihenfolge für den Parallelbetrieb dokumentiert
- Records-Pilotseite mit Suche, KI-Suche, Filtern, Paging, CSV, Mailentwurf und Detailverlinkung umgesetzt
- React-Detailseite auf das produktive 3-Spalten-Layout mit Aktionszeile, Nutzbarkeit, Medien, Detail-Informationen und Kriterienbewertung angeglichen

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Frontend_Migrationsplan.md`

### 10. Vor der Framework-Migration weitere Entkopplung im Bestand umsetzen

Ziel:

- das bestehende Frontend erst fachlich aufräumen, dann migrieren

Bereits umgesetzt:

- Core-Helfer für State und API-URLs aus `scripts.js` ausgelagert
- gemeinsame Shell-Initialisierung und Seitenstart-Verdrahtung in
  `core/page-bootstrap.js` ausgelagert
- Seiteninitialisierung in `core/page-initializers.js` ausgelagert
- Arbeitskontext-, View-State- und Shell-Submit-Verdrahtung in
  `core/context-shell-controller.js` ausgelagert
- Consent-UI in `core/consent-ui.js` ausgelagert
- Statistik-Filter-, Render- und Exportlogik in `stats/stats-page.js`
  ausgelagert
- Overview-Bindings in `overview/overview-page-bindings.js` ausgelagert
- Records-View-/UI-Bindings in `records/records-page-bindings.js`
  ausgelagert
- Records-Such-/Autocomplete-/Mail-Bindings in
  `records/records-page-search-bindings.js` ausgelagert
- Task-UI-/Paging-/Detail-Bindings in `tasks/task-page-bindings.js`
  ausgelagert
- Detail-Hilfs-/View-Bindings in
  `detail/record-detail-page-bindings.js` ausgelagert
- Quellsystem-/Export-Bindings in
  `core/source-systems-page-bindings.js` ausgelagert
- Records-Seitenlauf in `records-page-controller.js` ausgelagert
- Detail-Seitenlauf in `record-detail-controller.js` ausgelagert
- Overview-Datenlogik, Overview-Helfer, Overview-UI und Overview-Controller ausgelagert
- Task-Datenlogik, Task-Logik, Task-Texte, Task-UI und Task-Controller ausgelagert
- Detail-Helfer, Detail-Datenaufbereitung, Detail-UI und Detail-Bindings ausgelagert
- `Statistik/README.md` auf die neue Ordnerstruktur aktualisiert

Offen:

- `scripts.js` auf tote Wrapper und doppelte Delegationen bereinigen
- API-Zugriffe von Rendering und Event-Handling weiter trennen
- globale State-Logik in klar abgegrenzte Bereiche aufteilen
- Texte, Labels und Hilfemeldungen weiter aus Logikblöcken herauslösen
- Qualitätslogik in kleinere, lesbare Module überführen, wo dies ohne Fachbruch möglich ist
- Mojibake-Restbestände in weiteren Dateien systematisch prüfen

Nächste sinnvolle Entkopplung:

- verbleibende Overview-/Task-/Detail-Orchestrierung weiter zusammenziehen
- danach `scripts.js` auf reinen Seiten-Bootstrap reduzieren

Betroffene Dateien:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/records/`
- `Statistik/detail/`
- `Statistik/overview/`
- `Statistik/tasks/`
- `Statistik/core/`

### 11. Framework-Übergang konkret vorbereiten

Bereits umgesetzt:

- neues `frontend/`-Grundgerüst parallel zum Bestand angelegt
- Routing, Shell und Arbeitskontext im neuen Frontend vorbereitet
- gemeinsamer API-Client-Grundrahmen für Search, Quality, Records und OI vorbereitet
- Platzhalterseiten für alle heutigen Hauptbereiche angelegt

Nächste Umsetzungsschritte:

1. `Datensätze` als erste Pilotseite vollständig migrieren
2. danach `Datensatz-Detail`, `Pflegeaufgaben`, `Übersicht`, `Open-Data-Statistik`, `Hilfe`
3. Alt-Frontend erst nach fachlicher Gleichheit kontrolliert ablösen

Aktueller Teilstand zu `Datensätze`:

- neue React-Seite kann bereits gegen den bestehenden Proxy suchen
- KI-Suche ist im neuen Frontend ansprechbar
- Datensätze werden im neuen Frontend bereits gegen das bestehende Qualitätsmodell ausgewertet
- Detailverlinkung, lokale Filter, Paging und Mailentwurf sind im neuen Frontend vorbereitet
- es fehlen noch:
  - UI-Angleichung an den Produktstand
  - CSV-Export
  - Schnellfilter
  - Autocomplete
  - vollständige React-Detailseite

Wichtig:

- Alt-Frontend bleibt bis zur fachlichen Gleichheit produktiv
- Backend-Routen und Render-Konfiguration bleiben zunächst unverändert
- Qualitätslogik bleibt fachlich führend

### 12. Übergabedokumentation für Entwickler vorbereiten

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

- Frontend-Migrationsziel auf `React + Vite + TypeScript` festgezogen
- Migrationsplan für Parallelbetrieb und Pilotseite `Datensätze` dokumentiert
- aktive Codex-Dokumente bereinigt und auf den neuen Stand gehoben
- paralleles `frontend/`-Grundgerüst mit Router, Shell, Context-Store und API-Basis angelegt
