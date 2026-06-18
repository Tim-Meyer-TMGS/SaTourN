# Datenqualitätsmonitor – Frontend-Migrationsplan

Stand: 2026-06-18

## Zweck dieses Dokuments

Dieses Dokument beschreibt die konkrete Frontend-Zielstruktur für den
Datenqualitätsmonitor.

Es beantwortet für dieses Repository:

- welche Seiten in welche Module überführt werden sollen
- welche gemeinsamen Zustände künftig zentral verwaltet werden
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
- der bestehende Produktstand muss während der Umstellung benutzbar bleiben
- zuerst wird fachlich entkoppelt, dann technisch migriert

## Ausgangslage im aktuellen Frontend

Die aktuelle Frontend-Logik sitzt hauptsächlich in:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/task-logic.js`
- `Statistik/task-families.js`
- `Statistik/records-search.js`
- `Statistik/record-communication.js`
- `Statistik/record-mail.js`
- `Statistik/api-config.js`
- `Statistik/app-constants.js`

Aktive Ansichten:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Datensatz-Detail
- Open-Data-Statistik
- Hilfe

## Zielstruktur für das Frontend

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

### 1. Übersicht

Heutige Quelle:

- `Statistik/index.html`
- Teile aus `Statistik/scripts.js`

Zielmodul:

- `pages/overview/`

Verantwortung:

- KPI-Karten
- wichtigste Pflegeaufgaben
- Qualitätsstatus-Verteilung
- Open-Data-Status
- Hinweise zum Datenstand

### 2. Pflegeaufgaben

Heutige Quelle:

- `Statistik/tasks.html`
- Teile aus `Statistik/scripts.js`
- `Statistik/task-logic.js`
- `Statistik/task-families.js`

Zielmodul:

- `pages/tasks/`

Verantwortung:

- Aufgabenliste
- Gruppierung nach Aufgabenfamilien
- Auswahl nach Datentyp
- zugehörige Datensatzliste

### 3. Datensätze

Heutige Quelle:

- `Statistik/records.html`
- Teile aus `Statistik/scripts.js`
- `Statistik/records-search.js`
- `Statistik/record-communication.js`
- `Statistik/record-mail.js`

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
- Qualitätsprobleme
- Nutzbarkeit
- Texte
- Medien
- Kontakt- und Systeminformationen
- Listen-Navigation zurück

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

- Score verständlich erklären
- Fehler-Ebenen erklären
- Datentypbezogene Mindestanforderungen
- spätere 3-Ebenen-Kommunikation aufnehmen

## Ziel-Stores

Die künftige gemeinsame Zustandslogik sollte mindestens in folgende Stores
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
- Qualitätsaggregationen
- Übersichtsladezustand
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
- Aufgaben-Datensätze

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
- Suchzustände
- Filterzustände
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
- Rücksprung-Kontext
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

- globale Ladezustände
- globale Meldungen
- Dialogzustände
- Refresh-Markierung

Heutige Quelle:

- `markForceFresh()`
- `shouldForceFresh()`
- Dialoglogik
- Message-Logik

## Ziel-Services

Die API-Zugriffe sollen künftig nicht mehr direkt in Seitenkomponenten
liegen.

### 1. `context.service`

- Persistenz des Arbeitskontexts
- URL- und Session-Übergabe

### 2. `statistics.service`

- Statistik-Bestände
- Open-Data-Zahlen

### 3. `quality.service`

- Snapshot laden
- Quality-Counts
- Quality-Scans
- regionale Qualitätsbewertung

### 4. `tasks.service`

- Aufgaben aus Aggregationen ableiten
- Aufgabenlisten mit Metadaten anreichern

Hinweis:

- ein Teil davon bleibt fachlich im Qualitätsmodell, nicht im Service

### 5. `records.service`

- Datensatzlisten
- Filteranfragen
- Datensatzauflösung
- globale IDs auflösen

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

### Übersicht

- `KpiCard`
- `TopTaskList`
- `QualityDistributionCard`
- `OpenDataStatusCard`

### Pflegeaufgaben

- `TaskTable`
- `TaskDetailPanel`
- `TaskTypeSelect`
- `TaskRecordPreview`

### Datensätze

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

Zusätzliche Anforderungen:

- Query-Parameter für Filter müssen erhalten bleiben
- Pflegeaufgaben-Kontext muss sauber an `records` übergeben werden
- Rücksprung von Detailseite zur Liste muss stabil bleiben

## Migrationsreihenfolge

### Phase 1 – Vorarbeit im Bestand

- `scripts.js` weiter fachlich zerlegen
- Service-Grenzen im bestehenden Code schärfen
- State-Grenzen im bestehenden Code schärfen

### Phase 2 – Neue Frontend-Struktur anlegen

- Vue-App aufsetzen
- Router anlegen
- Stores definieren
- Basislayout bauen

### Phase 3 – Gemeinsame Shell migrieren

- Navigation
- Arbeitskontext
- globale Meldungen

### Phase 4 – Seiten schrittweise migrieren

Reihenfolge:

1. Übersicht
2. Pflegeaufgaben
3. Datensätze
4. Datensatz-Detail
5. Statistik
6. Hilfe

Diese Reihenfolge ist bewusst gewählt:

- Übersicht und Pflegeaufgaben tragen den Hauptfluss
- Datensätze und Detailseite hängen fachlich daran
- Statistik und Hilfe sind fachlich wichtig, aber weniger kritisch für den
  Hauptnutzungsfluss

## Dokumentationsregel für die Migration

Für jeden späteren Migrationsschritt müssen folgende Punkte festgehalten
werden:

- betroffene Seite oder Komponente
- fachlicher Zweck
- übernommene Datenquellen
- ersetzte Altdateien oder Altfunktionen
- offene Abweichungen zum Bestand
- bekannte Risiken

## Nächste konkrete Folgeschritte

Aus diesem Dokument folgen als nächste sinnvolle Schritte:

1. `scripts.js` weiter nach Store-/Service-/Seitenlogik entkoppeln
2. Zielmodule gegen die aktuelle Datei- und Zustandslage abgleichen
3. danach die technische Vue-Grundstruktur vorbereiten
