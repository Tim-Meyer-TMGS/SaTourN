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

Unterseiten werden auf GitHub Pages per Hash-Routing geöffnet, zum Beispiel:

```text
https://tim-meyer-tmgs.github.io/SaTourN/frontend-preview/#/tasks
```

Die bestehende Live-Seite unter `/SaTourN/Statistik/index.html` bleibt davon
unberührt.

## Aktueller Stand

- React-/Vite-/TypeScript-Grundgerüst angelegt
- Router, Shell, Arbeitskontext-Store und API-Basis angelegt
- persistenter Light-/Dark-Mode in der React-Shell
- Overview-Pilotseite mit KPI-Karten, Open-Data-Status, wichtigsten Pflegeaufgaben, Schnellzugriffen und deduplizierter Qualitätszusammenfassung für konkrete Arbeitskontexte
- Pflegeaufgaben-Pilotseite mit KPI-Zeile, Filtern, gruppierten Aufgaben, Detailspalte und Übergabe in die Datensatzliste
- erste Records-Pilotseite mit Suche, KI-Suche, Qualitätsbewertung, Mailentwurf und gefiltertem Detailkontext
- React-Detailseite mit Datensatzauflösung, 3-Spalten-Layout, Qualitätsbewertung, Medien, Nutzbarkeit, Pflegesystem-Logo, erweiterten Detailfeldern und kontextbezogener Listen-Navigation
- Open-Data-Statistik-Pilotseite mit Bestandskennzahlen, Datentypverteilung, Open-Data-Quote nach Typ und Lizenz-Pflegehinweis
- Hilfe-Pilotseite mit Score-Erklärung, drei Fehler-Ebenen und Mindestanforderungen je Datentyp aus dem bestehenden Qualitätsmodell
- gemeinsame Feldnormalisierung unter `src/shared/records/record-fields.ts`
- gemeinsame Bewertungsbasis für Records- und Detailseite über `buildQualityEvaluationInput`
- Detailseiten-Mapping und Detail-UI in `src/features/record-detail/record-detail-mapper.ts` und `record-detail-components.tsx` getrennt
- weitere Bereiche nur noch dort als Teilmigration, wo Detailverhalten gegen echte Daten abgeglichen werden muss

## Nächster Umsetzungsschritt

Overview-, Pflegeaufgaben-, Records-, Detail-, Statistik- und Hilfeseite werden weiter gegen echte Daten und die Live-Seiten abgeglichen.
Neue Feldzugriffe sollen über `src/shared/records/record-fields.ts` laufen,
damit Listen- und Detailansicht dieselbe Normalisierung nutzen.
Bewertungsrelevante Datensatzobjekte sollen über `buildQualityEvaluationInput`
gebaut werden, damit Liste und Detail denselben Score berechnen.
Die Overview-Seite darf Pflegebedarf nicht aus einzelnen Fehlercounts summieren;
für berechnete Qualitätskennzahlen ist `/api/quality/summary` maßgeblich.
