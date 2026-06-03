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
- seitliche Arbeitsbereich-Navigation nach Zielbild-Logik.
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

Diagnose:

- `scripts/diagnose-quality-examples.mjs`

Dokumentation:

- `docs/Codex/SaTourN_Codex_Prompt_Datenqualitaetsmonitor.md`
- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- `docs/Codex/Datenqualitaetsmonitor_Offene_TODOs.md`
- `docs/Codex/Datenqualitaetsmonitor_Verifizierte_Annahmen.md`
- `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`
- `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`
- `docs/Codex/Zielbild.md`
- `docs/Codex/zielbild.png`
- `docs/Codex/examples/`

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
- `activePanel`: sichtbarer Arbeitsbereich, z. B. `overview`, `stats`, `quality`, `issues`, `types`, `matrix`, `results`.
- `activeDetailItem`: aktuell geoeffneter Detaildatensatz.

## Qualitaetskriterien

Kriterien sind zentral in `Statistik/quality.js` definiert und wurden am
2026-06-03 auf die verifizierte Zielkonfiguration aus
`docs/Codex/Datenqualitaetsmonitor_Verifizierte_Annahmen.md` umgestellt.

Aktive automatisch pruefbare Kriterien im Codezustand:

- `opening_hours_missing`: POI, Gastro.
- `license_missing`: POI, Gastro, Tour, Hotel, Package.
- `description_missing`: POI, Gastro, Tour.
- `image_missing`: POI, Gastro, Tour.
- `image_author_missing`: POI, Tour, Hotel, Event, Gastro, Package.
- `public_transport_missing`: POI, Gastro, Tour, Hotel, Event.
- `booking_link_missing`: Hotel, Package.

Entfernt bzw. nicht mehr als automatischer Fehler gefuehrt:

- `geo_missing`
- `touristtrip_incomplete`
- `manual_image_quality`

Die Kriterien enthalten jetzt eine Scan-Konfiguration mit Methode, verifizierter
Missing-Query, Positive-Query, Typfreigabe und dokumentierten Warnungen.
`image_author_missing` bleibt bewusst `server_scan`, weil kein verifizierter
API-Pushdown fuer fehlende Bildurheber vorliegt. `booking_link_missing` nutzt
fuer Hotel die bestaetigte Query `*:* NOT booking:*`; Package bleibt vorerst
serverseitiger Scan, bis Query und Feldstruktur verifiziert sind.

Schritt C - reale Feldmappings:

- Dashboard-Normalisierung nutzt jetzt `attributes[]` fuer Lizenz und Open-Data-Ableitung.
- Gebiet und Kategorie werden aus `areas[]`/`areas_old[]` bzw. `categories[]`/`categories_old[]` gelesen.
- Beschreibung, Oeffnungszeiten, Bild, Bildurheber und Booking werden aus den realen Feldern `texts[]`, `timeIntervals[]`, `alwaysOpen` und `media_objects[]` abgeleitet.
- Synthetische Shortcut-Felder wie `descriptionAvailable`, `imageCount` und `bookingLinkAvailable` entscheiden nicht mehr ueber die Kriterienerfuellung.
- Detailansicht kann Kriterienfelder wie `texts[rel=details]`, `attributes[key=license]`, `media_objects.copyrightText` und `media_objects[rel=booking].url` anzeigen.
- `/api/quality/scan` reduziert Treffer mit denselben realen Feldmappings fuer Gebiet, Kategorie, Lizenz und Medien.

Schritt D - Helper und Beispiel-Diagnose:

- Alle in `Datenqualitaetsmonitor_Verifizierte_Annahmen.md` aufgefuehrten D-Helper sind in `Statistik/quality.js` verfuegbar.
- `scripts/diagnose-quality-examples.mjs` prueft die Helper gegen `docs/Codex/examples/*.json`.
- Das Skript gibt Helper-Zaehler, Beispiel-IDs, Kriterienergebnisse, Scan-Methode, Query und Warnungen aus.
- Fuer maschinenlesbare Auswertung gibt es `npm run diagnose:quality-examples:json`.

Schritt E - Proxy, Query-Erzeugung und Fehlerlisten:

- `/api/quality/scan` leitet die effektive Scan-Konfiguration aus `criterionId` und `type` ab.
- Die Route nutzt nur verifizierte Missing-Queries als API-Pushdown und faellt sonst auf `server_scan` zurueck.
- Die Antwort enthaelt Diagnoseinformationen zu Methode, Query, Verifikation, Warnungen, Pagination, `overallcount` und Scan-Budget.
- Bei eindeutigem Datentyp und Kriterium laedt die Fehlerliste serverseitig ueber `/api/quality/scan`.
- Die Fehlerlisten-UI zeigt Quelle, Methode, Query, Verifikation, Vollstaendigkeit und Scan-Status.
- Wenn kein eindeutiger Datentyp vorliegt, bleibt die bestehende Browser-Stichprobe aktiv.

Schritt F - UI-Struktur:

- `Statistik/index.html` enthaelt jetzt eine seitliche Navigation fuer die Arbeitsbereiche.
- Vorhandene Bereiche sind ueber `data-view-panel` Views zugeordnet.
- `Statistik/scripts.js` steuert die Sichtbarkeit ueber `activePanel`.
- Klick auf ein Qualitaetsproblem wechselt direkt zur Fehlerlisten-Ansicht.
- Ruecksprung aus einer Fehlerliste setzt wieder die Uebersicht.
- Bei aktivem Server-Scan wird ein geaenderter Typfilter in `activeIssueType` uebernommen, damit die API-Anfrage zum sichtbaren Filterkontext passt.

Score-Logik:

- Nur automatisch pruefbare Kriterien mit Gewichtung gehen in den Score ein.
- Manuelle Bildqualitaet ist aktuell kein Score-Kriterium und bleibt ein spaeterer redaktioneller Workflow.
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
- Verifizierte Kriterium-/Typ-Kombinationen nutzen API-Pushdown; nicht verifizierte Kriterien bleiben beim serverseitigen Scan.

## UI-Funktionen

Qualitaets-KPIs:

- durchschnittlicher Qualitaets-Score.
- Gut / Pruefen / Kritisch / Nicht berechenbar.
- haeufigstes fehlendes Kriterium.

Problemcluster:

- klickbare Pflegebedarfe.
- setzen `activeIssue` und oeffnen die Fehlerliste.
- wechseln automatisch in den Arbeitsbereich `Fehlerlisten`.

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
- ueber Floating-Button und seitliche Navigation erreichbar.
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
8. `updateViewNavigation()` zeigt nur die Bereiche des aktiven Arbeitsbereichs.
9. Klick auf Pflegebedarf setzt `activeIssue`, wechselt zu `activePanel = issues` und rendert die Fehlerliste.
10. Matrix-/Datentyp-Klicks koennen zusaetzlich Typ-Kontext setzen.
11. CSV-Button exportiert je nach Kontext Statistik oder aktive Fehlerliste.
12. Chatbot baut mit `buildAiContext()` einen kompakten Kontext.
13. Detailpanel oeffnet einen konkreten Datensatz oder ein Beispiel aus der Stichprobe.
14. Zusatzfilter fuer Suche, Qualitaetsstatus, Prioritaet und Pruefbarkeit aktualisieren `activeFilters`.
15. Filteraenderungen berechnen `filteredItems`, `qualityAggregations`, Fehlerliste, CSV-Kontext und KI-Kontext neu.

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

## Neue verifizierte Annahmen vom 2026-06-03

Neue fachliche und technische Verifikationen wurden in `docs/Codex/Datenqualitaetsmonitor_Verifizierte_Annahmen.md` zusammengefasst.

Umgesetzt:

- Aktive Kriterien wurden anhand realer eT4-/Lucene-Queries und realer Feldstrukturen korrigiert.
- `geo_missing` und `touristtrip_incomplete` wurden aus aktiven Checks entfernt.
- `opening_hours_missing` gilt nur fuer POI und Gastro.
- `description_missing` und `image_missing` gelten aktuell nur fuer POI, Gastro und Tour.
- `booking_link_missing` gilt nur fuer Hotel und Package; Hotel nutzt die bestaetigte Query, Package bleibt offen.
- `image_author_missing` laeuft per Scan-Logik ueber `media_objects[].copyrightText`.
- Beispiele fuer POI, Gastro, Tour und Hotel liegen unter `docs/Codex/examples/`.

Weiter offen:

- Kombinierte destination.one-Queries muessen live verifiziert werden.
- Matrix-Counts und grosse CSV-Exporte brauchen perspektivisch einen kontrollierten Server-/Job-Pfad.
- Ein eigener Diagnose-/Einstellungsbereich ist noch offen.

## Pruefung

Bisher regelmaessig ausgefuehrt:

- `git diff --check`

Ergebnis:

- erfolgreich, nur bekannte CRLF-Warnungen.

Nicht moeglich:

- Node-/npm-Syntaxchecks, weil `node` in der aktuellen Umgebung nicht verfuegbar ist.
