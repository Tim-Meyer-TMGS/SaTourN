# DatenqualitÃ¤tsmonitor â€“ Frontend-Migrationsplan

Stand: 2026-06-18

## Zweck dieses Dokuments

Dieses Dokument beschreibt die konkrete Frontend-Zielstruktur fÃ¼r den
DatenqualitÃ¤tsmonitor.

Es beantwortet fÃ¼r dieses Repository:

- welche Seiten in welche Module Ã¼berfÃ¼hrt werden sollen
- welche gemeinsamen ZustÃ¤nde kÃ¼nftig zentral verwaltet werden
- welche Services vom UI getrennt werden sollen
- welche wiederverwendbaren Komponenten gebraucht werden
- in welcher Reihenfolge die Migration fachlich sinnvoll ist

## Technische Zielrichtung

Empfohlener Zielstack:

- `Vue 3`
- `Vite`
- `Vue Router`
- `Pinia`

Wichtig:

- dies ist ein Migrationsziel, kein sofortiger Komplettumbau
- der bestehende Produktstand muss wÃ¤hrend der Umstellung benutzbar bleiben
- zuerst wird fachlich entkoppelt, dann technisch migriert

## Ausgangslage im aktuellen Frontend

Die aktuelle Frontend-Logik sitzt hauptsÃ¤chlich in:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/tasks/task-logic.js`
- `Statistik/tasks/task-families.js`
- `Statistik/records/records-search.js`
- `Statistik/records/record-communication.js`
- `Statistik/records/record-mail.js`
- `Statistik/core/api-config.js`
- `Statistik/core/app-constants.js`

Aktive Ansichten:

- Ãœbersicht
- Pflegeaufgaben
- DatensÃ¤tze
- Datensatz-Detail
- Open-Data-Statistik
- Hilfe

## Zielstruktur fÃ¼r das Frontend

Empfohlene Ordnerstruktur:

```text
frontend/
  src/
    app/
      router/
      layout/
    pages/
      overview/
      tasks/
      records/
      record-detail/
      stats/
      help/
    components/
      shell/
      context/
      kpi/
      tasks/
      records/
      detail/
      stats/
      help/
      common/
    stores/
    services/
    content/
    utils/
    styles/
```

## Zielseiten und Seitengrenzen

### 1. Ãœbersicht

Heutige Quelle:

- `Statistik/index.html`
- Teile aus `Statistik/scripts.js`

Zielmodul:

- `pages/overview/`

Verantwortung:

- KPI-Karten
- wichtigste Pflegeaufgaben
- QualitÃ¤tsstatus-Verteilung
- Open-Data-Status
- Hinweise zum Datenstand

### 2. Pflegeaufgaben

Heutige Quelle:

- `Statistik/tasks.html`
- Teile aus `Statistik/scripts.js`
- `Statistik/tasks/task-logic.js`
- `Statistik/tasks/task-families.js`

Zielmodul:

- `pages/tasks/`

Verantwortung:

- Aufgabenliste
- Gruppierung nach Aufgabenfamilien
- Auswahl nach Datentyp
- zugehÃ¶rige Datensatzliste

### 3. DatensÃ¤tze

Heutige Quelle:

- `Statistik/records.html`
- Teile aus `Statistik/scripts.js`
- `Statistik/records/records-search.js`
- `Statistik/records/record-communication.js`
- `Statistik/records/record-mail.js`

Zielmodul:

- `pages/records/`

Verantwortung:

- Volltextsuche
- ID-Suche
- AI-Suche
- Filter
- Datensatzliste
- CSV
- Mailaktion

### 4. Datensatz-Detail

Heutige Quelle:

- `Statistik/record-detail.html`
- Teile aus `Statistik/scripts.js`

Zielmodul:

- `pages/record-detail/`

Verantwortung:

- Detailkopf
- QualitÃ¤tsprobleme
- Nutzbarkeit
- Texte
- Medien
- Kontakt- und Systeminformationen
- Listen-Navigation zurÃ¼ck

### 5. Open-Data-Statistik

Heutige Quelle:

- `Statistik/stats.html`
- Teile aus `Statistik/scripts.js`

Zielmodul:

- `pages/stats/`

Verantwortung:

- Bestandszahlen
- Datentypverteilung
- Open-Data-Quote
- Export

### 6. Hilfe

Heutige Quelle:

- `Statistik/help.html`
- Teile aus `Statistik/scripts.js`

Zielmodul:

- `pages/help/`

Verantwortung:

- Score verstÃ¤ndlich erklÃ¤ren
- Fehler-Ebenen erklÃ¤ren
- Datentypbezogene Mindestanforderungen
- spÃ¤tere 3-Ebenen-Kommunikation aufnehmen

## Ziel-Stores

Die kÃ¼nftige gemeinsame Zustandslogik sollte mindestens in folgende Stores
zerlegt werden.

### 1. `useContextStore`

Verantwortung:

- Arbeitskontext
- Gebiet
- Ort
- Datentyp
- Persistenz des Arbeitskontexts

Heutige Quelle:

- `state.context`
- `loadWorkContext()`
- `saveWorkContext()`

### 2. `useOverviewStore`

Verantwortung:

- KPI-Daten
- QualitÃ¤tsaggregationen
- Ãœbersichtsladezustand
- Datenstand-Hinweise

Heutige Quelle:

- `state.latestRows`
- `state.normalizedItems`
- `state.qualityAggregations`
- `state.qualityDataMeta`

### 3. `useTasksStore`

Verantwortung:

- Aufgabenliste
- Filter auf Aufgaben
- selektierte Aufgabe
- selektierter Aufgabentyp
- Aufgaben-DatensÃ¤tze

Heutige Quelle:

- `state.taskItems`
- `state.taskRows`
- `state.filteredTaskRows`
- `state.selectedTask`
- `state.selectedTaskType`
- `state.taskRecordRows`

### 4. `useRecordsStore`

Verantwortung:

- Datensatzliste
- SuchzustÃ¤nde
- FilterzustÃ¤nde
- AI-Suche
- Paging
- Record-View-State

Heutige Quelle:

- `state.recordItems`
- `state.recordRows`
- `state.filteredRecordRows`
- `state.recordPage`
- `state.recordRowsPerPage`
- `state.pendingRecordView`
- `state.recordAiSearchPrompt`

### 5. `useRecordDetailStore`

Verantwortung:

- geladener Datensatz
- Detail-View-Model
- RÃ¼cksprung-Kontext
- Detail-Ladezustand

Heutige Quelle:

- `state.recordDetailItem`
- `state.recordDetailViewModel`

### 6. `useStatsStore`

Verantwortung:

- Statistikdaten
- Statistikfilter
- Quoten und Summen

Heutige Quelle:

- `state.statsRows`
- `state.statsSummary`

### 7. `useUiStore`

Verantwortung:

- globale LadezustÃ¤nde
- globale Meldungen
- DialogzustÃ¤nde
- Refresh-Markierung

Heutige Quelle:

- `markForceFresh()`
- `shouldForceFresh()`
- Dialoglogik
- Message-Logik

## Ziel-Services

Die API-Zugriffe sollen kÃ¼nftig nicht mehr direkt in Seitenkomponenten
liegen.

### 1. `context.service`

- Persistenz des Arbeitskontexts
- URL- und Session-Ãœbergabe

### 2. `statistics.service`

- Statistik-BestÃ¤nde
- Open-Data-Zahlen

### 3. `quality.service`

- Snapshot laden
- Quality-Counts
- Quality-Scans
- regionale QualitÃ¤tsbewertung

### 4. `tasks.service`

- Aufgaben aus Aggregationen ableiten
- Aufgabenlisten mit Metadaten anreichern

Hinweis:

- ein Teil davon bleibt fachlich im QualitÃ¤tsmodell, nicht im Service

### 5. `records.service`

- Datensatzlisten
- Filteranfragen
- DatensatzauflÃ¶sung
- globale IDs auflÃ¶sen

### 6. `search.service`

- Autocomplete
- ID-/Textsuche

### 7. `oi.service`

- AI-Suche
- Mailentwurf

## Ziel-Komponenten

Die folgenden UI-Bausteine sollten als wiederverwendbare Komponenten geplant
werden.

### Shell und Navigation

- `AppShell`
- `SideNavigation`
- `TopContextBar`
- `LastUpdatedBadge`

### Gemeinsame UI-Bausteine

- `LoadingState`
- `EmptyState`
- `ErrorState`
- `StatusBadge`
- `TypeChip`
- `PrimarySystemLogo`
- `ActionIconButton`
- `FilterToolbar`
- `PaginationControl`

### Ãœbersicht

- `KpiCard`
- `TopTaskList`
- `QualityDistributionCard`
- `OpenDataStatusCard`

### Pflegeaufgaben

- `TaskTable`
- `TaskDetailPanel`
- `TaskTypeSelect`
- `TaskRecordPreview`

### DatensÃ¤tze

- `RecordSearchBar`
- `RecordAiSearchDialog`
- `RecordFilterPanel`
- `RecordTable`
- `RecordQuickFilters`
- `RecordStatusLegend`

### Datensatz-Detail

- `RecordHeaderCard`
- `RecordIssueList`
- `RecordUsabilityGrid`
- `RecordTextSection`
- `RecordMediaSection`
- `RecordInfoSection`
- `RecordCriteriaSection`

### Statistik

- `StatsSummaryCards`
- `StatsTypeDistribution`
- `StatsQuoteBars`
- `StatsLicenseTaskCard`

### Hilfe

- `HelpSeverityGrid`
- `HelpTypeCard`
- `HelpCriteriaList`

## Ziel-Routing

Empfohlene Zielrouten:

- `/`
- `/tasks`
- `/records`
- `/record/:type/:id`
- `/stats`
- `/help`

ZusÃ¤tzliche Anforderungen:

- Query-Parameter fÃ¼r Filter mÃ¼ssen erhalten bleiben
- Pflegeaufgaben-Kontext muss sauber an `records` Ã¼bergeben werden
- RÃ¼cksprung von Detailseite zur Liste muss stabil bleiben

## Migrationsreihenfolge

### Phase 1 â€“ Vorarbeit im Bestand

- `scripts.js` weiter fachlich zerlegen
- Service-Grenzen im bestehenden Code schÃ¤rfen
- State-Grenzen im bestehenden Code schÃ¤rfen

### Phase 2 â€“ Neue Frontend-Struktur anlegen

- Vue-App aufsetzen
- Router anlegen
- Stores definieren
- Basislayout bauen

### Phase 3 â€“ Gemeinsame Shell migrieren

- Navigation
- Arbeitskontext
- globale Meldungen

### Phase 4 â€“ Seiten schrittweise migrieren

Reihenfolge:

1. Ãœbersicht
2. Pflegeaufgaben
3. DatensÃ¤tze
4. Datensatz-Detail
5. Statistik
6. Hilfe

Diese Reihenfolge ist bewusst gewÃ¤hlt:

- Ãœbersicht und Pflegeaufgaben tragen den Hauptfluss
- DatensÃ¤tze und Detailseite hÃ¤ngen fachlich daran
- Statistik und Hilfe sind fachlich wichtig, aber weniger kritisch fÃ¼r den
  Hauptnutzungsfluss

## Dokumentationsregel fÃ¼r die Migration

FÃ¼r jeden spÃ¤teren Migrationsschritt mÃ¼ssen folgende Punkte festgehalten
werden:

- betroffene Seite oder Komponente
- fachlicher Zweck
- Ã¼bernommene Datenquellen
- ersetzte Altdateien oder Altfunktionen
- offene Abweichungen zum Bestand
- bekannte Risiken

## NÃ¤chste konkrete Folgeschritte

Aus diesem Dokument folgen als nÃ¤chste sinnvolle Schritte:

1. `scripts.js` weiter nach Store-/Service-/Seitenlogik entkoppeln
2. Zielmodule gegen die aktuelle Datei- und Zustandslage abgleichen
3. danach die technische Vue-Grundstruktur vorbereiten
