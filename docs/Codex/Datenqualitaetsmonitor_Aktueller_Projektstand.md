# Datenqualitätsmonitor - Aktueller Projektstand

Stand: 2026-07-06

## Kurzfassung

Der Datenqualitätsmonitor besteht aktuell aus drei Arbeitsbereichen:

- produktives Bestandsfrontend unter `Statistik/`
- neues React/Vite/TypeScript-Frontend unter `frontend/`
- geschützter Node/Express-Proxy mit Render als aktueller Backend-Betrieb

Das Bestandsfrontend bleibt nutzbar, bis die React-Version fachlich und
grafisch gleichwertig ist. Secrets bleiben serverseitig und werden nicht ins
Frontend ausgeliefert.

## Aktiver Betrieb

- Frontend alt: `Statistik/*.html`
- Frontend neu: `frontend/`
- Backend-Proxy: `index.js`, `routes/*.js`
- Produktiver Proxy: Render
- Perspektivisches Frontend-Hosting: Vercel oder eigener Server

## Fachliche Regelbasis

- Zentrale Kriterienlogik: `Statistik/quality.js`
- Backend-Count- und Scan-Logik: `routes/quality.js`
- React nutzt die bestehende Qualitätslogik weiter, statt sie neu zu erfinden.
- API-Pushdowns werden nur aktiviert, wenn `positive + missing = baseline`
  fachlich und technisch bestätigt ist.
- Nicht belastbare Prefixe bleiben `server_scan`.

## Aktuell verifizierte API-Pushdowns

- Open-Data-Lizenz inklusive `Event`
- Gastro-Küchenarten über eine bestätigte `cuisine`-OR-Liste

Offene Pushdown-Prüfungen stehen in:

- `Datenqualitaetsmonitor_API_Pushdown_TODOs.md`

## React-Frontend

Bereits migrierte beziehungsweise pilotierte Hauptbereiche:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Datensatz-Detail
- Open-Data-Statistik
- Hilfe

Der laufende Abgleich gegen das Bestandsfrontend steht in:

- `Datenqualitaetsmonitor_React_Live_Abgleich.md`

## KI-Funktionen

- one.intelligence läuft über eigene Backend-Routen unter `routes/oi.js`.
- Der `OI_API_KEY` bleibt getrennt vom bestehenden Meta-Key.
- KI-Suche liefert IDs und diese werden anschließend normal über die
  Datensatz- und Qualitätslogik bewertet.
- Mailfunktion erzeugt Mailvorschläge, versendet aber keine Mails.

## Aktive Arbeitsliste

Die maßgebliche ToDo-Liste ist:

- `Datenqualitaetsmonitor_Offene_TODOs.md`

Alte Projektstände, frühere Migrationspläne und historische Entscheidungen
liegen im Archiv und sollen nur bei konkreten Nachweisfragen gelesen werden.
