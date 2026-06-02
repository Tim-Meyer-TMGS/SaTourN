# Datenqualitaets-Monitor - Projektstand Abschnitte 1 bis 7

Stand: 2026-06-02

## Zweck

Dieses Dokument fasst die bisherige Umsetzung des SaTourN-Datenqualitaets-Monitors zusammen. Es ist als Arbeitsstand fuer die weitere Abschnittsarbeit gedacht und ergaenzt:

- `docs/Codex/Datenqualitaetsmonitor_Abschnitt_1_Analyse.md`
- `docs/Codex/Datenqualitaetsmonitor_Datenbasis_und_Limits.md`
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
5. Matrix, Datentyp-Uebersicht, CSV-Export, Detailansicht und KI-Kontext folgen spaeter.

Bis Abschnitt 7 ist die Uebersichtsebene inklusive klickbarer Fehlerlisten umgesetzt. Der CSV-Export der Fehlerliste ist bewusst noch offen.

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
- Matrix- und Datentyp-Uebersicht als UI.

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
- `docs/Codex/Datenqualitaetsmonitor_Projektstand_Abschnitte_1_bis_7.md`
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

- Abschnitt 8: Kriterien-Matrix und Datentyp-Uebersicht anzeigen.

Technische TODOs:

- spaeter `/api/quality/scan` fuer vollstaendigere Fehlerlisten anbinden.
- CSV-Export fuer aktive Fehlerliste ergaenzen.
- UI klar kennzeichnen, wenn Qualitaetswerte nur auf Stichproben basieren.
- Matrix und Datentyp-Uebersicht rendern.
- Detailansicht pro Datensatz ergaenzen.
- KI-Kontext und n8n-Webhook vorbereiten.
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
- Keine Secrets oder API-Keys ins Frontend.
- Abschnittsweise weiterarbeiten und pro Abschnitt die Dokumentation aktualisieren.
