# Datenqualitätsmonitor - Snapshot-Architektur

Stand: 2026-07-14

## Ziel

Qualitätsübersicht, Pflegeaufgaben und Open-Data-Statistik sollen ohne einen
vollständigen Live-Scan beim Seitenaufruf laden. Render bleibt der geschützte
Proxy für Detailabrufe, KI-Funktionen und Live-Fallbacks.

Die bestehende Bewertungslogik in `Statistik/quality.js` bleibt die einzige
fachliche Quelle. Der Snapshot-Job verwendet dieselbe Logik und erzeugt keine
abweichende Bewertung.

## Datenfluss

```text
GitHub Actions
  -> Snapshot-Job
  -> bestehender Render-Suchproxy
  -> Destination.One / META
  -> statische JSON-Dateien
  -> GitHub Pages
  -> React-Frontend

Bei fehlendem Snapshot:
React-Frontend -> Render -> bestehende Live-Endpunkte
```

## Vorhandene und neue Bausteine

- `scripts/run-quality-snapshot.mjs`: Scan- und Bewertungslogik, jetzt als
  `runQualitySnapshot()` aufrufbar
- `scripts/run-quality-snapshot-cli.mjs`: CLI-Parameter und Jobstart
- `lib/quality-snapshot-contract.js`: Schema-Version und Manifest
- `lib/quality-snapshot-store.js`: Auswahl von Redis, Memory-Dry-Run oder Datei
- `lib/file-key-value-store.js`: atomare JSON-Dateien und öffentliche Pfade
- `config/quality-snapshot-contexts.json`: Sachsen und auswählbare Gebiete

## Dateistruktur

```text
quality-snapshots/
  index.json
  snapshots/
    <stabiler-hash>.json
  lists/
    <stabiler-hash>.json
```

`index.json` wird zuletzt geschrieben und ist der Veröffentlichungspunkt. Ein
Frontend darf nur Dateien verwenden, die über dieses Manifest referenziert
werden.

## Manifest

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-14T20:00:00.000Z",
  "complete": true,
  "storageMode": "file",
  "contexts": [
    {
      "label": "Erzgebirge",
      "context": { "query": "area:\"Erzgebirge\"", "type": "" },
      "path": "snapshots/<hash>.json",
      "complete": true,
      "totalRecords": 0,
      "openDataRecords": 0,
      "scannedItems": 0,
      "listCaches": 0
    }
  ]
}
```

Die Zahlen im Beispiel sind Platzhalter. Veröffentlicht werden ausschließlich
die Werte des abgeschlossenen Jobs.

## Snapshot-Vertrag

Jeder Kontext-Snapshot enthält:

- `schemaVersion`, `generatedAt`, `complete`
- normalisierten Arbeitskontext
- Gesamt- und Open-Data-Zahlen je Datentyp
- Qualitätsstatus und durchschnittlichen Score
- aggregierte Pflegeaufgaben
- Metadaten zu Scan-Vollständigkeit und Begrenzungen
- Verweise auf vorbereitete Fehlerlisten

Unvollständige Scans müssen `complete: false` und `truncated: true` tragen. Sie
dürfen im Frontend nicht als vollständige Datenbasis bezeichnet werden.

## Kontexte

Vorbereitet werden Sachsen und alle Werte aus der Gebietsauswahl. Orte werden
vorerst nicht nachts berechnet, weil ihre Anzahl nicht begrenzt und stabil
genug ist. Ein Arbeitskontext mit Ort verwendet weiterhin die Live-Endpunkte.

## Speicherstrategie

Statische Snapshots verwenden GitHub Pages als kostenlosen, langlebigen
Dateispeicher. Der Render-Arbeitsspeicher ist dafür ungeeignet, weil er bei
Kaltstart und Neustart verloren geht.

Redis bleibt als optionaler Speicheradapter erhalten. Es gibt keinen Fallback
zwischen API-Keys und keine Änderung an der one.intelligence-Konfiguration.

## Sicherer Rollout

1. Den manuellen Workflow `Build quality snapshot preview` ausführen.
2. Artefakt herunterladen und `index.json` sowie Stichproben prüfen.
3. Snapshot-Zahlen gegen die bestehende Live-Seite vergleichen.
4. Erst danach Zeitsteuerung und GitHub-Pages-Veröffentlichung aktivieren.
5. React zunächst auf einer Seite mit Snapshot-first und Live-Fallback anbinden.
6. Danach Übersicht, Aufgaben und Statistik umstellen.

Die produktiven Endpunkte werden während des gesamten Rollouts nicht entfernt.

## GitHub-Konfiguration für den Probelauf

Für den Snapshot-Probelauf ist kein zusätzliches GitHub-Secret erforderlich.
Der Job verwendet `https://satourn.onrender.com/api/search`; der META-Key bleibt
ausschließlich in Render hinterlegt.

Unter `Actions -> Build quality snapshot preview -> Run workflow` kann ein
manueller Lauf gestartet werden. Das Ergebnis steht als Artefakt
`quality-snapshot-preview` bereit.

Für lokale Diagnosen kann mit `QUALITY_SNAPSHOT_SOURCE=direct` weiterhin ein
Direktabruf verwendet werden. Nur dieser optionale Modus benötigt lokal einen
`LICENSEKEY`.

## Abnahmekriterien

- Build bricht bei nicht erreichbarem Proxy oder fehlenden Dateien ab.
- `index.json` wird erst nach den Kontextdateien geschrieben.
- Jeder veröffentlichte Kontext besitzt einen stabilen Dateipfad.
- Unvollständige Scans werden klar gekennzeichnet.
- Live-Endpunkte funktionieren unverändert weiter.
- Keine API-Keys befinden sich in Snapshot-Dateien oder im Frontend.
- Snapshot- und Live-Zahlen stimmen für dieselbe Datenbasis überein.

## Performance-Ziele

- Manifest und Kontext-Snapshot sollen über das CDN in weniger als zwei
  Sekunden verfügbar sein.
- Beim Öffnen von Übersicht, Pflegeaufgaben oder Statistik darf bei vorhandenem
  Snapshot kein vollständiger `server_scan` gestartet werden.
- Das Öffnen einer vorbereiteten Fehlerliste darf nur die benötigte Liste und
  nicht alle Listen des Kontextes laden.
- Ein fehlender oder veralteter Snapshot darf die Seite nicht blockieren; der
  bestehende Live-Pfad bleibt der Rückfallweg.
- Detailansichten und KI-Funktionen bleiben Live-Abrufe und zeigen weiterhin
  passende Lade- und Fehlerzustände.
