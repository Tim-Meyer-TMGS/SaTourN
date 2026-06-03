# Datenqualitaets-Monitor - Datenbasis und Limits

Stand: 2026-06-02

Ergaenzung: 2026-06-03

## Problem

Der aktuelle Statistik-Proxy liefert pro `/api/search`-Request nur eine begrenzte Anzahl von Items aus. Gleichzeitig enthaelt die Antwort aber `overallcount`, das fuer die bestehende Statistik ausreicht.

Wenn der Datenqualitaets-Monitor alle Items direkt im Browser aus den Statistik-Requests ableitet, entstehen drei Risiken:

- Es werden nicht alle betroffenen Datensaetze geladen.
- Der Proxy und die Upstream-API koennen durch grosse Abfragen lange laufen oder Timeouts erzeugen.
- Der Browser muesste grosse Mengen, zum Beispiel rund 30.000 Items, normalisieren, bewerten und filtern.

## Aktueller Schutz

`Statistik/scripts.js` behandelt die Item-Daten deshalb aktuell als begrenzte Stichprobe:

- Open-Data-Count-Requests holen nur eine minimale Payload.
- Normale Statistik-Count-Requests holen standardmaessig nur wenige Items pro Query.
- Insgesamt werden clientseitig standardmaessig maximal 2.000 Items fuer die Qualitaetsbewertung gesammelt.
- `dashboardState.qualityDataMeta` markiert, ob die Item-Daten unvollstaendig sind.

Konfigurierbare Browser-Werte:

- `window.SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY`
- `window.SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS`

Diese Begrenzung schuetzt UI, Browser und Proxy. Sie erzeugt aber keine vollstaendige, belastbare Fehlerliste.

## Konsequenz fuer das Zielbild

Die bestehenden Statistik-KPIs koennen weiterhin auf `overallcount` basieren.

Qualitaets-KPIs, Problemcluster, Fehlerlisten, Matrix und CSV-Export duerfen im finalen Zielbild nicht stillschweigend so tun, als waere die Stichprobe vollstaendig. Sobald `qualityDataMeta.truncated === true`, muss die UI spaeter klar anzeigen, dass die Qualitaetsdaten nur eine Stichprobe sind.

## Zielarchitektur fuer vollstaendige Fehlerlisten

Fuer belastbare Qualitaetslisten braucht es einen separaten Datenpfad:

1. Statistik-Counts bleiben schnelle Aggregatabfragen.
2. Qualitaetsdaten werden ueber einen eigenen, paginierten oder jobbasierten Endpunkt geladen.
3. Der Proxy steuert Page-Groesse, Timeout, Abbruch und Fortschritt.
4. Der Browser verarbeitet nur begrenzte Seiten oder bereits reduzierte Ergebnislisten.
5. CSV-Export fuer grosse Fehlerlisten sollte serverseitig oder job-basiert vorbereitet werden.

Moegliche spaetere Endpunkte:

- `/api/search` fuer bestehende Statistik-Counts.
- `/api/quality/items` fuer paginierte normalisierte Datensaetze.
- `/api/quality/issues` fuer serverseitig aggregierte Problemcluster.
- `/api/quality/export` fuer grosse CSV-Exporte.

## Umgesetzter erster Scan-Endpunkt

Als erster Schritt existiert ein budgetierter Scan-Endpunkt:

```text
GET /api/quality/scan
```

Parameter:

- `criterionId`: ID des Qualitaetskriteriums, z. B. `opening_hours_missing`.
- `type`: Destination.One-Typ. Bewusst erforderlich, damit nicht unkontrolliert alle Typen gescannt werden.
- `query`: bestehender ET4-Query-String fuer Gebiet, Ort und Kategorie.
- `cursor` oder `offset`: Startposition in der Destination.One-Ergebnisliste.
- `limit`: maximale Anzahl passender Treffer in der Antwort. Default 50, Maximum 200.
- `scanPageSize`: Seitengroesse fuer Destination.One. Default 100, Maximum 200.
- `maxPages`: maximale Anzahl Destination.One-Seiten pro Request. Default 5, Maximum 20.
- `timeoutMs`: Request-Budget fuer den Scan. Default 8000ms.

Der Endpunkt:

- paginiert mit `limit` und `offset` ueber Destination.One.
- bewertet Items serverseitig mit der vorhandenen `qualityCriteria`-Logik.
- gibt nur Treffer fuer das angefragte Kriterium zurueck.
- sendet keine vollstaendigen Rohdaten an den Browser.
- gibt `nextCursor` zurueck, falls weitere Seiten gescannt werden koennen.
- bricht kontrolliert ab, wenn `maxPages`, `timeoutMs`, Ende der Ergebnisliste oder eine wiederholte Seite erreicht wird.

Beispiel:

```text
/api/quality/scan?criterionId=opening_hours_missing&type=POI&query=area:%22Sachsen%22&limit=50&scanPageSize=100&maxPages=5
```

Antwortstruktur:

```json
{
  "items": [],
  "criterion": {
    "id": "opening_hours_missing",
    "label": "Oeffnungszeiten fehlen"
  },
  "page": {
    "cursor": 0,
    "nextCursor": 500,
    "complete": false,
    "reason": "scan_budget_exhausted"
  },
  "stats": {
    "scannedItems": 500,
    "scannedPages": 5,
    "matchedItems": 50,
    "totalSourceItems": 19568,
    "budgetExhausted": true,
    "paginationRepeated": false
  }
}
```

## API-Filter und fehlende Felder

Destination.One/eT4 kann mit Query-Prefixes filtern. Das gilt aber nur fuer Felder, die als Prefix indexiert sind. Nicht jedes JSON-Feld ist automatisch per API filterbar.

Das betrifft nicht nur fehlende Oeffnungszeiten, sondern jedes Qualitaetskriterium. Ein JSON-Feld wie Beschreibung, Bild, Bildurheber, Buchungslink, OePNV-Information oder TouristTrip-Struktur ist nicht automatisch als API-Filter verfuegbar.

Aktuell sind deshalb alle Kriterien in `Statistik/quality.js` mit `apiFilter: null` markiert. Der Scan-Endpunkt nutzt fuer diese Kriterien `filterStrategy: "server_scan"`:

1. Destination.One-Ergebnisse werden paginiert geladen.
2. Das Qualitaetskriterium wird serverseitig auf dem Item geprueft.
3. Nur passende Treffer werden an den Browser zurueckgegeben.

Ein API-Pushdown darf erst aktiviert werden, wenn ein Prefix fuer genau dieses Kriterium verifiziert wurde. Dann kann das Kriterium spaeter eine explizite `apiFilter`-Konfiguration erhalten und der Scan-Endpunkt kann `filterStrategy: "api_pushdown"` melden.

Empfohlene Regel:

- API-Pushdown nur verwenden, wenn ein Prefix explizit verifiziert wurde.
- Fehlende oder unvollstaendige Felder sonst ueber paginierten Scan serverseitig pruefen.
- Bei reinen Negativsuchen nur mit bekannter `all:all`-Semantik arbeiten und vorher Counts plausibilisieren.
- Wiederholte Seiten erkennen, damit falsche Pagination nicht zu Endlosschleifen fuehrt.

## Wichtig fuer kommende Abschnitte

Bis ein vollstaendiger jobbasierter Datenpfad fuer grosse Listen und Exporte existiert, sollten neue UI-Abschnitte:

- `dashboardState.qualityDataMeta` auswerten.
- bei Stichproben klar kennzeichnen, dass Werte vorlaeufig sind.
- keine exakte Vollstaendigkeit behaupten.
- grosse Tabellen begrenzen.
- CSV-Export nur fuer die aktuell verfuegbare Datenbasis ausgeben oder als unvollstaendig markieren.

## Python-Einordnung

Python ist fuer grosse Datenmengen grundsaetzlich gut geeignet, aber nicht als direkte Laufzeit auf GitHub Pages. Die Statistikseite wird statisch ausgeliefert; GitHub Pages fuehrt keine serverseitigen Sprachen wie Python aus.

Deshalb wurden `Statistik/scripts.js` und `Statistik/quality.js` nicht durch Python-Dateien ersetzt.

Sinnvolle Python-Einsatzorte sind:

- GitHub Actions zur Build-Zeit, um statische Snapshots oder Aggregations-JSONs zu erzeugen.
- ein separater Backend-/Job-Dienst fuer Vollscans, grosse Fehlerlisten und CSV-Exporte.
- lokale redaktionelle Analysewerkzeuge.

Nicht sinnvoll ist Python im Browser als Ersatz fuer die bestehende JavaScript-UI, weil dadurch weiterhin grosse Datenmengen im Browser verarbeitet wuerden und zusaetzliche Laufzeitpakete noetig waeren.

Die ausfuehrliche Entscheidung steht in `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`.
