# Datenqualitätsmonitor – React-Preview gegen Live-Seite abgleichen

Stand: 2026-06-30

## Ziel

Diese Checkliste steuert den Übergang vom produktiven Bestandsfrontend unter
`Statistik/` zur React-Preview unter `frontend/`.

Die Live-Seite bleibt führend, bis jede Hauptseite fachlich gleichwertig ist.
Abweichungen werden zuerst nach Funktion und Datenlogik bewertet, erst danach
nach Optik.

## Prüfregel

Jede Seite wird in dieser Reihenfolge geprüft:

1. Arbeitskontext identisch setzen
2. API-Abrufe im Network-Tab vergleichen
3. sichtbare Kennzahlen und Trefferlisten vergleichen
4. leere Zustände, Ladezustände und Fehlerzustände prüfen
5. UI-Abstände, Karten, Tabellen und mobile Darstellung angleichen

## Seiten

### 1. Übersicht

Prüfen:

- Gesamt-Datensätze stimmen mit Live-Seite überein
- Open-Data-Quote stimmt mit Live-Seite überein
- für ganz Sachsen wird kein Qualitätsscore berechnet
- für Gebiet oder Ort wird `/api/quality/summary` genutzt
- `Mit Pflegebedarf`, `Gute Datensätze` und `Kritische Datensätze` stammen aus deduplizierter Bewertung
- wichtigste Pflegeaufgaben zeigen keine Einträge mit `0` Treffern
- Klick auf eine Pflegeaufgabe öffnet die Datensatzliste mit genau diesem Fehler

Kritische Abweichungen:

- Pflegebedarf darf nicht durch Summieren einzelner Fehlercounts entstehen
- gleiche Datensätze mit mehreren Fehlern dürfen nur einmal in Summen zählen

### 2. Pflegeaufgaben

Prüfen:

- Aufgaben werden nach fachlich gleichen Kriterien gruppiert
- Typfilter verändert Counts und Detailspalte korrekt
- Aufgaben mit mehreren Typen zeigen alle betroffenen Typen
- Klick auf Aufgabe oder Typ öffnet die Datensatzliste mit passendem `criterionId` und `type`
- Open-Data-relevante Aufgaben sind korrekt markiert

Kritische Abweichungen:

- Aufgaben dürfen nicht nur in der UI zusammengefasst werden, wenn die Datensatzliste danach andere Logik nutzt

### 3. Datensätze

Prüfen:

- normale Suche gegen `/api/search`
- ID- und `global_id`-Suche
- KI-Suche gegen `/api/oi/search-records`
- KI-Ergebnisse werden anschließend durch die Qualitätskriterien bewertet
- Pflegeaufgabenfilter lädt Treffer über `/api/quality/scan`
- lokale Filter für Kategorie und Problem arbeiten auf der geladenen Trefferliste
- CSV-Export enthält die aktuell gefilterte Liste
- Mailaktion nutzt `/api/oi/mail-draft`
- Detailnavigation speichert den aktuellen Listenstand

Kritische Abweichungen:

- AI-Suche darf keine ungeprüften Treffer anzeigen
- Pflegeaufgabenfilter darf keine leere Liste zeigen, wenn der Count Treffer ausweist

Umgesetzt im React-Preview:

- Datensatzliste und Detailseite nutzen dieselbe Shared-Funktion für die Bewertungsbasis:
  `buildQualityEvaluationInput`
- Suchtreffer, KI-Treffer und Detaildatensätze werden damit vor der Qualitätsbewertung einheitlich normalisiert
- URL-Parameter für Pflegeaufgabenfilter werden stabil aus primitiven Query-Strings abgeleitet, damit das Öffnen einer Aufgabe keinen unnötigen Reload des Loaders auslöst
- Fehlerlisten zeigen jetzt eine echte Fehlermeldung, wenn alle `/api/quality/scan`-Requests scheitern; Teiltreffer bleiben weiterhin nutzbar

### 4. Datensatz-Detail

Prüfen:

- Auflösung per `id`
- Auflösung per `global_id`
- Qualitätsstatus und Score stimmen mit der Datensatzliste überein
- fehlende, erfüllte, vorbereitete und ausgenommene Kriterien werden getrennt dargestellt
- Pflegesystem-Logo stimmt mit `keywords_old` und Importquelle überein
- Medien, Bildurheber und Lizenzangaben werden sauber angezeigt
- Vorher/Nächster nutzt den gespeicherten Listenstand
- Zurücklink führt in den vorherigen Listenmodus zurück

Kritische Abweichungen:

- Detailseite darf keinen anderen Qualitätsstatus berechnen als die Liste
- fehlende Felder dürfen die Seite nicht abbrechen lassen

Umgesetzt im React-Preview:

- Detailseite verwendet dieselbe Bewertungsbasis wie die Datensatzliste
- Zurück aus der Detailseite erhält den ursprünglichen Listenpfad inklusive Pflegeaufgaben-Query, statt pauschal auf `/records` zurückzuspringen
- Der KI-Mailentwurf liegt in der Detailseite im Dropdown `Aktionen`; die Datensatzliste bietet nur noch den Einstieg in die Detailseite.
- Mailentwurf-Helfer sind in `frontend/src/shared/records/record-mail-draft.ts` gekapselt und sprechend benannt (`buildMailDraftUrl`, `openMailDraftInMailClient`, `requestRecordMailDraft`).
- RecordsPage nutzt sprechende Handlernamen (`runRecordSearch`, `resetRecordFilters`, `toggleQuickCriterionFilter`) und verlässt auch den Modus `non_open_data` sauber über `Filter zurücksetzen`.

### 5. Open-Data-Statistik

Prüfen:

- Gesamtbestand, Open-Data-fähig und nicht Open-Data-fähig stimmen mit Live-Seite überein
- Datentypverteilung nutzt dieselben Counts wie die Übersicht
- Quote nach Datentyp ist korrekt
- Lizenz-Pflegehinweis führt in die Datensatzliste aller nicht Open-Data-fähigen Datensätze
- kein doppelter Arbeitskontext auf der Seite

Kritische Abweichungen:

- Open-Data-Status kennt nur Open-Data-fähig oder nicht Open-Data-fähig
- kein zusätzlicher Status `Nicht bewertbar`

Umgesetzt im React-Preview:

- Die Aufgabenkarte in der Open-Data-Statistik nutzt die fachliche Differenz `Gesamt - Open-Data-fähig` statt des engeren `license_missing`-Issue-Counts.
- Der Button öffnet die Datensatzliste mit `list=non_open_data`; dieser Modus nutzt den Search-Proxy mit `isOpenData=false`.
- Die Open-Data-Lizenzdefinition liegt zentral in `lib/open-data-rules.js` und wird von Search-Proxy, Snapshot-Job und Qualitätsmodell gemeinsam genutzt.

### 6. Hilfe

Prüfen:

- Score-Erklärung ist nutzerverständlich
- drei Fehler-Ebenen sind klar getrennt vom Gesamtstatus eines Datensatzes
- Mindestanforderungen je Datentyp kommen aus dem aktuellen Qualitätsmodell
- vorbereitete Kriterien werden nicht als aktive Score-Regeln behauptet
- keine technischen API- oder Pushdown-Begriffe in Nutzertexten

Kritische Abweichungen:

- Hilfe darf keine falsche Gewichtung behaupten, solange die finale Gewichtung noch offen ist

## Abnahmekriterien

Eine Seite gilt als abnahmefähig, wenn:

- API-Abrufe zur fachlichen Aussage passen
- der initiale `/health`-Warmup-Call den Seitenstart nicht blockiert
- Counts, Listen und Detailansichten konsistent sind
- bekannte Sonderfälle sauber abgebildet werden
- mobile Darstellung keine Überlagerungen erzeugt
- Light Mode und Dark Mode lesbar bleiben
- keine Mojibake-Texte sichtbar sind
- keine Console-Fehler aus dem Anwendungscode auftreten

## Aktueller Logikstand

Stand 2026-06-30 sind die zentralen React-Preview-Logiken manuell gegen die
Anwendung geprüft:

- Pflegeaufgaben öffnen korrekt die gefilterte Datensatzliste
- Datensatzliste lädt Pflegeaufgabenfilter, normale Suche, KI-Suche und
  Nicht-Open-Data-Listen
- KI-Suchergebnisse laufen durch die Qualitätsbewertung
- Detailseite lädt aus Datensatzlisten heraus korrekt
- Detailseite erhält Zurück, Vorheriger und Nächster aus dem gespeicherten
  Listenstand
- Mailentwurf wird in der Detailseite über `Aktionen` angestoßen und erzeugt
  nur einen lokalen Mailentwurf
- Open-Data-Statistik öffnet die Nicht-Open-Data-Liste über
  `list=non_open_data`

Damit gilt die fachliche Verlinkungs- und Lade-Logik der Hauptseiten als
stabil genug für den nächsten Schritt.

## Umgesetzt am 2026-07-06

- Render-Warmup wurde in `frontend/src/shared/api/server-warmup.ts` gekapselt.
- Die App startet jetzt mit einem robusteren Health-Check gegen `/health`,
  inklusive Timeout, Wiederholungen und sichtbarem Ladehinweis.
- Mobile Layouts für Header, Arbeitskontext, Navigation, Filter, Tabellen,
  Karten, Detailansicht und Statistik wurden nachgezogen.
- Die Layoutklassen der Hauptseiten sind vereinheitlicht; die Übersicht nutzt
  jetzt eine eigene `overview-main`-Klasse.
- UI-Abgleich bleibt rein visuell; Score-, Such-, Pflegeaufgaben- und
  Detail-Logik wurden dabei nicht verändert.

## Umgesetzt am 2026-07-06: zentrale Frontend-Logik

- Zahlen- und Prozentformatierung liegen zentral in
  `frontend/src/shared/format/formatters.ts`.
- Open-Data- und Qualitäts-Kennzahlen liegen zentral in
  `frontend/src/shared/quality/quality-metrics.ts`.
- Kriterienzugriffe für Label, Fachobjekt und Open-Data-Relevanz liegen zentral
  in `frontend/src/shared/quality/quality-criteria.ts`.
- Links aus Übersicht, Pflegeaufgaben, Statistik und Datensatzliste in die
  Datensatzliste bzw. Detailseite liegen zentral in
  `frontend/src/shared/records/record-list-links.ts`.
- Seitenkomponenten behalten nur noch Seitendarstellung und lokale UI-Zustände;
  wiederverwendete Berechnungs- und Linklogik ist in `shared` verschoben.
- Die Übersicht gruppiert die wichtigsten Pflegeaufgaben jetzt nach denselben
  fachlichen Aufgabenfamilien wie die Pflegeaufgaben-Seite, damit z. B.
  Zahlungsarten nicht pro Datentyp doppelt erscheinen.

## Bekannte Browser-Noise

Die Chrome-Meldung

```text
A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
```

kommt typischerweise von Browser-Erweiterungen und nicht aus der Anwendung.
Die React-Preview filtert genau diese unhandled Promise Rejection, damit echte
App-Fehler und API-Fehler in der Console sichtbar bleiben.

## Aktueller nächster Schritt

1. GitHub-Build der React-Preview prüfen und TypeScript-Fehler zuerst
   bereinigen
2. React-Preview im GitHub-Pages-Build auf Desktop und Mobile visuell prüfen
3. Detailseite und Fehlerlistenansicht gegen mehrere echte Datensätze testen
4. Übergabedokumentation für Entwickler ergänzen

## Umgesetzt am 2026-07-07: Count- und Listenabrufe getrennt

- Die React-Statistik lädt nur noch Statistik-Counts über `loadStatisticRows`.
- Die React-Pflegeaufgaben laden nur noch Pflegeaufgaben-/Issue-Counts über `loadOverviewIssues`.
- Die kombinierte Übersicht nutzt weiterhin `loadOverviewData`, weil sie Kennzahlen und Aufgaben nebeneinander darstellen muss.
- Vollständige Datensatzlisten werden weiterhin nur in der Datensatzansicht geladen, zum Beispiel beim Öffnen einer Pflegeaufgabe oder einer Nicht-Open-Data-Liste.
- Kein Backend-Cache wurde ergänzt, da die kostenlose Betriebsvariante dafür nicht als Grundlage genutzt werden soll.

## Umgesetzt am 2026-07-07: Datensatzlisten paginiert laden

- Die React-Datensatzliste lädt Pflegeaufgabenlisten und Nicht-Open-Data-Listen jetzt seitenweise.
- `RecordsPage` gibt `page` und `pageSize` an die Datenloader weiter und lädt beim Blättern erneut vom Server.
- `records-api.ts` nutzt für `/api/quality/scan` und Search-Aufrufe `limit` und `offset`, statt große Listen vollständig vorzuhalten.
- Normale Suche, ID-Suche und KI-Suche bleiben funktional erhalten; die teuren Listenmodi sind die erste Optimierungsstufe.
- Bei gruppierten Pflegeaufgaben über mehrere Kriterien oder Typen wird die Seitenmenge pro Teilrequest begrenzt und anschließend dedupliziert.

## Umgesetzt am 2026-07-07: Pagination nur für pushdown-fähige Fehlerlisten

Die Datensatzlisten verwenden jetzt eine hybride Pagination:

- API-Pushdown-fähige Pflegeaufgaben nutzen echte serverseitige Seiten über `limit` und `offset`.
- Nicht Open-Data-fähige Listen nutzen ebenfalls serverseitige Pagination.
- `server_scan`-Pflegeaufgaben verwenden keinen Ergebnis-Offset, weil der Server erst nach dem Laden der Quelldaten bewertet. Ein Offset würde dort nicht die nächste Fehlerseite laden, sondern einen anderen Ausschnitt der Rohdaten und wäre fachlich falsch.

Für `server_scan`-Pflegeaufgaben zeigt die React-Ansicht deshalb eine begrenzte erste Trefferliste ohne normale Seiten-Navigation. Ein späterer Ausbau sollte hier cursorbasiert erfolgen, z. B. über einen expliziten `nextCursor` aus `/api/quality/scan`.
## Umgesetzt am 2026-07-07: Request-Deduplizierung und Parallelitätslimit

Der React-API-Client `frontend/src/shared/api/http-client.ts` bündelt jetzt identische laufende Requests und begrenzt parallele Netzwerkaufrufe auf vier gleichzeitige Requests.

Ziel:

- weniger doppelte Abrufe beim Seitenwechsel und Re-Render
- weniger Last auf Render und der META-API
- weniger abgebrochene Requests durch Request-Spitzen
- keine Änderung an fachlicher Qualitätslogik, Scoreberechnung oder API-Pushdown-Entscheidungen

Wichtig:

- Es handelt sich nicht um einen dauerhaften Ergebnis-Cache.
- Sobald ein Request abgeschlossen ist, wird er aus der In-Flight-Liste entfernt.
- Requests mit eigenem `AbortSignal` werden nicht dedupliziert, damit ein abgebrochener Aufrufer keinen gemeinsam genutzten Request beendet.

## Umgesetzt am 2026-07-07: Cursor-Nachladen für Server-Scan-Fehlerlisten

Nicht pushdown-fähige Pflegeaufgaben werden in der React-Datensatzliste jetzt cursorbasiert nachgeladen.

Verhalten:

- API-Pushdown-Listen behalten normale Seitenzahlen über `limit` und `offset`.
- Nicht-Open-Data-Listen behalten normale Seitenzahlen.
- `server_scan`-Listen nutzen `page.nextCursor` aus `/api/quality/scan` und zeigen `Weitere Treffer laden`.
- Neue Treffer werden an die vorhandene Liste angehängt und nach `global_id` bzw. `type:id` dedupliziert.

Einschränkung:

- Cursor-Nachladen wird nur für genau eine Kriterium-Typ-Kombination aktiviert.
- Gruppierte Pflegeaufgaben über mehrere Kriterien oder Datentypen bleiben auf eine begrenzte erste Trefferliste beschränkt, weil dafür mehrere Cursor nötig wären.