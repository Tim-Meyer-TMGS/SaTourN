# Datenqualitaets-Monitor - Projektstand Abschnitte 1 bis 10

Stand: 2026-06-02

Ergaenzung: 2026-06-03

## Zweck

Dieses Dokument fasst die bisherige Umsetzung des SaTourN-Datenqualitaets-Monitors zusammen. Es ist als Arbeitsstand fuer die weitere Abschnittsarbeit gedacht und ergaenzt:

- `docs/Codex/Datenqualitaetsmonitor_Abschnitt_1_Analyse.md`
- `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`
- `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`
- `docs/Codex/SaTourN_Codex_Prompt_Datenqualitaetsmonitor.md`
- `docs/Codex/Zielbild.md`
- `docs/Codex/zielbild.png`

Das bestehende SaTourN-Statistik-Dashboard bleibt die Grundlage. Die Erweiterung erfolgt schrittweise in Richtung Datenqualitaets-Monitor, ohne neue Build-Kette und ohne Secrets im Frontend.

## Zielbildbezug

Das Zielbild sieht ein erweitertes Dashboard vor:

1. bestehende Statistikfilter und Statistik-KPIs bleiben erhalten.
2. Qualitaets-KPIs werden ergaenzt.
3. haeufige Pflegebedarfe werden sichtbar und klickbar.
4. Klicks auf Pflegebedarfe fuehren zu gefilterten Fehlerlisten.
5. CSV-Export, Detailansicht und KI-Kontext folgen spaeter.

Bis Abschnitt 10 ist die Uebersichtsebene inklusive klickbarer Fehlerlisten, Datentyp-Uebersicht, Qualitaetskriterien-Matrix, kontextsensitivem CSV-Export und vorbereitetem KI-Chatbot umgesetzt.

## Abschnitt 1 - Analyse und Plan

Umgesetzt:

- bestehende Projektstruktur analysiert.
- relevante HTML-, CSS-, JavaScript- und Proxy-Dateien dokumentiert.
- vorhandene Statistiklogik, Filter, KPIs, Charts, Tabelle und CSV-Export beschrieben.
- Anschlussstellen fuer Normalisierung, Qualitaetsbewertung und spaetere Exporte festgehalten.
- fehlende Referenzdatei `docs/codex/zielbild-beschreibung.md` notiert; stattdessen wurde `docs/Codex/Zielbild.md` verwendet.

Ergebnis:

- Dokumentation in `docs/Codex/Datenqualitaetsmonitor_Abschnitt_1_Analyse.md`.

Wichtige Entscheidung:

- Bestehende Statistik-Aggregate bleiben getrennt von spaeteren Item-basierten Qualitaetsdaten.

## Abschnitt 2 - Datenmodell und zentraler State

Umgesetzt in `Statistik/scripts.js`:

- bestehender State zu `dashboardState` erweitert.
- `dashboardState` global als `window.satournDashboardState` verfuegbar gemacht.
- zentrale Listen ergaenzt:
  - `rawItemResponses`
  - `allItems`
  - `normalizedItems`
  - `filteredItems`
- aktive Filterstruktur ergaenzt:
  - `region`
  - `city`
  - `type`
  - `category`
  - `qualityStatus`
  - `criterionId`
  - `priority`
  - `autoCheck`
  - `search`
- aktive Qualitaetsansicht ergaenzt:
  - `activeIssue`
  - `activeView`
  - `sortBy`
  - `sortDirection`

Normalisierung:

- `normalizeItems(rawResponses)`
- `normalizeItem(rawItem, context)`
- `normalizeType(value)`
- `normalizeString(value)`
- `safeArray(value)`
- weitere defensive Helper fuer Werte, Felder, Koordinaten, Lizenz, Medien, Quellen-URL und Fehler.

Ergebnis:

- Rohdaten bleiben im normalisierten Item unter `raw` erhalten.
- Fehlende Felder und leere Antworten werden defensiv behandelt.
- Bestehende Statistikansicht nutzt weiterhin `latestRows`.

## Abschnitt 3 - Qualitaetskriterien

Umgesetzt in `Statistik/quality.js`:

- zentrale `qualityCriteria`-Konfiguration angelegt.
- Kriterien nicht im HTML verstreut, sondern als Datenstruktur definiert.
- Kriterien enthalten:
  - `id`
  - `label`
  - `types`
  - `priority`
  - `autoCheck`
  - `weight`
  - `fields`
  - `apiFilter`
  - `recommendation`
  - optional `note`
  - optional `check`

Angelegte Kriterien:

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

Helper:

- `getNestedValue(obj, path)`
- `hasAnyValue(item, fields)`
- `hasGeoCoordinates(item)`
- `hasDescription(item)`
- `hasImages(item)`
- `hasImageAuthor(item)`
- `hasOpeningHours(item)`
- `hasBookingLink(item)`
- `hasFutureEventDate(item)`
- `isTouristTripReady(item)`
- `getCriteriaForType(type)`

Wichtige Entscheidung:

- `manual_image_quality` ist `autoCheck: false`.
- Alle Kriterien haben aktuell `apiFilter: null`, weil fehlende Felder in destination.one/eT4 nicht automatisch als API-Filter vorausgesetzt werden duerfen.

## Abschnitt 4 - Bewertung und Score

Umgesetzt in `Statistik/quality.js`:

- `evaluateQualityForItem(item)`
- `evaluateAllItems(items)`
- `calculateQualityScore(item, criteriaResults)`
- `getQualityStatus(score)`
- `getMissingCriteria(item)`
- `getRecommendationsForItem(item)`

Score-Logik:

- relevante Kriterien werden ueber den Datentyp ermittelt.
- nur `autoCheck: true` und `weight > 0` gehen in den Score ein.
- fehlende Kriterien reduzieren den Score entsprechend ihrer Gewichtung.
- `autoCheck: false` wird separat in `manualCriteria` gefuehrt und nicht negativ bewertet.

Statuslogik:

- `80` bis `100`: `gut`
- `60` bis `79`: `pruefen`
- `0` bis `59`: `kritisch`
- `null`: `nicht berechenbar`

Ergebnis pro normalisiertem Item:

- `missingCriteria`
- `fulfilledCriteria`
- `manualCriteria`
- `qualityScore`
- `qualityStatus`
- `recommendations`

## Abschnitt 5 - Aggregationen

Umgesetzt in `Statistik/quality.js`:

Qualitaets-KPIs:

- `getAverageQualityScore(items)`
- `getQualityStatusCounts(items)`
- `getMostCommonMissingCriterion(items)`
- `getOpenDataCapableCount(items)`
- `getAutoCheckCriteriaCount()`
- `getManualCriteriaCount()`

Problemcluster:

- `getIssueSummary(items)`

Kriterien-Matrix:

- `getCriteriaMatrix(items)`

Datentyp-Uebersicht:

- `getTypeSummary(items)`

Gesamtaggregation:

- `getQualityAggregations(items)`

Ergebnis:

- Alle Aggregationen laufen ueber uebergebene Item-Listen.
- Leere Arrays werden defensiv behandelt.
- Division durch 0 wird vermieden.
- `getQualityAggregations(state.filteredItems)` bzw. die daraus abgeleitete Basisliste speist spaetere UI-Sektionen.

## Datenbasis, API-Limits und Pagination

Zwischen Abschnitt 5 und 6 wurde die Datenbasis-Frage geklaert und dokumentiert.

Problem:

- `/api/search` liefert fuer die Statistik zwar `overallcount`, aber nur eine begrenzte Anzahl Items.
- Vollstaendige Fehlerlisten koennen nicht serioes aus einer kleinen Browser-Stichprobe behauptet werden.
- Rund 30.000 Items clientseitig zu laden und zu bewerten waere riskant fuer Browser, Proxy und Upstream-API.

Umgesetzt:

- `Statistik/scripts.js` sammelt fuer Qualitaetsauswertungen nur eine begrenzte Stichprobe.
- `QUALITY_ITEMS_PER_QUERY` begrenzt Items je Statistik-Request.
- `QUALITY_ITEM_MAX_ITEMS` begrenzt die gesamte clientseitige Stichprobe.
- `dashboardState.qualityDataMeta` dokumentiert Stichprobengroesse, Gesamtzaehler und Truncation.
- `/api/search` unterstuetzt `offset`.
- `lib/search-utils.js` normalisiert `offset` und baut URLs mit `limit` und `offset`.
- `routes/quality.js` wurde als budgetierter Scan-Endpunkt angelegt.
- `index.js` bindet den neuen Quality-Route ein.
- `package.json` wurde fuer die neuen Check-Dateien erweitert.

Neuer Endpunkt:

```text
GET /api/quality/scan
```

Zweck:

- paginierter, kontrollierter Scan fuer ein konkretes Qualitaetskriterium.
- serverseitige Pruefung der Kriterienlogik.
- Rueckgabe reduzierter Treffer statt vollstaendiger Rohdaten.
- Schutz durch `limit`, `scanPageSize`, `maxPages`, `timeoutMs` und `nextCursor`.

Dokumentation:

- Details stehen in `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`.

Wichtige Entscheidung:

- API-Pushdown fuer fehlende Felder wird nicht angenommen.
- Fuer alle Kriterien gilt aktuell `filterStrategy: "server_scan"`, bis konkrete destination.one/eT4-Prefixe verifiziert sind.

## Python-Auslagerung

Am 2026-06-03 wurde geprueft, ob Statistiklogik wegen grosser Datenmengen nach Python ausgelagert werden sollte.

Ergebnis:

- Python ist nicht als direkte Laufzeit fuer die GitHub-Pages-Statistik geeignet.
- GitHub Pages liefert statische Dateien aus und fuehrt keine serverseitigen Python-Prozesse aus.
- `Statistik/scripts.js` und `Statistik/quality.js` wurden deshalb nicht durch Python ersetzt.
- Die bestehende JavaScript-UI bleibt fuer Filter, Tabellen, Charts und Interaktion zustaendig.
- Der bestehende Node/Express-Proxy bleibt fuer API-Requests und budgetierte Live-Scans zustaendig.

Geeignete Python-Pfade fuer spaeter:

- GitHub Actions zur Erzeugung statischer Snapshot-JSONs.
- separater Backend-/Job-Dienst fuer Vollscans und grosse CSV-Exporte.
- lokale redaktionelle Analysewerkzeuge.

Dokumentation:

- `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`

## Abschnitt 6 - Qualitaets-KPIs und Problemcluster UI

Umgesetzt in `Statistik/index.html`:

- zweite KPI-Zeile `quality-summary` unter der bestehenden Statistik-KPI-Zeile.
- KPI-Karten fuer:
  - durchschnittlicher Qualitaets-Score
  - Gut
  - Pruefen
  - Kritisch
  - Nicht berechenbar
  - haeufigstes fehlendes Kriterium
- Sektion `Haeufigste Pflegebedarfe`.
- `aria-live` fuer Qualitaets-KPI-Zeile und Statusmeldung.

Umgesetzt in `Statistik/style.css`:

- responsive Styles fuer `quality-summary`.
- klickbare Problemzeilen als `button.issue-row`.
- sichtbarer Fokuszustand ueber `:focus-visible`.
- aktive Problemzeile ueber `.issue-row.active`.
- Prioritaets-Badges fuer hoch, mittel und niedrig.
- Empty State fuer leere Pflegebedarfe.

Umgesetzt in `Statistik/scripts.js`:

- DOM-Referenzen fuer die neuen UI-Bereiche ergaenzt.
- `renderQualitySummary()`
- `renderIssueSummary()`
- `renderQualitySections()`
- `selectQualityIssue(criterionId)`
- `updateIssueStatus(issues)`
- `renderQualitySampleNote()`
- Empty State:

```text
Fuer die aktuelle Auswahl wurden keine Qualitaetsprobleme gefunden.
```

Klickverhalten:

- setzt `dashboardState.activeIssue`.
- setzt `dashboardState.activeFilters.criterionId`.
- setzt `dashboardState.activeView = "issueList"`.
- behaelt Gebiet, Ort, Typ und Kategorie in `activeFilters`.
- markiert die angeklickte Problemzeile visuell.
- aktualisiert die Statusmeldung.
- bereitet `state.filteredItems` als spaetere Fehlerliste vor.

Wichtige technische Entscheidung:

- `qualityAggregations` werden auf Basis der aktiven Gebiet-/Ort-/Typ-/Kategorie-Filter berechnet, aber ohne das aktive `criterionId`.
- `state.filteredItems` beruecksichtigt das aktive `criterionId` und dient seit Abschnitt 7 als Grundlage der Fehlerlisten-Ansicht.
- Dadurch bleibt die Problemcluster-Liste stabil, waehrend die eigentliche Fehlerlisten-Ansicht vorbereitet wird.

Noch nicht umgesetzt:

- CSV-Export fuer Fehlerlisten.

## Abschnitt 7 - Fehlerlisten-Ansicht

Umgesetzt in `Statistik/index.html`:

- neue Sektion `issue-detail-section` fuer die aktive Fehlerliste.
- Header mit:
  - `Fehlerliste: {Kriterium}`
  - Anzahl betroffener Datensaetze in der aktuellen Auswahl
  - aktive Filterbeschreibung
  - Button `Zurueck zur Uebersicht`
- eigener Tabellenbereich `issue-detail-table`.
- Pagination-Bereich mit `Zurueck`, Seitenstatus und `Weiter`.

Umgesetzt in `Statistik/style.css`:

- Layout fuer Fehlerlisten-Header und Metadaten.
- scrollbare Fehlerlisten-Tabelle mit groesserer Mindestbreite.
- klare Trennung der Fehlerlisten-Spalten von der bestehenden Statistik-Tabelle.
- Pagination-Buttons mit kompakter Breite.
- Empty State fuer Fehlerliste ohne Treffer.

Umgesetzt in `Statistik/scripts.js`:

- neue DOM-Referenzen fuer die Fehlerlisten-Sektion.
- neuer State:
  - `issueListPage`
  - `issueListPageSize`
- neue Funktionen:
  - `getItemsByMissingCriterion(items, criterionId)`
  - `renderIssueList()`
  - `clearActiveIssue()`
  - `updateIssueListHeader(items)`
  - `getActiveFilterDescription()`
  - `getIssueListItems()`
  - `renderIssuePagination(totalItems)`
- Filterwechsel rendern die Qualitaetsansicht neu, wenn bereits Ergebnisse vorhanden sind.
- Klick auf einen Pflegebedarf setzt weiterhin `activeIssue` und rendert nun zusaetzlich die konkrete Fehlerliste.
- Schliessen der Fehlerliste setzt `activeIssue`, `activeFilters.criterionId` und `activeView` zurueck.

Fehlerlisten-Spalten:

- Titel
- ID
- Typ
- Gebiet
- Ort
- Kategorie
- fehlendes Kriterium
- Prioritaet
- Qualitaets-Score
- Qualitaetsstatus
- Open-Data
- Lizenz
- letzte Aktualisierung
- empfohlene Aktion
- Link / URL

Darstellung:

- leere Werte erscheinen als `-`.
- Open-Data erscheint als `Ja`, `Nein` oder `Unbekannt`.
- Qualitaetsstatus wird als Text ausgegeben.
- Links oeffnen in einem neuen Tab mit `rel="noopener noreferrer"`.
- Bei mehr als 50 Treffern wird seitenweise geblaettert.

Beispiel `Oeffnungszeiten fehlen`:

1. Nutzer filtert z. B. Gebiet `Sachsen`, Ort `Dresden`, Typ `POI`, Kategorie `Museum`.
2. Nutzer klickt im Problemcluster auf `Oeffnungszeiten fehlen`.
3. `dashboardState.activeIssue = "opening_hours_missing"`.
4. `dashboardState.activeFilters.criterionId = "opening_hours_missing"`.
5. `getBaseFilteredItems()` beruecksichtigt Gebiet, Ort, Typ und Kategorie.
6. `getItemsByMissingCriterion(..., "opening_hours_missing")` reduziert diese Basisliste auf Items mit fehlendem Kriterium.
7. `renderIssueList()` zeigt die passenden Datensaetze in der Fehlerlisten-Tabelle.

Wichtige Einschraenkung:

- Die aktuell gerenderte Fehlerliste basiert auf den im Browser verfuegbaren, normalisierten Items. Wenn `qualityDataMeta.truncated === true`, ist sie eine Stichprobe. Fuer vollstaendige grosse Fehlerlisten soll spaeter der budgetierte Scan-Endpunkt `/api/quality/scan` angebunden werden.

## Abschnitt 8 - Datentyp-Uebersicht und Kriterien-Matrix

Umgesetzt in `Statistik/index.html`:

- neue Sektion `type-summary-section` fuer `Datentypen im Ueberblick`.
- neue Sektion `criteria-matrix-section` fuer `Qualitaetskriterien-Matrix`.
- beide Sektionen liegen unter der Fehlerlisten-Sektion und vor den bestehenden Charts.

Umgesetzt in `Statistik/style.css`:

- gemeinsame Styles fuer `quality-table-section` und `quality-table-wrap`.
- breitere, scrollbare Tabellen fuer verdichtete Auswertungen.
- klickbare Tabellenaktionen ueber `table-link-button`.
- Fokuszustand fuer Tastaturbedienung.
- vorhandene Statistik-Tabelle bleibt optisch getrennt.

Umgesetzt in `Statistik/scripts.js`:

- neue DOM-Referenzen fuer Datentyp-Uebersicht und Matrix.
- `renderTypeSummary()`
- `renderCriteriaMatrix()`
- `getTopIssueForType(type)`
- `getTypeItems(type)`
- `appendButtonCell(...)`
- `appendHeaderCells(...)`
- `renderTableEmpty(...)`
- `syncTypeSelectValue(type)`
- `renderQualitySections()` rendert jetzt zusaetzlich Datentyp-Uebersicht und Matrix.

Datentyp-Uebersicht:

- basiert auf `state.qualityAggregations.typeSummary`.
- zeigt Typ, Datensatzanzahl, Open-Data-Werte, Qualitaets-Score, Statuszaehler, haeufigstes fehlendes Kriterium und naechste Massnahme.
- Das haeufigste fehlende Kriterium ist klickbar, wenn eines vorhanden ist.

Qualitaetskriterien-Matrix:

- basiert auf `state.qualityAggregations.criteriaMatrix`.
- zeigt Datentyp, Kriterium, Prioritaet, automatische Pruefbarkeit, erfuellte und nicht erfuellte Datensaetze, Quote, Status, Datenfelder, Hinweis und Empfehlung.
- Nicht automatisch pruefbare Kriterien werden ebenfalls angezeigt und erhalten den Status `nicht automatisch pruefbar`.
- Bei fehlenden Item-Daten kann die Matrix trotzdem den Kriterienrahmen anzeigen, weil `getCriteriaMatrix([])` auf die in `qualityCriteria` hinterlegten Typen zurueckfaellt.

Klickverhalten:

- Klick auf ein Kriterium in der Datentyp-Uebersicht oeffnet die Fehlerliste fuer dieses Kriterium und setzt zusaetzlich den Typ-Kontext.
- Klick auf eine Matrix-Zeile oeffnet die Fehlerliste fuer genau dieses Kriterium und diesen Datentyp.
- Intern nutzt dies `selectQualityIssue(criterionId, { type })`.
- `selectedType`, `activeFilters.type` und der Typ-Dropdown werden synchronisiert, damit die Fehlerliste den Datentyp-Kontext beruecksichtigt.
- Gebiet, Ort und Kategorie bleiben als aktive Filter erhalten.

Beispiel:

1. Nutzer klickt in der Matrix auf `POI | Oeffnungszeiten fehlen`.
2. `selectQualityIssue("opening_hours_missing", { type: "POI" })` wird ausgefuehrt.
3. `activeFilters.type = "POI"` und `activeFilters.criterionId = "opening_hours_missing"`.
4. Die Fehlerliste zeigt nur POI mit fehlenden Oeffnungszeiten, zusaetzlich eingeschraenkt durch Gebiet, Ort und Kategorie.

## Abschnitt 9 - Kontextsensitiver CSV-Export

Umgesetzt in `Statistik/scripts.js`:

- CSV-Exportbutton ruft jetzt `exportCurrentViewToCSV()` auf.
- Normale Statistikansicht exportiert weiterhin die Aggregat-Ergebniszeilen.
- Aktive Fehlerliste exportiert die aktuell gefilterten Fehlerlisten-Datensaetze.
- CSV-Helfer:
  - `csvValue(value)`
  - `downloadCsv(filename, rows)`
  - `slugifyFilenamePart(value)`
  - `buildCsvRowsForResults(rows)`
  - `buildCsvRowsForIssueList(items, criterion)`
  - `activeFilterFilenameParts()`
  - `issueListFilename(criterion)`
  - `exportCurrentViewToCSV()`

Normale Ergebnisansicht:

- Dateiname: `satourn_export.csv`.
- Spalten bleiben wie bisher:
  - Gebiet
  - Ort
  - Typ
  - Kategorie
  - SaTourN
  - Open-Data
  - Open-Data %
  - Status

Aktive Fehlerliste:

- Dateiname: `satourn_fehlerliste_{kriterium}_{filter}.csv`.
- Beispiel: `satourn_fehlerliste_oeffnungszeiten-fehlen_sachsen_poi.csv`.
- Exportiert wird `getIssueListItems()`, also dieselbe aktuell gefilterte Datenbasis wie in der Fehlerlisten-Ansicht.
- Beruecksichtigt werden:
  - Gebiet
  - Ort
  - Typ
  - Kategorie
  - aktives Qualitaetskriterium
- Der Export enthaelt keine unpassenden Datensaetze ausserhalb der aktiven Fehlerliste.

CSV-Spalten fuer Fehlerlisten:

- ID
- Titel
- Typ
- Gebiet
- Ort
- Kategorie
- Fehlendes Kriterium
- Kriterium-ID
- Prioritaet
- Automatisch pruefbar
- Qualitaets-Score
- Qualitaetsstatus
- Open-Data
- Lizenz
- Fehlende Felder
- Empfohlene Aktion
- Letzte Aktualisierung
- URL
- Quelle / Datensatztyp

CSV-Regeln:

- UTF-8 ueber `text/csv;charset=utf-8`.
- Semikolon als Trenner.
- Werte werden in Anfuehrungszeichen gesetzt.
- Anfuehrungszeichen werden verdoppelt.
- Zeilenumbrueche in Zellwerten werden durch Leerzeichen ersetzt.
- `null` und `undefined` werden als leeres Feld geschrieben.
- Boolean-/Open-Data-Werte werden als `Ja`, `Nein` oder `Unbekannt` ausgegeben.

Hinweis:

- Der Export der Kriterien-Matrix ist noch nicht umgesetzt. Abschnitt 9 erlaubt diesen Export optional; aktuell exportiert ohne aktive Fehlerliste weiterhin die normale Ergebnisansicht.
- Der Fehlerlisten-Export basiert wie die Fehlerlisten-UI auf der aktuell im Browser verfuegbaren Datenbasis. Wenn die Qualitaetsdaten nur eine Stichprobe sind, ist auch der CSV-Export eine Stichprobe.

TODOs aus Abschnitt 9:

- Matrix-CSV optional spaeter ergaenzen, sobald die Ansicht als eigener Exportkontext behandelt werden soll.
- Fehlerlisten-CSV spaeter an `/api/quality/scan` oder einen Job-/Export-Endpunkt anbinden, wenn vollstaendige grosse Fehlerlisten exportiert werden muessen.
- UI-Hinweis im Exportkontext deutlicher machen, wenn `qualityDataMeta.truncated === true`.
- Alten, nicht mehr verdrahteten Statistik-Exportblock in `Statistik/scripts.js` bei der finalen Bereinigung entfernen, sobald Node-/Syntaxchecks lokal moeglich sind.

## Abschnitt 10 - KI-Chatbot ueber n8n-Webhook

Umgesetzt in `Statistik/index.html`, `Statistik/style.css` und `Statistik/scripts.js`:

- einklappbares Chatbot-Panel im Dashboard.
- Button `KI-Analyse` unten rechts.
- Panel mit Kontext-Hinweis, Chatverlauf, Eingabefeld, Senden-Button, Ladezustand, Fehlerzustand und Schnellfragen.
- Schnellfragen:
  - Aktuelle Auswahl zusammenfassen
  - Haeufigste Probleme erklaeren
  - Prioritaeten fuer Datenpflege vorschlagen
  - Open-Data-Potenzial bewerten
  - Fehlerliste zusammenfassen
  - CSV-Export empfehlen

Saubere Logik:

- Das Frontend ruft one.intelligence nicht direkt auf.
- Es gibt keine one.intelligence-Keys und keine n8n-Credentials im Repository.
- Die zentrale Konfiguration liegt in `AI_CHAT_CONFIG`.
- `AI_CHAT_CONFIG.webhookUrl` ist leer.
- `AI_CHAT_CONFIG.mockMode` ist standardmaessig `true`.
- Ohne konfigurierte Webhook-URL wird keine externe Anfrage gesendet.
- Ein echter n8n-Aufruf ist vorbereitet, muss aber bewusst per Konfiguration aktiviert werden.

Zentrale Funktionen:

- `buildAiContext()`
- `buildAiSummaryContext(baseItems)`
- `buildAiIssueListContext()`
- `buildAiMatrixContext()`
- `buildAiDetailContext()`
- `limitItemsForAi(items, maxItems)`
- `reduceItemForAi(item)`
- `getActiveFilterDescription()`
- `getActiveIssueForAi()`
- `getVisibleItemsForAi()`
- `askN8nAiWebhook(userMessage, context)`

KI-Kontext:

- Dashboard-Name.
- aktive Ansicht.
- aktive Filter.
- aktive Fehlerliste mit Kriterium, Prioritaet, Empfehlung und Feldern.
- aggregierte Qualitaets-KPIs.
- Top-Probleme.
- Datentyp-Zusammenfassung.
- reduzierte Kriterien-Matrix.
- maximal 50 reduzierte sichtbare Datensaetze.
- Datenlimit-Hinweis mit Sample-Groesse, Truncation-Status und Stichprobenhinweis.

Datenmengenbegrenzung:

- Es werden keine kompletten Rohantworten an n8n gesendet.
- `visibleItemsSample` wird ueber `limitItemsForAi()` begrenzt.
- `reduceItemForAi()` enthaelt nur fachlich relevante Felder:
  - ID
  - Titel
  - Typ
  - Gebiet
  - Ort
  - Kategorie
  - Qualitaets-Score
  - Qualitaetsstatus
  - Open-Data-Hinweis
  - Lizenz
  - fehlende Kriterien
  - Empfehlungen
  - Quell-URL

n8n-Request:

- Bei aktivierter Webhook-URL sendet `askN8nAiWebhook()` ein JSON mit `message`, `context` und `meta`.
- `meta` enthaelt Quelle, Version, Zeitstempel und aktuelle Seiten-URL.
- Fetch nutzt `AbortController` mit Timeout.
- JSON-Antworten und reine Textantworten werden defensiv verarbeitet.
- Fehler werden im UI als verstaendliche Nachricht angezeigt.

Mock-Modus:

- Aktuell aktiv, weil keine Webhook-URL konfiguriert ist.
- Beruecksichtigt aktive Filter, aktive Fehlerliste, Anzahl Datensaetze und haeufigstes Qualitaetsproblem.
- Sendet keine externe Anfrage.
- Gibt Hinweise aus, wenn die Datenbasis gekuerzt oder stichprobenbasiert ist.

Empfohlener Systemprompt fuer n8n / one.intelligence:

- `AI_SYSTEM_PROMPT_FOR_N8N` ist in `Statistik/scripts.js` dokumentiert.
- Der Prompt fordert, nur den bereitgestellten Dashboard-Kontext zu nutzen, keine Daten zu erfinden, fehlende Informationen klar zu benennen und konkrete priorisierte Pflegeempfehlungen zu geben.

TODOs aus Abschnitt 10:

- Chatbot produktlogisch als Sparringspartner fuer Datenqualitaet schaerfen, nicht als vollstaendige Statistik-Engine oder Daten-Orakel.
- Systemprompt fuer n8n/one.intelligence entsprechend anpassen: dialogorientiert, handlungsnah, transparent bei Stichproben und klar bei Aussagen, die einen vollstaendigen Scan erfordern.
- KI-Kontext fuer grosse Datenmengen fachlich klaeren: Das aktuelle `visibleItemsSample` ist auf 50 reduzierte Datensaetze begrenzt und eignet sich nur fuer Beispiele, nicht fuer vollstaendige Fehlerlisten-Auswertungen.
- Spaeter separaten KI-Analysepfad fuer grosse Mengen pruefen, z. B. serverseitige/paginierte Voraggregation, Snapshot, Job-Endpunkt oder n8n-Workflow, der komplette Fehlerlisten kontrolliert nachlaedt und aggregiert.
- Produktive n8n-Webhook-URL ausserhalb des Repositorys konfigurieren.
- `AI_CHAT_CONFIG.mockMode` fuer echte Tests bewusst auf `false` setzen.
- n8n-CORS auf die GitHub-Pages-Domain beschraenken.
- n8n-Webhook mit Rate-Limit, Authentifizierung oder anderer Schutzlogik absichern.
- In n8n Payload validieren und Kontextgroesse erneut pruefen.
- one.intelligence-Anbindung in n8n implementieren.
- Antwortformat in n8n auf `{ answer, suggestions, warnings }` normalisieren.
- Production-Webhook verwenden, nicht Test-Webhook.
- Detailkontext in `buildAiDetailContext()` ergaenzen, sobald Abschnitt 11 die Datensatz-Detailansicht liefert.

## Aktueller Datenfluss

1. Nutzer setzt Filter im Statistik-Dashboard.
2. `currentFilters()` synchronisiert die Basisfilter in `dashboardState.activeFilters`.
3. Statistik-Requests liefern Counts und begrenzte Item-Samples.
4. `collectRawItemsFromJob()` sammelt Item-Samples fuer normale Statistik-Requests.
5. `refreshNormalizedItems()` normalisiert und bewertet Items.
6. `refreshFilteredItems()` bildet:
   - eine Basisliste nach Gebiet, Ort, Typ, Kategorie, Status und Suche.
   - daraus `qualityAggregations`.
   - daraus optional `state.filteredItems` fuer das aktive Kriterium.
7. `renderAll()` rendert bestehende Statistikbereiche und neue Qualitaetsuebersicht.
8. Klick auf Pflegebedarf setzt `activeIssue` und rendert die Fehlerliste.
9. `clearActiveIssue()` schliesst die Fehlerliste und kehrt zur Uebersicht zurueck.
10. Datentyp- und Matrix-Klicks setzen zusaetzlich einen Typ-Kontext und oeffnen die Fehlerliste.
11. Der CSV-Button exportiert je nach aktivem Kontext Statistik-Ergebnisliste oder aktive Fehlerliste.
12. Chatbot erzeugt ueber `buildAiContext()` einen kompakten KI-Kontext aus aktueller Ansicht, aktiven Filtern, Aggregationen und begrenztem Datensatz-Sample.
13. `askN8nAiWebhook()` liefert im aktuellen Stand eine Mock-Antwort oder ruft bei spaeterer Konfiguration den n8n-Webhook auf.

## Aktuell relevante Dateien

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

- `docs/Codex/Datenqualitaetsmonitor_Abschnitt_1_Analyse.md`
- `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`
- `docs/Codex/Datenqualitaetsmonitor_Python_Entscheidung.md`
- `docs/Codex/Datenqualitaetsmonitor_Projektstand_Abschnitte_1_bis_10.md`
- `docs/Codex/Zielbild.md`
- `docs/Codex/SaTourN_Codex_Prompt_Datenqualitaetsmonitor.md`

## Tests und Pruefungen bisher

Ausgefuehrt:

- `git diff --check`

Ergebnis:

- erfolgreich, nur bekannte CRLF-Warnungen.

Nicht ausgefuehrt:

- Node-/npm-basierte Tests oder Syntaxchecks.

Grund:

- `node` ist in der aktuellen Umgebung nicht verfuegbar.

## Bekannte offene Punkte

Naechster fachlicher Abschnitt:

- Abschnitt 11: Detailansicht pro Datensatz.

Technische TODOs:

- spaeter `/api/quality/scan` fuer vollstaendigere Fehlerlisten anbinden.
- optionalen Python-Snapshot- oder Job-Pfad erst einfuehren, wenn klar ist, ob Build-Zeit-Snapshots ausreichen oder ein echter Backend-Dienst noetig ist.
- Matrix-CSV optional spaeter ergaenzen.
- Vollstaendige grosse Fehlerlisten-CSV spaeter ueber Scan-/Job-Endpunkt statt Browser-Stichprobe erzeugen.
- Nicht mehr verdrahteten alten Statistik-Exportblock in `Statistik/scripts.js` bei finaler Bereinigung entfernen.
- UI klar kennzeichnen, wenn Qualitaetswerte nur auf Stichproben basieren.
- Detailansicht pro Datensatz ergaenzen.
- Detailkontext fuer den KI-Chatbot nach Abschnitt 11 ergaenzen.
- n8n-Webhook produktiv konfigurieren und one.intelligence im n8n-Workflow anbinden.
- finale Robustheit, Empty States und Filterkonsistenz in Abschnitt 12 schaerfen.

Risiken:

- clientseitige Qualitaets-KPIs sind aktuell stichprobenbasiert, wenn nicht alle Items geladen wurden.
- destination.one/eT4 unterstuetzt nicht automatisch Filter fuer fehlende JSON-Felder.
- API-Pushdown darf nur nach expliziter Prefix-Verifikation aktiviert werden.
- grosse Fehlerlisten und CSV-Exporte brauchen einen kontrollierten, paginierten oder jobbasierten Datenpfad.

## Kurze Arbeitsregel fuer die naechsten Abschnitte

- Bestehende Statistikansicht nicht umdeuten.
- Neue Qualitaetsansichten aus `dashboardState` und `Statistik/quality.js` ableiten.
- Bei grossen Datenmengen immer Limits, Pagination, Stichprobenhinweise und Abbruchbedingungen beruecksichtigen.
- Python nicht als direkte GitHub-Pages-Laufzeit einplanen; nur fuer Build-/Job-/Offline-Pfade.
- Keine Secrets oder API-Keys ins Frontend.
- Abschnittsweise weiterarbeiten und pro Abschnitt die Dokumentation aktualisieren.
