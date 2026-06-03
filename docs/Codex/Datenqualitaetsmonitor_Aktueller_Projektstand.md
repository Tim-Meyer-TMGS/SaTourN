# Datenqualitaets-Monitor - Aktueller Projektstand

Stand: 2026-06-03

Diese Datei ist die kompakte Kontextdatei fuer die weitere Arbeit. Ausfuehrliche Abschnittsstaende bleiben als Referenz in den bisherigen Dokumenten erhalten.

## Ziel

Das bestehende SaTourN-Statistik-Dashboard wird schrittweise zu einem Datenqualitaets-Monitor erweitert. Die bestehende Statistikansicht, Filterlogik, Farbwelt und statische GitHub-Pages-Auslieferung bleiben erhalten. Es wird keine neue Build-Kette eingefuehrt und es werden keine Secrets im Frontend gespeichert.

## Aktueller Umsetzungsstand

Bis Abschnitt 13 umgesetzt:

- zentrale Item-Normalisierung und Qualitaetsbewertung.
- zentrale Qualitaetskriterien in `Statistik/quality.js`.
- Qualitaets-Score, Qualitaetsstatus, fehlende/erfuellte/manuelle Kriterien.
- Qualitaets-KPIs im Dashboard.
- klickbare Problemcluster `Haeufigste Pflegebedarfe`.
- Fehlerlisten-Ansicht mit Pagination.
- Datentyp-Uebersicht.
- Qualitaetskriterien-Matrix.
- kontextsensitiver CSV-Export.
- vorbereiteter KI-Chatbot ueber n8n-Webhook mit Mock-Modus.
- Datensatz-Detailansicht als Seitenpanel.
- verbesserte Filterkonsistenz, Empty States und Robustheit.
- finale Pruefung und Bereinigung ohne neue Grossfeatures.
- budgetierter Scan-Endpunkt `/api/quality/scan` im Proxy.
- Architekturentscheidung zu Python dokumentiert.

## Wichtige Dateien

Frontend:

- `Statistik/index.html`
- `Statistik/main.js`
- `Statistik/scripts.js`
- `Statistik/style.css`
- `Statistik/quality.js`

Proxy:

- `index.js`
- `routes/search.js`
- `routes/quality.js`
- `lib/search-utils.js`

Dokumentation:

- `docs/Codex/SaTourN_Codex_Prompt_Datenqualitaetsmonitor.md`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- `docs/Codex/Datenqualitaetsmonitor_Offene_TODOs.md`
- `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`
- `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`
- `docs/Codex/Zielbild.md`
- `docs/Codex/zielbild.png`

## Datenmodell und State

Der zentrale Dashboard-State liegt in `Statistik/scripts.js` als `dashboardState` und ist als `window.satournDashboardState` verfuegbar.

Wichtige State-Felder:

- `latestRows`: bestehende Statistik-Aggregate.
- `rawItemResponses`: begrenzte Item-Samples aus Statistik-Requests.
- `allItems`: Rohitems nach Normalisierung.
- `normalizedItems`: bewertete Items.
- `filteredItems`: durch aktive Filter reduzierte Items.
- `qualityCriteria`: Kriterien aus `Statistik/quality.js`.
- `qualityAggregations`: aggregierte Qualitaetsdaten.
- `qualityDataMeta`: Hinweis auf Stichprobe, Limits und Truncation.
- `activeFilters`: Gebiet, Ort, Typ, Kategorie, Qualitaetsstatus, Kriterium, Prioritaet, Pruefbarkeit, Suche.
- `activeIssue`: aktives fehlendes Kriterium.
- `activeView`: z. B. `overview` oder `issueList`.
- `activeDetailItem`: aktuell geoeffneter Detaildatensatz.

## Qualitaetskriterien

Kriterien sind zentral in `Statistik/quality.js` definiert.

Aktuelle Kriterien:

- `opening_hours_missing`
- `license_missing`
- `geo_missing`
- `description_missing`
- `image_missing`
- `image_author_missing`
- `public_transport_missing`
- `booking_link_missing`
- `touristtrip_incomplete`
- `manual_image_quality`

Automatisch pruefbare Kriterien:

- `opening_hours_missing`
- `license_missing`
- `geo_missing`
- `description_missing`
- `image_missing`
- `image_author_missing`
- `public_transport_missing`
- `booking_link_missing`
- `touristtrip_incomplete`

Manuell bzw. nicht automatisch pruefbar:

- `manual_image_quality`

Score-Logik:

- Nur automatisch pruefbare Kriterien mit Gewichtung gehen in den Score ein.
- `manual_image_quality` wird separat als manuelles Kriterium gefuehrt.
- Status:
  - `gut`: 80 bis 100
  - `pruefen`: 60 bis 79
  - `kritisch`: 0 bis 59
  - `nicht berechenbar`: kein Score

## Datenbasis und Limits

Die bestehenden Statistik-KPIs koennen auf `overallcount` basieren.

Qualitaets-KPIs, Fehlerlisten, Matrix, KI-Kontext und Fehlerlisten-CSV basieren aktuell auf den im Browser verfuegbaren Item-Samples. Wenn `qualityDataMeta.truncated === true`, sind diese Werte nicht vollstaendig.

Browser-Schutz:

- `QUALITY_ITEMS_PER_QUERY`
- `QUALITY_ITEM_MAX_ITEMS`
- `qualityDataMeta.truncated`

Proxy-Schutz:

- `/api/search` unterstuetzt `limit` und `offset`.
- `/api/quality/scan` scannt budgetiert und paginiert fuer ein konkretes Kriterium.
- Scan-Schutz ueber `limit`, `scanPageSize`, `maxPages`, `timeoutMs`, `nextCursor`.

Wichtige Entscheidung:

- destination.one/eT4-Felder duerfen nicht automatisch als filterbare API-Prefixe angenommen werden.
- Alle Kriterien nutzen vorerst serverseitigen Scan statt API-Pushdown.

## UI-Funktionen

Qualitaets-KPIs:

- durchschnittlicher Qualitaets-Score.
- Gut / Pruefen / Kritisch / Nicht berechenbar.
- haeufigstes fehlendes Kriterium.

Problemcluster:

- klickbare Pflegebedarfe.
- setzen `activeIssue` und oeffnen die Fehlerliste.

Fehlerliste:

- zeigt betroffene Datensaetze fuer aktives Kriterium.
- beruecksichtigt aktive Gebiet-/Ort-/Typ-/Kategorie-Filter.
- paginiert ab mehr als 50 Treffern.
- Zeilen oeffnen die Datensatz-Detailansicht.

Datentyp-Uebersicht:

- zeigt aggregierte Qualitaetslage je Datentyp.
- haeufigstes Kriterium ist klickbar und setzt den Typ-Kontext.

Kriterien-Matrix:

- zeigt Datentyp x Kriterium.
- Klick auf Matrix-Zeile oeffnet die passende Fehlerliste.

Detailansicht:

- eigenes Seitenpanel `item-detail-panel`.
- zeigt Stammdaten, Open-Data, Lizenz, Qualitaets-Score, Status, fehlende/erfuellte/manuelle Kriterien, Empfehlungen, Datenfelder und einklappbare Rohdaten.
- Fehlerlisten-Zeilen oeffnen konkrete Items.
- Ergebnislisten-Zeilen oeffnen nur dann ein Beispiel-Item, wenn im Browser-Sample ein passendes Item vorhanden ist.

Filter und Empty States:

- sichtbare Zusatzfilter fuer Suche, Qualitaetsstatus, Prioritaet und Pruefbarkeit.
- Suchfeld ist debounced.
- Button `Filter leeren` setzt Zusatzfilter zurueck.
- Zusatzfilter wirken auf Qualitaets-KPIs, Problemcluster, Datentyp-Uebersicht, Matrix, Fehlerliste, CSV, KI-Kontext und soweit moeglich Ergebnisliste.
- Ergebnislisten-Aggregate werden bei Item-Level-Filtern nur angezeigt, wenn ein passendes Item im Browser-Sample vorhanden ist.
- zentraler Empty-State-Bereich fuer:
  - noch keine Abfrage gestartet.
  - Daten werden geladen.
  - keine Ergebnisse.
  - CSV ohne exportierbare Daten.
  - KI ohne auswertbare Daten.
- Manuelle Kriterien zeigen einen eigenen Hinweis, dass sie aus JSON nicht automatisch pruefbar sind.

CSV:

- normaler Export: `satourn_export.csv`.
- aktive Fehlerliste: `satourn_fehlerliste_{kriterium}_{filter}.csv`.
- CSV ist UTF-8, Semikolon-getrennt, mit Quote-Escaping.
- Fehlerlisten-CSV exportiert nur die aktuell im Browser verfuegbaren gefilterten Daten.

KI-Chatbot:

- Panel `KI-Analyse`.
- Mock-Modus aktiv, solange keine n8n-Webhook-URL konfiguriert ist.
- keine one.intelligence-Keys im Frontend.
- `buildAiContext()` erzeugt reduzierten Kontext.
- maximal 50 reduzierte Beispiel-Datensaetze im KI-Kontext.
- aktuell geoeffneter Detaildatensatz fliesst ueber `buildAiDetailContext()` in den Kontext ein.
- Produktlogik: Chatbot soll Sparringspartner fuer Datenqualitaet sein, nicht vollstaendige Statistik-Engine.

## Python-Entscheidung

Python wird nicht als direkte Laufzeit fuer GitHub Pages eingesetzt. Die UI bleibt JavaScript. Der bestehende Node/Express-Proxy bleibt fuer API-Requests und budgetierte Live-Scans zustaendig.

Python ist spaeter sinnvoll fuer:

- GitHub-Actions-Snapshots.
- Vollscan- oder Export-Jobs.
- lokale redaktionelle Analysewerkzeuge.

## Aktueller Datenfluss

1. Nutzer setzt Filter.
2. `currentFilters()` synchronisiert `dashboardState.activeFilters`.
3. Statistik-Requests liefern Counts und begrenzte Item-Samples.
4. `collectRawItemsFromJob()` sammelt Samples.
5. `refreshNormalizedItems()` normalisiert und bewertet Items.
6. `refreshFilteredItems()` baut Basislisten, `qualityAggregations` und ggf. `filteredItems`.
7. `renderAll()` rendert Statistik, Qualitaetsbereiche, Matrix, Tabellen und Charts.
8. Klick auf Pflegebedarf setzt `activeIssue` und rendert die Fehlerliste.
9. Matrix-/Datentyp-Klicks koennen zusaetzlich Typ-Kontext setzen.
10. CSV-Button exportiert je nach Kontext Statistik oder aktive Fehlerliste.
11. Chatbot baut mit `buildAiContext()` einen kompakten Kontext.
12. Detailpanel oeffnet einen konkreten Datensatz oder ein Beispiel aus der Stichprobe.
13. Zusatzfilter fuer Suche, Qualitaetsstatus, Prioritaet und Pruefbarkeit aktualisieren `activeFilters`.
14. Filteraenderungen berechnen `filteredItems`, `qualityAggregations`, Fehlerliste, CSV-Kontext und KI-Kontext neu.

## Abschnitt 13 - Finale Pruefung und Bereinigung

Durchgefuehrt:

- dauerhafte `console.log`-Ausgaben im Proxy entfernt.
- nicht mehr verdrahteten alten Statistik-Exportblock `downloadStatsCsv()` aus `Statistik/scripts.js` entfernt.
- ungenutzten Import `isCitySearchQuery` aus `routes/search.js` entfernt.
- `git diff --check` ausgefuehrt.
- erneut geprueft, dass keine one.intelligence-Zugangsdaten und keine n8n-Credentials im Frontend hinterlegt sind.
- kompakte Projektstand- und TODO-Dokumentation aktualisiert.

Hinweise zur Pruefung:

- Fehler-Logs via `console.error` bleiben im Proxy und Frontend erhalten, weil sie fuer Fehlerdiagnose relevant sind.
- Ein vollstaendiger JavaScript-Syntaxcheck per Node konnte nicht ausgefuehrt werden, weil `node` in der aktuellen Umgebung nicht verfuegbar ist.
- Eine Browser-/UI-Pruefung mit echten destination.one-Daten bleibt als manuelle Restpruefung offen.

Kurze Testanleitung:

1. Dashboard `/Statistik/` oeffnen.
2. Abfrage starten.
3. Gebiet, Ort, Typ und Kategorie filtern.
4. Zusatzfilter Suche, Qualitaetsstatus, Prioritaet und Pruefbarkeit testen.
5. Auf `Oeffnungszeiten fehlen` klicken.
6. Fehlerliste pruefen und Pagination testen.
7. CSV exportieren.
8. Datensatzdetail aus der Fehlerliste oeffnen.
9. Chatbot oeffnen.
10. Frage stellen: `Fasse die aktuelle Fehlerliste zusammen.`
11. Pruefen, ob Mock-Antwort aktive Filter und aktive Fehlerliste beruecksichtigt.
12. Filter aendern und pruefen, ob Fehlerliste, CSV-Kontext und KI-Kontext aktualisiert werden.
13. Empty States pruefen, z. B. leere Filterauswahl, CSV ohne Daten und KI ohne Daten.

## Pruefung

Bisher regelmaessig ausgefuehrt:

- `git diff --check`

Ergebnis:

- erfolgreich, nur bekannte CRLF-Warnungen.

Nicht moeglich:

- Node-/npm-Syntaxchecks, weil `node` in der aktuellen Umgebung nicht verfuegbar ist.
