# Datenqualitätsmonitor - Offene TODOs

Stand: 2026-07-06

Diese Datei ist die aktive Arbeitsliste. Historische Langfassungen und
Nachweise liegen im Archiv.

## 1. Build und Preview absichern

Ziel: React-Preview stabil halten, ohne das produktive Bestandsfrontend unter
`Statistik/` zu gefährden.

Offen:

- Vercel-/GitHub-Build nach den letzten Qualitätslogik-Änderungen prüfen
- Detailseite, Pflegeaufgaben, Datensätze und Statistik gegen Live-Seite
  vergleichen
- UI-Abstände, Karten, Tabellen, Dropdowns und mobile Darstellung nachziehen
- Dark Mode und Light Mode mit langen Inhalten testen

Nachweis:

- `Datenqualitaetsmonitor_React_Live_Abgleich.md`

## 2. Qualitätslogik und API-Pushdowns

Ziel: Nur belastbare API-Pushdowns aktivieren; alles andere bleibt
`server_scan`.

Offen:

- `opening_hours_missing` mit `openings:*` für `POI` und `Gastro` prüfen
- `event_payment_options_missing` mit Feature-OR-Liste prüfen
- `hotel_features_missing` mit `feature:*` nur prüfen, wenn fachlich sinnvoll
- POI-Ausschlüsse für Preis und weitere sichere Kategorien fachlich absichern

Aktiviert:

- `license_missing` inklusive `Event`
- `gastro_cuisine_category_missing` über bestätigte `cuisine`-OR-Liste

Verworfen:

- Adress-, Beschreibung-, Teaser-, E-Mail-, Website-, Telefon- und
  Preis-Prefixe aus der META-Suche
- allgemeine Gastro-Küchenfelder wie `kitchenTimeIntervals:*`

Nachweis:

- `Datenqualitaetsmonitor_API_Pushdown_TODOs.md`

## 3. one.intelligence

Ziel: KI-Funktionen nutzbar halten, ohne API-Keys ins Frontend zu bringen.

Offen:

- Mailentwürfe gegen echte Datensätze fachlich prüfen
- Mailaktion nur in der Datensatz-Detailseite über Aktionen-Menü anbieten
- Betreff und Tonalität der Mailentwürfe finalisieren
- KI-Suche mit realen Themenanfragen weiter testen
- leere KI-Ergebnisse und Fehlermeldungen nutzerfreundlicher machen

Nachweise:

- `one_intelligence_Kontext_und_Fehlerbilder.md`
- `Render_OI_Einrichtung.md`

## 4. React-Migration

Ziel: Framework-Version übergabefähig und fachlich gleichwertig machen.

Offen:

- gemeinsame Qualitäts-, Link-, Formatierungs- und API-Helfer weiter sauber
  nutzen statt Seitenlogik zu duplizieren
- Detailseite und Fehlerlistenansicht weiter auf Live-Parität prüfen
- alte Vanilla-Module erst entfernen, wenn React funktional gleichwertig ist
- Entwicklerübergabe für Ordnerstruktur, API-Flüsse und Build-Prozess
  vorbereiten

Nachweise:

- `Datenqualitaetsmonitor_Architektur_und_Zielbild.md`
- `Datenqualitaetsmonitor_React_Live_Abgleich.md`

## 5. Betrieb

Ziel: aktuelle Betriebswege klar halten.

Offen:

- Render bleibt vorerst Backend-/Proxy-Betrieb
- Vercel kann das React-Frontend hosten, ersetzt aber nicht automatisch Render
- späteren eigenen Server als Zielarchitektur konkretisieren
- Cache-/Snapshot-Strategie erst wieder anfassen, wenn Bewertungslogik stabil
  ist

## Nicht aktiv bearbeiten

- Datenschutz/Consent im Hilfe-Bereich: später über Footer lösen
- alte GitHub-Pages-Preview-Anleitung: archiviert
- alter Frontend-Migrationsplan: archiviert
- alte Juni-Entscheidungen: archiviert

## Zuletzt erledigt

- Codex-Ordner bereinigt und alte Langdokumente archiviert
- API-Pushdown-TODOs auf offene Prüfungen reduziert
- Event-Lizenz als Pushdown aktiviert
- Gastro-Küchenarten auf `cuisine`-Pushdown umgestellt
- nicht belastbare META-Prefixe dokumentiert verworfen
