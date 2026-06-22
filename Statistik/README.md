# Statistik-Frontend

## Ordnerstruktur

- `core/`
  Gemeinsame Basisbausteine wie Konfiguration, URL-Builder, Formatierung,
  Request-Cache, Session-/View-State und gemeinsame Quellsystem-Logik.
  Wichtige Module:
  `api-config.js`, `api-urls.js`, `app-constants.js`, `app-state.js`,
  `consent-ui.js`, `context-shell-controller.js`, `page-bootstrap.js`,
  `page-initializers.js`, `page-shell.js`, `request-cache.js`,
  `runtime-helpers.js`,
  `source-systems.js`, `source-systems-bindings.js`,
  `source-systems-page-bindings.js`, `source-systems-ui.js`,
  `state-storage.js`.

- `overview/`
  Hilfs-, Daten-, UI- und Controller-Logik für die Übersichtsseite.
  Wichtige Module:
  `overview-controller.js`, `overview-data.js`, `overview-helpers.js`,
  `overview-page-bindings.js`, `overview-ui.js`.

- `tasks/`
  Aufgabenlogik, Aufgabenfamilien, Datenzugriffe, UI und zugehörige Texte.
  Wichtige Module:
  `task-controller.js`, `task-data.js`, `task-families.js`,
  `task-logic.js`, `task-texts.js`, `tasks-ui.js`.
  Ergänzende Bindings:
  `task-page-bindings.js`, `task-record-links.js`.

- `records/`
  Datensatzliste, Suche, KI-Suche, Mailentwurf, Filter und Seitennavigation.
  Wichtige Module:
  `record-api.js`, `record-communication.js`, `record-mail.js`,
  `records-actions.js`, `records-controller.js`,
  `records-page-bindings.js`, `records-page-controller.js`,
  `records-page-data.js`, `records-page-interactions.js`,
  `records-page-queries.js`, `records-page-search-bindings.js`,
  `records-page-state.js`, `records-page-view.js`,
  `records-data.js`, `records-filters.js`, `records-helpers.js`,
  `records-search.js`, `records-ui.js`.

- `detail/`
  Daten-, Hilfs-, UI- und Controller-Logik für die Datensatz-Detailseite.
  Wichtige Module:
  `record-detail-bindings.js`, `record-detail-page-bindings.js`,
  `record-detail-controller.js`, `record-detail-data.js`,
  `record-detail-helpers.js`, `record-detail-ui.js`.

- `help/`
  Hilfeseite und deren inhaltliche Rendering-Logik.
  Wichtige Module:
  `help-page.js`.

- `stats/`
  Seitenlogik für die Open-Data-Statistik.
  Wichtige Module:
  `stats-page.js`.

- `quality/`
  Frontend-Helfer für Qualitäts-API-Aufrufe.

## Einstiegsdateien

- `main.js`
  lädt das Frontend.

- `scripts.js`
  bleibt vorerst der Seiten-Orchestrator und verdrahtet die Fachmodule.

- `quality.js`
  enthält das fachliche Qualitätsmodell und die Bewertungslogik.

## Leitlinie

Neue Fachlogik soll nicht mehr direkt in `scripts.js` landen. Neue Bausteine
werden im passenden Unterordner angelegt und nur noch über den Orchestrator
verdrahtet.
