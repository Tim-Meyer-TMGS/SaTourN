# Datenqualitätsmonitor – Offene TODOs

Stand: 2026-07-06

Aktueller Hinweis:

- Die bisher vorbereiteten Standard-Prüfungen für Hotel, Tour, Gastro und
  Event wurden als zentrale Server-Scan-Regeln aktiviert. Sie sind damit für
  Score, Pflegeaufgaben, Fehlerlisten und Detailansicht wirksam.
- API-Pushdowns bleiben weiterhin nur dort aktiv, wo sie bereits verifiziert
  waren. Nicht verifizierte Feld- oder Wildcard-Abfragen wurden nicht als
  Pushdown reaktiviert.
- Die konkrete Prüfliste für schnellere API-Pushdowns liegt in
  `docs/Codex/Datenqualitaetsmonitor_API_Pushdown_TODOs.md`.

Diese Datei ist die kurze, aktive Arbeitsliste. Abgeschlossene Analysen und
alte Nachweise liegen im Archiv.

## Priorität A – Als Nächstes

### 1. React-Preview Build und UI-Abgleich absichern

Erledigt:

- Render-Warmup beim App-Start als eigener Client gekapselt
- sichtbarer Ladehinweis für Render-Kaltstart ergänzt
- mobile CSS-Regeln für Header, Navigation, Filter, Tabellen, Karten,
  Detailansicht und Statistik nachgezogen
- Hauptseiten-Layoutklassen vereinheitlicht
- gemeinsame Formatierungs-, Qualitäts-, Kriterien- und Linkbuilding-Helfer
  in `frontend/src/shared/` zentralisiert
- wichtigste Pflegeaufgaben in der Übersicht werden nach Aufgabenfamilien
  gruppiert, damit gleiche Aufgaben über mehrere Datentypen nicht doppelt
  angezeigt werden

Offen:

- GitHub-Actions-Build der React-Preview prüfen
- TypeScript-/Vite-Fehler vor weiterem Refactoring beheben
- UI-Abstände, Karten, Tabellen und Detailansicht im GitHub-Pages-Preview
  final visuell mit Live-Seite abgleichen
- mobile Darstellung aller Hauptseiten im Browser prüfen
- Light Mode und Dark Mode gegen lange Inhalte testen
- GitHub-Build nach der Shared-Logik-Zentralisierung prüfen

Betroffene Dateien:

- `frontend/src/features/`
- `frontend/src/styles/global.css`
- `docs/Codex/Datenqualitaetsmonitor_React_Live_Abgleich.md`

### 2. one.intelligence Mailfunktion fachlich finalisieren

Offen:

- Mailtexte gegen echte Datensätze fachlich prüfen
- Betreffzeilen vereinheitlichen
- prüfen, ob pro Kontext nur die relevanten Fehler in die Mail gehen
- optional Fallback vorsehen, falls `mailto:` lokal beim Nutzer nicht sauber öffnet

Betroffene Dateien:

- `frontend/src/shared/records/record-mail-draft.ts`
- `frontend/src/features/record-detail/RecordDetailPage.tsx`
- `routes/oi.js`
- `docs/Codex/Render_OI_Einrichtung.md`

### 3. KI-Suche UX-seitig schärfen

Erledigt:

- KI-Suche liefert IDs über one.intelligence
- IDs werden in Datensätze aufgelöst
- KI-Treffer laufen in der React-Preview durch die Qualitätskriterien

Offen:

- reale Themenanfragen weiter dokumentiert testen:
  `Museum`, `Wanderwege mit Hund`, `Familienausflug`, `Wellnesshotel`
- leere Ergebnisse, mehrdeutige Suchanfragen und Fehlermeldungen UX-seitig schärfen
- Ladezustände und Ergebniszusammenfassung weiter glätten

Betroffene Dateien:

- `frontend/src/features/records/RecordsPage.tsx`
- `frontend/src/features/records/records-api.ts`
- `routes/oi.js`

### 4. KI-Texte auf den aktuellen Produktstand ziehen

Offen:

- Mail- und Sucheinstieg kurz und verständlich dokumentieren
- spätere 3-Ebenen-Logik weiter fachlich vorbereiten:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`

Erledigt:

- Hilfeseite im React-Preview an die tatsächlich aktiven Kriterien angepasst
- Score-Erklärung, drei Fehler-Ebenen und Mindestanforderungen je Datentyp in der Preview umgesetzt

Betroffene Dateien:

- `Statistik/help.html`
- `frontend/src/features/help/HelpPage.tsx`
- `Statistik/scripts.js`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`

## Priorität B – Bewertungslogik erweitern

### 5. Weitere Kriterien sauber verifizieren und aktivieren

Erledigt:

- vorbereitete Hotel-, Gastro-, Tour- und Event-Kriterien als zentrale Server-Scan-Regeln aktiviert
- Count, Fehlerliste, Detailseite und Score nutzen dieselbe Regelbasis
- Event-Lizenzprüfung ist aktiv; ohne verifizierten Event-Pushdown läuft sie über Server-Scan-Fallback

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

### 6. POI-Ausschlusslogik gezielt erweitern

Offen:

- Preisregel und weitere sichere POI-Ausschlüsse gegen echte Daten absichern
- Ausschlüsse nur zentral in der Bewertungslogik erweitern, nicht im UI

Betroffene Dateien:

- `Statistik/quality.js`
- `routes/quality.js`

## Priorität C – UI und Betrieb

### 7. UI weiter glätten

Offen:

- React-Detailseite gegen echte Datensätze visuell mit der produktiven Detailseite vergleichen
- React-Detailseite auf mobile Darstellung, lange Texte, viele Medien und fehlende Felder prüfen
- Statistikseite weiter entschlacken
- Zustände, Ladeanimationen und Fehlermeldungen vereinheitlichen

### 8. Betrieb und Plattform

Offen:

- Render bleibt vorerst produktiver Proxy
- Vercel-Migration nur separat behandeln
- Cache-/Snapshot-Strategie erst wieder anfassen, wenn fachliche Logik stabil ist

## Priorität D – Architektur, Framework und Übergabe

### 9. Zielarchitektur für Übergabe und Eigenhosting festziehen

Erledigt:

- Ist-Architektur als Systemübersicht dokumentiert
- Zielarchitektur mit getrenntem Frontend und Backend festgelegt
- Verantwortlichkeiten für Frontend und Backend beschrieben
- Hosting-Zielbild für eigenen Server beschrieben

Ergebnis:

- `docs/Codex/Datenqualitaetsmonitor_Architektur_und_Zielbild.md`

### 10. Frontend-Migration auf Framework vorbereiten

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

### 11. Vor der Framework-Migration weitere Entkopplung im Bestand umsetzen

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

### 12. Framework-Übergang konkret vorbereiten

Bereits umgesetzt:

- neues `frontend/`-Grundgerüst parallel zum Bestand angelegt
- Routing, Shell und Arbeitskontext im neuen Frontend vorbereitet
- gemeinsamer API-Client-Grundrahmen für Search, Quality, Records und OI vorbereitet
- `Übersicht` migriert
- `Pflegeaufgaben` migriert
- `Datensätze` migriert
- `Datensatz-Detail` migriert
- `Open-Data-Statistik` migriert
- `Hilfe` migriert
- UI-Komponenten der Detailseite in eigene Dateien ausgelagert
- Hilfe-Seite nutzt das bestehende Qualitätsmodell für Datentyp-Anforderungen

Nächste Umsetzungsschritte:

1. alle React-Seiten systematisch gegen die Live-Seiten prüfen
2. API-Abrufe und Berechnungslogik je Seite mit dem Bestand vergleichen
3. UI-Abstände, Tabellen, Karten und mobile Darstellung an den Produktstand angleichen
4. fehlende Detailfunktionen nur gezielt nachziehen, keine neue Fachlogik erfinden
5. Alt-Frontend erst nach fachlicher Gleichheit kontrolliert ablösen

Aktueller Teilstand:

- alle heutigen Hauptseiten existieren als React-Pilotseiten
- die produktive Seite unter `Statistik/` bleibt unverändert aktiv
- der Preview-Pfad bleibt getrennt unter `/frontend-preview/`
- die zentralen Logikübergänge wurden am 2026-06-30 manuell als funktionierend bestätigt
- der nächste Schwerpunkt ist Build-Absicherung, UI-Abgleich und Übergabefähigkeit

Offene Prüfpunkte:

- GitHub-Build und Preview-Deployment prüfen
- Detailseite: lange Texte, viele Medien, fehlende Felder, externe IDs und Pflegesysteme visuell prüfen
- Übersicht: Kennzahlen für Sachsen vs. konkrete Gebiete weiter gegen Live-Zahlen beobachten
- Statistik: Open-Data-Zahlen und Lizenz-Pflegehinweis optisch gegen Live-Seite prüfen
- Hilfe: Verständlichkeit und Gewichtungslogik nach neuer fachlicher Gewichtung erneut prüfen
- Autocomplete im neuen Frontend nachziehen
- mobile Darstellung aller Seiten prüfen

Abgleich-Dokument:

- `docs/Codex/Datenqualitaetsmonitor_React_Live_Abgleich.md`

Wichtig:

- Alt-Frontend bleibt bis zur fachlichen Gleichheit produktiv
- Backend-Routen und Render-Konfiguration bleiben zunächst unverändert
- Qualitätslogik bleibt fachlich führend

### 13. Übergabedokumentation für Entwickler vorbereiten

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
