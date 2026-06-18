# Statistik-Frontend

## Ordnerstruktur

- `core/`
  Gemeinsame Basisbausteine wie Konfiguration, URL-Builder, Formatierung,
  Request-Cache und Session-/View-State.

- `records/`
  Datensatzliste, Suche, KI-Suche, Mailentwurf und Navigation zwischen
  Pflegeaufgaben, Übersicht und Datensatzansicht.
  Wichtige Module:
  `records-actions.js`, `records-controller.js`, `records-data.js`,
  `records-filters.js`, `records-ui.js`.

- `detail/`
  Hilfs- und UI-Logik für die Datensatz-Detailseite.

- `overview/`
  Hilfs- und UI-Logik für die Übersichtsseite.

- `tasks/`
  Aufgabenlogik, Aufgabenfamilien, UI und zugehörige Texte.

- `quality/`
  Frontend-Helfer für Qualitäts-API-Aufrufe.

## Einstiegsdateien

- `main.js`
  lädt das Frontend.

- `scripts.js`
  bleibt vorerst der Seiten-Orchestrator und bindet die Module zusammen.

- `quality.js`
  enthält das fachliche Qualitätsmodell und die Bewertungslogik.

## Leitlinie

Neue Hilfslogik soll nicht mehr direkt in `scripts.js` landen, wenn sie klar zu
einem Fachbereich gehört. Neue Module werden im passenden Unterordner
angelegt und nur noch über `scripts.js` oder andere zuständige Module
verdrahtet.
