# Datenqualitätsmonitor – Frontend-Migrationsplan

Stand: 2026-06-22

## Zweck dieses Dokuments

Dieses Dokument beschreibt die verbindliche Zielrichtung für den Übergang des
Statistik-Frontends auf ein Framework.

Es beantwortet für dieses Repository:

- welches Framework eingesetzt werden soll
- wie die Zielstruktur des Frontends aussieht
- welche fachlichen Bereiche zuerst migriert werden
- welche Teile vorerst stabil bleiben
- wie der Bestand schrittweise in eine übergabefähige Architektur überführt wird

## Technische Zielrichtung

Empfohlener Zielstack:

- `React`
- `Vite`
- `TypeScript`
- `React Router`
- `Zustand` oder alternativ `Redux Toolkit` nur bei später wachsender Komplexität

Festgelegte Arbeitsentscheidung:

- Für den ersten Migrationsschritt wird mit `React + Vite + TypeScript`
  geplant.
- Das bestehende Render-Backend bleibt bestehen.
- Die bestehende Qualitätslogik bleibt fachlich führend und wird nicht parallel
  neu erfunden.

Begründung:

- große Entwicklerverfügbarkeit
- gute Übergabefähigkeit an externe Teams
- klar lesbare Komponenten- und Hook-Struktur
- einfache lokale Entwicklung
- problemloser Betrieb hinter dem bestehenden Proxy
- später sauber auf eigenem Server betreibbar

## Migrationsgrundsatz

Die Migration erfolgt nicht als Big Bang.

Reihenfolge:

1. Bestehenden Code weiter entkoppeln
2. Neues Framework-Frontend parallel aufsetzen
3. Gemeinsame API- und State-Grenzen festziehen
4. Erste Pilotseite migrieren
5. Weitere Seiten kontrolliert überführen
6. Alt-Frontend erst entfernen, wenn fachliche Gleichheit erreicht ist

Wichtig:

- Der aktuelle Produktstand muss während der Migration benutzbar bleiben.
- Backend, API-Wege und Secrets bleiben zunächst unverändert.
- Die Framework-Migration ist ein Strukturprojekt, kein fachlicher Neubau.

## Zielstruktur für das neue Frontend

Empfohlene Ordnerstruktur:

```text
frontend/
  src/
    app/
      router/
      providers/
      layout/
    features/
      overview/
      tasks/
      records/
      record-detail/
      stats/
      help/
    shared/
      api/
      state/
      ui/
      quality/
      utils/
      content/
      hooks/
      types/
    styles/
    main.tsx
  public/
```

## Zielgrenzen im Code

### 1. `app/`

Verantwortung:

- App-Start
- Router
- globale Provider
- Seitenlayout
- Seitennavigation
- Shell-Struktur

### 2. `features/`

Verantwortung:

- fachliche Seitenlogik pro Bereich
- seitennahe Komponenten
- Feature-spezifische Hooks
- Feature-spezifische View-Model-Transformationen

### 3. `shared/api/`

Verantwortung:

- HTTP-Client
- API-Endpunkte
- Request-Fehlerbehandlung
- Timeouts
- Response-Normalisierung

### 4. `shared/state/`

Verantwortung:

- globaler Arbeitskontext
- UI-Zwischenzustände
- Persistenz in Session/Local Storage
- spätere gemeinsame Selektoren

### 5. `shared/quality/`

Verantwortung:

- Einbindung der Qualitätslogik
- fachliche Transformationen für Score, Kriterien und Status
- keine direkte Vermischung mit UI-Komponenten

### 6. `shared/ui/`

Verantwortung:

- wiederverwendbare Oberflächenbausteine
- Tabellen
- Dialoge
- Status-Badges
- Ladezustände
- Fehlermeldungen
- Paginierung

## Was vorerst stabil bleibt

Diese Teile werden zunächst nicht grundlegend umgebaut:

- `routes/search.js`
- `routes/records.js`
- `routes/quality.js`
- `routes/oi.js`
- bestehende Render-Konfiguration
- bestehende API-Keys und Secrets
- fachliche Kriterienbasis in `Statistik/quality.js`

Das ist absichtlich konservativ.
Der Frontend-Übergang soll zuerst die Wartbarkeit und Übergabe verbessern, ohne
gleichzeitig das Betriebsmodell zu destabilisieren.

## Erste Pilotseite

Die erste echte Migrationsseite soll `Datensätze` sein.

Begründung:

- höchste Interaktionsdichte
- Suchlogik, Filter, Paging und Tabellenzustände sind dort bereits komplex
- AI-Suche und Mailfunktion hängen daran
- Datensatzseite zwingt zu sauberem Routing, State und API-Schnittstellen

Wenn `Datensätze` sauber im Framework steht, ist die Grundarchitektur belastbar.

## Zielmodule je Fachbereich

### 1. Übersicht

Zielmodul:

- `features/overview/`

Verantwortung:

- KPI-Karten
- wichtigste Pflegeaufgaben
- Qualitätsstatus-Verteilung
- Open-Data-Status
- Lade- und Leerzustände

### 2. Pflegeaufgaben

Zielmodul:

- `features/tasks/`

Verantwortung:

- Aufgabenliste
- Filter
- Typkontext
- Verlinkung in Datensatzlisten

### 3. Datensätze

Zielmodul:

- `features/records/`

Verantwortung:

- Volltextsuche
- ID-Suche
- AI-Suche
- Pflegeaufgaben-Filter
- Tabellenansicht
- CSV-Export
- Mailaktion

### 4. Datensatz-Detail

Zielmodul:

- `features/record-detail/`

Verantwortung:

- Detailkopf
- Qualitätsprobleme
- Kriterienstatus
- Inhalte, Medien und Kontaktdaten
- Rücknavigation in die Liste

### 5. Open-Data-Statistik

Zielmodul:

- `features/stats/`

Verantwortung:

- Bestandszahlen
- Datentypverteilung
- Open-Data-Quote
- Export

### 6. Hilfe

Zielmodul:

- `features/help/`

Verantwortung:

- Score-Erklärung
- Fehler-Ebenen
- Mindestanforderungen pro Datentyp
- spätere 3-Ebenen-Kommunikation

## Geplante Stores und gemeinsamer State

### 1. `context-store`

Verantwortung:

- Gebiet
- Ort
- Datentyp
- Persistenz des Arbeitskontexts

### 2. `records-store`

Verantwortung:

- Suchzustand
- Filterzustand
- Paginierung
- AI-Suchmodus
- Datensatzliste

### 3. `tasks-store`

Verantwortung:

- Aufgabenfilter
- selektierte Aufgabe
- Aufgaben-Datensätze

### 4. `overview-store`

Verantwortung:

- KPI-Daten
- Qualitätsaggregationen
- Ladezustände

### 5. `stats-store`

Verantwortung:

- Statistikfilter
- Statistikdaten
- Exporte

### 6. `ui-store`

Verantwortung:

- globale Dialogzustände
- Ladehinweise
- Toasts oder Systemmeldungen

## API-Grenzen für das neue Frontend

Das neue Frontend soll keine API-Aufrufe direkt in Komponenten verstreuen.

Geplante Services:

- `searchApi`
- `recordsApi`
- `qualityApi`
- `oiApi`
- `autocompleteApi`

Jeder Service soll:

- Request-Aufbau kapseln
- Timeouts zentral setzen
- Fehler einheitlich normalisieren
- keine DOM-Logik enthalten

## Konkrete Migrationsreihenfolge

### Schritt 1 – Vorbereitende Entkopplung im Bestand abschließen

Ziel:

- `scripts.js` weiter verkleinern
- Wrapper und Doppeldelegationen entfernen
- Seitengrenzen schärfen

### Schritt 2 – Neues Frontend-Gerüst parallel anlegen

Ziel:

- `frontend/` neu anlegen
- Vite-, React- und TypeScript-Setup
- Basisrouting
- Grundlayout

### Schritt 3 – Gemeinsamen API-Client aufbauen

Ziel:

- Fetch-Wrapper
- Timeout-Strategie
- Fehlerformat
- Basis-Endpoints aus Runtime-Konfiguration

### Schritt 4 – Arbeitskontext migrieren

Ziel:

- Kontextstore
- Persistenz
- Shell-Anzeige
- Seitenübergreifende Nutzung

### Schritt 5 – `Datensätze` als Pilotseite migrieren

Ziel:

- Suche
- Filter
- Paging
- Pflegeaufgaben-Verknüpfung
- AI-Suche
- Mailaktion

### Schritt 6 – `Datensatz-Detail` migrieren

Ziel:

- gleiche Bewertungslogik
- gleiche Rückverlinkung
- klare Komponentenstruktur

### Schritt 7 – `Pflegeaufgaben` migrieren

Ziel:

- Aufgabenliste
- Aufgabendetails
- Verlinkung in Datensatzlisten

### Schritt 8 – `Übersicht` und `Open-Data-Statistik` migrieren

Ziel:

- KPI-Darstellung
- Diagramm- und Statistikflächen
- Exportpfade

### Schritt 9 – `Hilfe` migrieren

Ziel:

- Inhalte aus Logik herauslösen
- produktnahe Nutzerhilfe pflegen

### Schritt 10 – Alt-Frontend kontrolliert ablösen

Voraussetzung:

- alle Hauptseiten fachlich gleichwertig
- Routing vollständig
- Regressionstests bestanden

## Definition of Done für die Migration

Die Framework-Migration gilt erst dann als erfolgreich, wenn:

- der Arbeitskontext seitenübergreifend stabil funktioniert
- Datensatzsuche, Pflegeaufgaben und Detailseite fachlich gleich arbeiten
- AI-Suche und Mailfunktion weiter über den bestehenden Proxy laufen
- Qualitätsstatus und Prüfkriterien identisch zum Altbestand bleiben
- Entwickler das Frontend lokal mit klarer Anleitung starten können
- der Code ohne Kenntnis von `scripts.js` verständlich wartbar ist

## Offene Architekturentscheidungen

Noch zu entscheiden:

- `Zustand` oder `Redux Toolkit` als endgültiger Store
- Teststrategie für das neue Frontend:
  - `Vitest`
  - `React Testing Library`
  - optional später End-to-End-Tests
- Styling-Strategie:
  - bestehendes CSS weiterverwenden und modularisieren
  - oder schrittweise in komponentennahe Styles überführen

## Empfehlung für den nächsten konkreten Arbeitsschritt

Als Nächstes soll kein UI umgebaut werden.

Der nächste konkrete Schritt ist:

1. `React + Vite + TypeScript` als Zielarchitektur dokumentarisch festziehen
2. `scripts.js` weiter als Orchestrierungsdatei reduzieren
3. danach ein neues `frontend/`-Grundgerüst parallel anlegen
4. anschließend `Datensätze` als Pilotseite migrieren
