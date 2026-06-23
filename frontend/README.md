# SaTourN Frontend

Dieses Verzeichnis enthält das neue Frontend-Grundgerüst für die geplante
Migration auf `React + Vite + TypeScript`.

## Ziel

Das bestehende Frontend unter `Statistik/` bleibt vorerst produktiv. Dieses
Verzeichnis dient als paralleler Migrationspfad.

## Lokal starten

```bash
cd frontend
npm install
npm run dev
```

## GitHub-Pages-Preview

Der Pages-Workflow baut das Frontend zusätzlich zur bestehenden Jekyll-Seite und
veröffentlicht es unter:

```text
https://tim-meyer-tmgs.github.io/SaTourN/frontend-preview/
```

Die bestehende Live-Seite unter `/SaTourN/Statistik/index.html` bleibt davon
unberührt.

## Aktueller Stand

- React-/Vite-/TypeScript-Grundgerüst angelegt
- Router, Shell, Arbeitskontext-Store und API-Basis angelegt
- erste Records-Pilotseite mit Suche, KI-Suche, Qualitätsbewertung und Mailentwurf
- React-Detailseite mit Datensatzauflösung, 3-Spalten-Layout, Qualitätsbewertung, Medien, Nutzbarkeit, Detailfeldern und Listen-Navigation
- gemeinsame Feldnormalisierung unter `src/shared/records/record-fields.ts`
- weitere Seiten noch als Platzhalter oder Teilmigration

## Nächster Umsetzungsschritt

Records- und Detailseite werden weiter gegen echte Daten und die Live-Seiten abgeglichen.
Neue Feldzugriffe sollen über `src/shared/records/record-fields.ts` laufen,
damit Listen- und Detailansicht dieselbe Normalisierung nutzen.
