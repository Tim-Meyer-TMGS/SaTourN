# Datenqualitaets-Monitor - Arbeitsstand nach Abschnitten

Stand: 2026-06-04

Diese Datei dokumentiert den Fortschritt beim Durcharbeiten von
`../Datenqualitaetsmonitor_Codex_Arbeitsauftrag.md`. Pro Abschnitt wird
festgehalten, was geprueft, konsolidiert und fuer spaetere Arbeit offen ist.

## Punkt 1: Technischer Rahmen

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Bestehende Architektur beibehalten.
- Statisches HTML/CSS/Vanilla-JavaScript-Frontend auf GitHub Pages.
- Node/Express als Proxy fuer API-Key-geschuetzte Destination.One/eT4-Requests.
- Keine neue Build-Kette.
- Keine Secrets, API-Keys oder one.intelligence-Zugaenge im Frontend.
- Statistik-Logik und Qualitaetslogik getrennt halten.
- Bestehende Funktionen bevorzugt erweitern.
- Python nicht als GitHub-Pages-Laufzeit einsetzen.

Aktueller Nachweis aus dem Code:

- `package.json` nutzt Node/Express ohne Frontend-Build-Schritt.
- `index.js` registriert `routes/search.js` und `routes/quality.js`.
- `Statistik/main.js` importiert nur `Statistik/scripts.js`.
- `Statistik/scripts.js` enthaelt `dashboardState` und
  `window.satournDashboardState`.
- `Statistik/quality.js` bleibt zentrale Qualitaetslogik und wird auch vom
  Proxy-Scan verwendet.
- API-Key-Namen liegen serverseitig in `lib/config.js`; Such- und Scan-Routen
  geben bei fehlendem Key nur eine Server-Konfigurationsmeldung aus.

Konsolidierte Archivinformationen:

- Aus `Datenqualitaetsmonitor_Abschnitt_1_Analyse.md`: relevante
  Frontend-/Proxy-Dateien und Anschlussstellen wurden in
  `Datenqualitaetsmonitor_Aktueller_Projektstand.md` uebernommen.
- Aus `Datenqualitaetsmonitor_Python_Entscheidung.md`: Python bleibt fuer
  Build-, Job- oder lokale Analysepfade reserviert und ersetzt nicht die
  Browser-UI.
- Aus den historischen Projektstaenden: `dashboardState`, `qualityDataMeta`,
  `/api/search`, `/api/quality/scan` und `Statistik/quality.js` sind die
  massgeblichen technischen Schnittstellen.

Entscheidung fuer die naechsten Abschnitte:

- Keine Architekturumstellung vornehmen.
- Keine neue Build-Kette, Framework-Migration oder Python-Laufzeit planen.
- Panel-/State-Strukturen duerfen modularisiert werden, aber nicht ohne
  konkreten Nutzen ersetzt werden.
- Neue Seitenstruktur aus spaeteren Punkten muss statisch und API-schonend
  entstehen.

## Punkt 2: Produktziel

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Ziel ist ein mehrseitiger, ruhiger Datenqualitaets-Monitor.
- Die UI soll nicht als ueberladene Single-Page-Anwendung mit immer mehr
  ein-/ausgeblendeten Panels weiterwachsen.
- Perspektivisch sollen mehrere statische HTML-Seiten entstehen.
- Jede Seite soll nur die API-Anfragen ausfuehren, die sie wirklich braucht.
- Das Zielbild bleibt Orientierung, keine pixelgenaue Vorlage.
- Massgebliche Produktqualitaeten: API-schonend, ruhig, gleichmaessig,
  handlungsorientiert, datensatznah, verstaendlich fuer Fachnutzer.

Aktueller Nachweis aus dem Code:

- `Statistik/index.html` ist aktuell noch eine Single-Page-Struktur.
- Die Hauptnavigation nutzt `data-statistik-view` mit acht Bereichen:
  `overview`, `stats`, `quality`, `issues`, `types`, `matrix`, `results`, `ai`.
- Sichtbarkeit laeuft ueber `data-view-panel` und `activePanel` in
  `Statistik/scripts.js`.
- Damit ist das aktuelle System funktional, aber noch nicht am Produktziel
  einer ruhigen Mehrseitenstruktur angekommen.
- API-Schonung ist bereits teilweise umgesetzt: Statistik-Counts bleiben von
  Qualitaets-Samples getrennt, und konkrete Fehlerlisten koennen gezielt ueber
  `/api/quality/scan` geladen werden.

Konsolidierte Archivinformationen:

- Aus der Abschnitt-1-Analyse: bestehende Statistikbereiche sollen nicht
  umgedeutet, sondern ergaenzt bzw. spaeter sauber getrennt werden.
- Aus den historischen Projektstaenden: `activePanel` und `data-view-panel`
  wurden als Zwischenloesung eingefuehrt, nicht als langfristiges Ziel fuer
  weitere Komplexitaet.
- Aus `Datenbasis_und_Limits`: Qualitaetsansichten duerfen keine Vollstaendigkeit
  behaupten, wenn sie nur Browser-Samples nutzen.

Entscheidung fuer die naechsten Abschnitte:

- Neue Arbeit darf das Panel-System nicht weiter vergroessern.
- Die Zielnavigation wird auf wenige Hauptbereiche ausgerichtet:
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- Kriterien-Matrix, Datentypvergleich, KI, CSV und Detail-/Rohdatenansichten
  werden kontextuell erreichbar, nicht als gleichwertige Hauptbereiche
  behandelt.
- Eine echte Mehrseitenstruktur wird schrittweise vorbereitet; bis dahin bleibt
  `activePanel` als Uebergang bestehen.

## Punkt 3: Zentrale Produktperspektive

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Dashboard aus Sicht eines Datenanalysten oder Datenpflegers betrachten.
- Nutzer arbeiten haeufig fuer eine bestimmte Destination, ein Gebiet, einen
  Ort oder bestimmte Datentypen.
- Nicht jede Gesamtstatistik ist fuer jeden Nutzer gleich relevant.
- Leitfrage ist nicht `Wie viele Datensaetze gibt es insgesamt?`, sondern:
  `Welche meiner Datensaetze verhindern gute Nutzung, Open Data, Ausspielung
  oder Weiterverarbeitung?`
- Das Dashboard soll Nutzbarkeit und Pflegebedarf erklaeren, nicht primaer
  abstrakte Vollstaendigkeit.

Aktueller Nachweis aus dem Code:

- `Statistik/index.html` enthaelt Filter fuer Gebiet, Ort, Typ und Kategorie.
- `Statistik/scripts.js` haelt `selectedArea`, `selectedPlace`, `selectedType`
  und `selectedCategory` sowie synchronisierte `activeFilters`.
- `currentFilters()` und `syncActiveFilters()` verbinden UI-Auswahl,
  Statistikabfrage, Qualitaetsfilter, CSV und KI-Kontext.
- `getActiveFilterDescription()` beschreibt den aktuellen Filterkontext fuer
  Fehlerlisten und KI.
- Pflegebedarfe sind bereits klickbar und koennen konkrete Fehlerlisten
  oeffnen.

Luecke zum Zielbild:

- Der aktuelle Einstieg wirkt noch wie eine technische Filter-/Statistikseite.
- Gebiet, Ort und Datentyp sind noch kein dezenter persistenter
  Arbeitskontext, sondern Teil einer grossen Filterleiste.
- Die Tagesfrage des Nutzers wird noch nicht als sichtbare Fuehrung formuliert.

Konsolidierte Archivinformationen:

- Aus der Abschnitt-1-Analyse: bestehende Basisfilter sind zentrale
  Anschlussstellen und duerfen nicht ersetzt werden.
- Aus historischen Projektstaenden: aktive Filter werden bereits konsequent auf
  Qualitaets-KPIs, Fehlerlisten, Datentypen, Matrix, CSV und KI-Kontext
  angewendet.
- Aus Datenbasis/Limits: konkrete Fehlerlisten brauchen eindeutigen Typ- und
  Kriteriumskontext, damit API-Scans kontrolliert bleiben.

Entscheidung fuer die naechsten Abschnitte:

- Gebiet, Ort und Datentyp werden als fachlicher Arbeitskontext verstanden.
- Die vorhandene Filterlogik bleibt Grundlage, wird aber perspektivisch ruhiger
  und kontextorientierter dargestellt.
- Pflegeaufgaben und konkrete Datensaetze haben Vorrang vor abstrakten
  Gesamtzahlen.
- Statistik bleibt Orientierung, nicht die primaere Arbeitsoberflaeche fuer
  Datenpflege.

## Punkt 4: UI-Grundprinzip

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Das UI soll ruhig, gleichmaessig und nicht ueberfordernd sein.
- Zu vermeiden sind zu viele Hauptmenuepunkte, sichtbare Filter, KPIs,
  Warnfarben, Tabellen, technische Startseiten-Details, grosse
  Einstellungsbereiche und auffaellige Statusmeldungen fuer normale technische
  Vorgaenge.
- Stattdessen sollen wenige Hauptbereiche, klare Ueberschriften,
  gleichmaessige Karten, konsistente Abstaende, zurueckhaltende Farben,
  sparsame Handlungsaufforderungen und Progressive Disclosure genutzt werden.
- Leitsatz: Nicht mehr anzeigen, sondern besser fuehren.

Aktueller Nachweis aus dem Code:

- `Statistik/index.html` zeigt aktuell acht gleichrangige Navigationspunkte:
  Ueberblick, Statistik, Datenqualitaet, Fehlerlisten, Datentypen, Kriterien,
  Ergebnisse und KI-Analyse.
- Die erste Steuerflaeche enthaelt Gebiet, Ort, Typ, Kategorie, Sortierung,
  `Alle Gebiete`, Suche, Qualitaetsstatus, Prioritaet, Pruefbarkeit sowie
  mehrere Aktionsbuttons.
- Der Ueberblick kann gleichzeitig Statistik-KPIs, Qualitaets-KPIs,
  Pflegebedarfe, Datentypen und weitere Ergebnisbereiche sichtbar machen.
- `loading-container`, `status-pill`, Fortschrittsbereich, Empty-State,
  Server-Scan-Diagnosen und Fehlerlisten-Hinweise existieren parallel.
- Detailpanel und KI-Seitenpanel sind bereits gute Ansaetze fuer Progressive
  Disclosure, weil Detail- und Analyseinformationen nicht dauerhaft im
  Hauptbereich stehen muessen.

Luecke zum Zielbild:

- Die Startseite ist funktional, wirkt aber noch wie eine technische
  Kontrolloberflaeche mit hoher Dichte.
- Die Hauptnavigation gewichtet Spezialansichten noch gleich stark wie echte
  Arbeitsbereiche.
- Filter, technische Filter und Arbeitskontext sind visuell noch nicht
  getrennt.
- Tabellen und KPI-Bloecke muessen pro Ansicht staerker priorisiert werden.
- Normale technische Vorgaenge duerfen nicht durch dominante Meldungen oder
  Loader mehr Gewicht bekommen als die Pflegeaufgabe.

Konsolidierte Archivinformationen:

- Aus der Abschnitt-1-Analyse: Filtergrid, KPI-Zeile, Charts und Tabelle sind
  etablierte Statistik-Bausteine und sollen nicht ersatzlos verschwinden.
- Aus historischen Projektstaenden: spaetere Abschnitte haben viele neue
  Qualitaetsbereiche ergaenzt; Punkt 4 ist die Korrektur gegen sichtbare
  Ueberladung.
- Aus Datenbasis/Limits: Hinweise zu Stichproben und unvollstaendigen Scans
  bleiben notwendig, muessen aber ruhig und kontextnah angezeigt werden.

Entscheidung fuer die naechsten Abschnitte:

- Keine neuen sichtbaren Hauptbereiche hinzufuegen.
- Spezialfunktionen bevorzugt in bestehende Arbeitsbereiche oder in
  kontextuelle Panels verschieben.
- Filter- und Statusdichte im ersten Sichtbereich reduzieren.
- Detailinformationen, Rohdaten, KI-Analyse und technische Diagnosen nur bei
  Bedarf sichtbar machen.

## Punkt 5: Navigation und Mehrseitenstruktur

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Perspektivisch soll ein echtes Menue mit mehreren Seiten entstehen.
- Hauptnavigation auf wenige ruhige Hauptbereiche reduzieren:
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- Spezialfunktionen werden kontextuell erreichbar:
  Kriterien-Matrix, Datentyp-Vergleich, CSV-Export, KI-Analyse,
  Detail-/Rohdatenansicht und Vergleichswerte.
- Moegliche Zielseiten sind `index.html` oder `overview.html`, `tasks.html`,
  `records.html` und `stats.html`; `compare.html` und `ai.html` bleiben
  optional spaeter.
- Bestehende Panel-Strukturen mit `data-view-panel`, `data-statistik-view` und
  `activePanel` duerfen als Uebergang bestehen bleiben.

Aktueller Nachweis aus dem Code:

- Die aktuelle Navigation ist noch panelbasiert und hat acht Buttons.
- `setActivePanel()` und `updateViewNavigation()` steuern alle Ansichten ueber
  `state.activePanel`.
- Pflegebedarfe, Matrix, Datentypen und Ergebnislisten sind bereits fachlich
  verknuepft: Klicks koennen Fehlerlisten oeffnen oder Filter setzen.
- Die KI-Analyse oeffnet bereits ein Seitenpanel, ist aber zusaetzlich noch als
  Hauptnavigationspunkt vorhanden.
- CSV-Export ist bereits eine Aktion in der Steuerflaeche und muss nicht als
  eigene Seite erscheinen.

Luecke zum Zielbild:

- `quality`, `issues`, `types`, `matrix`, `results` und `ai` sind aktuell noch
  gleichwertige Hauptbereiche, obwohl sie fachlich Unterbereiche oder Aktionen
  sind.
- Eine echte Mehrseitenstruktur ist noch nicht vorbereitet; gemeinsame
  Initialisierung, State-Synchronisierung und Renderfunktionen sind weiter in
  einer grossen `scripts.js` gebuendelt.
- Neue Arbeit muss vermeiden, dass weitere `data-view-panel`-Gruppen entstehen.

Konsolidierte Archivinformationen:

- Aus den historischen Projektstaenden: `activePanel` war als organisatorischer
  Zwischenschritt sinnvoll, darf aber nicht zur dauerhaften
  Informationsarchitektur werden.
- Aus der Abschnitt-1-Analyse: bestehende Statistik und Qualitaetsmodule teilen
  sich Datenfluss und Filter; eine spaetere Mehrseitenstruktur muss diese
  Kopplungen bewusst aufloesen, nicht durch Kopie verdoppeln.

Entscheidung fuer die naechsten Abschnitte:

- Zielnavigation bleibt: Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- Fehlerlisten gehoeren fachlich zu Pflegeaufgaben bzw. Datensaetzen.
- Kriterien-Matrix und Datentypvergleich werden kontextuelle Einstiege, keine
  Hauptnavigation.
- KI bleibt dezente Aktion fuer die aktuelle Ansicht.
- Statische Mehrseitenstruktur wird vorbereitet, sobald konkrete UI-Arbeit
  startet; bis dahin wird das Panel-System nur reduziert oder umgeordnet.

## Punkt 6: Arbeitskontext statt Einstellungsflut

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Nutzer sollen nicht mit einem grossen Einstellungsmenue starten.
- Es soll einen einfachen lokalen Arbeitskontext geben.
- Maximal gespeichert werden Gebiet/Destination, optional Ort und optional
  Datentyp.
- Der Kontext soll Startansicht relevanter machen, API-Anfragen reduzieren und
  wiederholtes Filtern vermeiden.
- Lokale Speicherung nur fuer kleine UI- und Filterwerte, z. B.
  `localStorage`.
- Nicht lokal speichern: vollstaendige API-Antworten, grosse Fehlerlisten,
  Rohdaten, Secrets, KI-Kontexte oder personenbezogene Daten.
- Ohne Arbeitskontext kein komplexer Setup-Prozess, sondern ruhiger Einstieg
  mit Moeglichkeit, den Kontext zu setzen.

Aktueller Nachweis aus dem Code:

- `dashboardState.activeFilters` enthaelt bereits `region`, `city`, `type`,
  `category`, `qualityStatus`, `criterionId`, `priority`, `autoCheck` und
  `search`.
- `selectedArea`, `selectedPlace` und `selectedType` sind vorhandene
  Anschlussstellen fuer Gebiet, Ort und Datentyp.
- `currentFilters()`, `syncActiveFilters()` und `refreshAfterActiveFilterChange()`
  aktualisieren Statistik, Qualitaetslisten, CSV und KI-Kontext konsistent.
- `getActiveFilterDescription()` erzeugt schon eine textliche Beschreibung der
  aktiven Auswahl.
- Eine persistente lokale Kontextspeicherung existiert noch nicht.

Luecke zum Zielbild:

- Die UI zeigt den Kontext noch als Teil einer grossen Filterflaeche, nicht als
  ruhige Header-Information.
- Es gibt noch kein kleines Kontext-Panel oder Modal mit maximal drei Feldern.
- Technische Qualitaetsfilter wie Status, Prioritaet, Pruefbarkeit, Suche und
  Kategorie duerfen nicht mit dem eigentlichen Arbeitskontext vermischt werden.
- Ein lokaler Speichermechanismus muss bewusst klein bleiben und darf keine
  Datenantworten oder KI-Kontexte persistieren.

Konsolidierte Archivinformationen:

- Aus der Abschnitt-1-Analyse: die bestehenden Basisfilter sind stabil und
  sollen weiterverwendet werden.
- Aus historischen Projektstaenden: aktive Filter werden bereits auf alle
  Qualitaetsansichten, Fehlerlisten, CSV und KI-Kontext angewendet; das ist die
  technische Grundlage fuer den Arbeitskontext.
- Aus Datenbasis/Limits: ein enger Arbeitskontext kann API-Budgets schuetzen,
  ersetzt aber keine transparente Kennzeichnung von Samples.

Entscheidung fuer die naechsten Abschnitte:

- Arbeitskontext ist fachlich nur Gebiet, Ort und Datentyp.
- Kategorie, Suche, Qualitaetsstatus, Prioritaet, Pruefbarkeit und Kriterium
  bleiben Ansichts-/Listenfilter.
- Lokale Persistenz darf nur kleine Filterwerte speichern.
- Beim Kontextwechsel muessen aktive Listen, Pflegeaufgaben, Statistik,
  CSV-Dateinamen und KI-Kontext denselben Filterstand nutzen.

## Punkt 7: API-schonende Grundregeln

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Jede Seite laedt nur die Daten, die sie wirklich braucht.
- Keine Seite laedt automatisch alle Datenbereiche.
- `/api/search` bleibt fuer schnelle Statistik-Counts und begrenzte
  Item-Samples.
- Bestehende Statistik-KPIs, Charts, Ergebnisliste und Statistik-CSV bleiben
  auf Aggregatzeilen und `overallcount` basiert.
- Qualitaets-KPIs, Pflegebedarfe, Datentypen, Matrix, Fehlerlisten,
  Detailpanel, KI-Kontext und Fehlerlisten-CSV basieren auf normalisierten
  Items.
- Browser-Samples bleiben begrenzt; grosse Listen werden nicht vollstaendig im
  Browser gesammelt.
- Fehlerlisten werden erst geladen, wenn Nutzer eine konkrete Pflegeaufgabe
  oeffnen.
- `/api/quality/scan` nur nutzen, wenn Typ und Kriterium eindeutig sind.
- API-Pushdown nur fuer verifizierte Kriterium-/Typ-Kombinationen verwenden.
- Keine generischen Negativqueries erzeugen.
- Vollstaendigkeit nur behaupten, wenn Datenbasis und Scan-Budget das hergeben;
  Stichproben immer transparent kennzeichnen.

Aktueller Nachweis aus dem Code:

- `QUALITY_ITEMS_PER_QUERY` und `QUALITY_ITEM_MAX_ITEMS` begrenzen die
  itembasierte Browser-Datenbasis.
- `collectRawItemsFromJob()` sammelt nur begrenzte Samples und setzt
  `qualityDataMeta.truncated`, wenn die Datenbasis unvollstaendig ist.
- `fetchCountForJob()` nutzt `overallcount` fuer Statistikzahlen und sammelt
  Items nur fuer Nicht-Open-Data-Requests.
- `renderQualitySampleNote()` zeigt ausgewertete Datensaetze, geschaetzte
  Grundmenge und Stichprobenbegrenzung.
- `selectQualityIssue()` setzt `activeIssue`, optional den eindeutigen Typ und
  startet `loadServerIssueList()` nur bei vorhandenem `activeIssueType`.
- `routes/quality.js` stellt `/api/quality/scan` als budgetierten Scanpfad
  bereit.
- `routes/search.js` enthaelt den `/api/search`-Proxy und nutzt Cache fuer
  bestimmte Ortslisten-Anfragen.

Luecke zum Zielbild:

- Die Uebersicht kann aktuell noch viele Qualitaetsbereiche auf einmal rendern,
  auch wenn eine spaetere Startseite nur kompakte Lage und naechste Aktionen
  braucht.
- Fehlerlisten-CSV und UI-Hinweise muessen noch deutlicher zwischen Browser-
  Stichprobe, Server-Scan und Vollstaendigkeit unterscheiden.
- Technische Scan-Diagnosen sind in der UI noch sichtbar und muessen ruhiger
  bzw. kontextnah behandelt werden.
- Eine spaetere Mehrseitenstruktur braucht pro Seite klare Lade- und API-
  Regeln, damit nicht alle bisherigen Renderpfade automatisch starten.

Konsolidierte Archivinformationen:

- Aus `Datenbasis_und_Limits`: `/api/search` liefert fuer Statistik ausreichende
  Counts, aber nur begrenzte Items; `qualityDataMeta.truncated` muss ernst
  genommen werden.
- Aus verifizierten Annahmen: API-Pushdown ist nur fuer konkrete gepruefte
  Kriterium-/Typ-Kombinationen erlaubt.
- Aus historischen Projektstaenden: `/api/quality/scan` ist der Pfad fuer
  vollstaendigere Fehlerlisten, nicht fuer pauschale Startseiten-Scans.

Entscheidung fuer die naechsten Abschnitte:

- Neue UI-Bereiche duerfen keine impliziten Vollabfragen ausloesen.
- Startseiten- und Statistikbereiche bleiben bei Counts und kleinen Samples.
- Grosse Fehlerlisten brauchen einen konkreten Nutzerklick auf eine
  Pflegeaufgabe.
- Exportlogik muss die Datenquelle klar benennen: Aggregat, Browser-Stichprobe
  oder Server-Scan.

## Punkt 8: Datenfluss beibehalten und sinnvoll modularisieren

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Bestehender Ablauf bleibt fachlich richtig:
  Nutzer setzt Filter oder Arbeitskontext, aktive Filter werden synchronisiert,
  Statistik-Requests liefern Counts und begrenzte Samples,
  `refreshNormalizedItems()` bewertet Items, `refreshFilteredItems()` baut
  Basislisten und Aggregationen, Render-Funktionen aktualisieren Ansichten.
- Klicks auf Pflegebedarf, Datentyp oder Matrix setzen `activeIssue`.
- Bei eindeutigem Typ und Kriterium nutzt die Fehlerliste `/api/quality/scan`.
- CSV exportiert Statistik-Aggregate oder aktive Fehlerliste.
- Detailpanel und KI-Kontext nutzen reduzierte, gefilterte Daten.
- Modularisierung soll in Richtung Mehrseitenstruktur gehen, ohne bestehende
  Funktionalitaet unnoetig zu brechen.

Aktueller Nachweis aus dem Code:

- `currentFilters()` synchronisiert die UI-Auswahl mit `activeFilters`.
- `prepareRows()` und `buildQueryRows()` erzeugen die Abfragezeilen fuer
  Statistik und Open-Data-Counts.
- `runQueue()` fuehrt die Count-Jobs aus und fuellt `latestRows`.
- `refreshNormalizedItems()` normalisiert und bewertet gesammelte Items ueber
  `Statistik/quality.js`.
- `refreshFilteredItems()` baut `filteredItems` und `qualityAggregations`.
- `renderQualitySections()` ruft Qualitaets-KPIs, Pflegebedarfe, Fehlerliste,
  Datentypen, Matrix und KI-Kontext-Update gebuendelt auf.
- `buildAiContext()` reduziert sichtbare Items und beschreibt Datenlimits.
- `renderIssueList()` nutzt Pagination und oeffnet Datensatzdetails im Panel.

Luecke zum Zielbild:

- `scripts.js` ist weiterhin der zentrale Ort fuer Datenfluss, State,
  Rendering, KI, Detailpanel und Export.
- Eine echte Mehrseitenstruktur braucht modulare Grenzen, ohne dass die
  Filter-/Sample-/Scan-Regeln verdoppelt oder auseinanderlaufen.
- `renderQualitySections()` rendert fuer die aktuelle Single-Page viele Bereiche
  gemeinsam; spaeter sollten Zielseiten nur ihre benoetigten Teilrenderpfade
  starten.

Konsolidierte Archivinformationen:

- Aus der Abschnitt-1-Analyse: bestehende Statistik-Logik darf nicht mit
  itembasierter Qualitaetslogik vermischt werden.
- Aus historischen Projektstaenden: `dashboardState`, `activeFilters`,
  `qualityDataMeta`, `serverIssueList` und `Statistik/quality.js` bilden die
  stabilen Schnittstellen fuer jede Modularisierung.
- Aus Datenbasis/Limits: Datenfluss und UI muessen Stichprobenbegrenzung
  weitergeben, nicht im Renderpfad verlieren.

Entscheidung fuer die naechsten Abschnitte:

- Datenfluss bleibt inhaltlich erhalten.
- Modularisierung beginnt an klaren Grenzen: Datenladen, State/Filter,
  Qualitaetsaggregation, Listenrendering, Statistikrendering, KI-Kontext.
- Keine Kopie von Query- oder Qualitaetslogik pro Seite.
- Gemeinsame Helfer nur auslagern, wenn dadurch die spaetere Seitenstruktur
  einfacher und nicht komplexer wird.

## Punkt 9: Seitenlogik

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- `Uebersicht` ist die ruhige Startseite fuer die wichtigste Lage im aktuellen
  Arbeitskontext.
- Uebersicht zeigt kompakte Qualitaetslage, wichtigste Pflegeaufgaben, dezente
  Open-Data-Kennzahl und klare naechste Aktionen, aber keine Rohdaten, langen
  Tabellen, technischen Fehlermeldungen, komplette Matrix, alle Filter oder
  konkurrierende Diagramme.
- `Pflegeaufgaben` ist der wichtigste Arbeitsbereich und zeigt
  verstaendliche Aufgaben statt technischer Kriterien. Jede Aufgabe ist
  klickbar und fuehrt zu einer konkreten Fehlerliste.
- Pflegeaufgaben-Uebersicht zeigt keine Datensatzdetails wie IDs, URLs,
  Lizenzwerte, Rohdaten oder Score je Datensatz.
- `Datensaetze` ist die konkrete Arbeitsliste auf Datensatzebene mit schlanker
  Standardtabelle: Titel, Typ, Ort/Gebiet, Qualitaetsstatus, wichtigste
  Baustelle, Nutzbarkeit, Aktion.
- Detailinformationen gehoeren ins Detailpanel oder hinter `Mehr Details`.
- Datensaetze duerfen gezielt `/api/quality/scan` nutzen, aber nur bei
  konkretem Typ und Kriterium.
- `Statistik` zeigt aggregierte Statistik und nutzt primaer `overallcount`.
  Sie zeigt keine Datensatzdetails und loest keine unnoetigen Qualitaets-Scans
  aus.

Aktueller Nachweis aus dem Code:

- `overview` zeigt aktuell Statistik- und Qualitaetszusammenfassungen,
  Pflegebedarfe und Datentypen in einer Ansicht.
- `issue-summary` enthaelt bereits klickbare Pflegebedarfe mit Kriterium,
  Anzahl, Datentypen, Prioritaet und Aktion.
- `issue-detail-section` ist die heutige Datensatzliste fuer eine konkrete
  Pflegeaufgabe, aber mit zu vielen Standardspalten.
- `item-detail-panel` haelt Details, Rohdaten und Links bereits in einem
  separaten Panel bereit.
- `summary`, `chart-container` und `result` bilden die Statistikbereiche auf
  Basis von `latestRows`.
- `criteria-matrix-section` und `type-summary-section` sind aktuell eigene
  Panelbereiche, sollen aber kontextuelle Einstiege werden.

Luecke zum Zielbild:

- Die Uebersicht ist noch nicht ruhig genug und zeigt zu viele gleichzeitige
  Informationsarten.
- Pflegeaufgaben sind vorhanden, aber als `Datenqualitaet`/`Fehlerlisten`/
  `Kriterien` auf mehrere Hauptbereiche verteilt.
- Die Datensatzliste ist noch eine Fehlerliste mit technischen Spalten statt
  einer schlanken Arbeitsliste.
- Statistik und Datensaetze teilen sich noch sichtbar denselben
  Single-Page-Kontext.
- Naechste Aktionen sind vorhanden, aber noch nicht als klare Seitenlogik
  formuliert.

Konsolidierte Archivinformationen:

- Aus historischen Projektstaenden: Pflegebedarfe, Matrix und Datentypen sind
  bereits miteinander verdrahtet und koennen als Einstiege in Fehlerlisten
  dienen.
- Aus Datenbasis/Limits: Datensatzseiten duerfen vollstaendigere Listen nur
  ueber konkrete serverseitige Scans oder spaetere Jobs darstellen.
- Aus der Abschnitt-1-Analyse: bestehende Statistik-KPIs und Diagramme bleiben
  wichtig, gehoeren aber in den Statistikbereich.

Entscheidung fuer die naechsten Abschnitte:

- Seitenlogik priorisiert die vier Zielbereiche:
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- Uebersicht wird keine grosse Fehlerliste, keine Matrix und keine Rohdaten
  anzeigen.
- Pflegeaufgaben werden fachlich benannt und fuehren zu Datensatzlisten.
- Datensatzlisten werden schlanker; Detailpanel bleibt Ort fuer technische und
  vollstaendige Details.
- Statistik bleibt aggregiert und `overallcount`-orientiert.

## Punkt 10: Nutzbarkeit statt nur Vollstaendigkeit

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Das Dashboard soll Nutzbarkeit erklaeren, nicht nur Vollstaendigkeit messen.
- Fachliche Kategorien: nutzbar, eingeschraenkt nutzbar, nicht nutzbar, nicht
  bewertbar.
- Fehlende Lizenz bedeutet nicht zwingend schlechte fachliche Pflege, verhindert
  aber Open-Data-Faehigkeit.
- Fehlende Beschreibung, Bildurheber, Oeffnungszeiten, Buchungslink oder
  OePNV-Information haben jeweils unterschiedliche praktische Auswirkungen.
- UI und Texte sollen nicht nur `fehlendes Feld` melden, sondern kurz erklaeren,
  was der Mangel praktisch bedeutet.

Aktueller Nachweis aus dem Code:

- `qualityCriteria` enthaelt fuer jedes aktive Kriterium eine
  `recommendation`, z. B. Lizenzangabe ergaenzen, Beschreibung ergaenzen oder
  OePNV-Anreiseinformationen ergaenzen.
- `evaluateQualityForItem()` leitet `recommendations` aus fehlenden Kriterien
  ab.
- `issueRecommendation()` in `Statistik/scripts.js` nutzt aktive Kriterien und
  Empfehlungen fuer die Fehlerliste.
- `qualityStatus` unterscheidet aktuell `gut`, `pruefen`, `kritisch` und
  `nicht berechenbar`.
- Open-Data-Faehigkeit wird aktuell ueber Statistik-/Lizenzkontext sichtbar,
  aber noch nicht als allgemeine Nutzbarkeitskategorie modelliert.

Luecke zum Zielbild:

- Es gibt noch keine eigene fachliche Nutzbarkeitslogik mit den vier Kategorien
  `nutzbar`, `eingeschraenkt nutzbar`, `nicht nutzbar`, `nicht bewertbar`.
- Empfehlungen sind handlungsnah, erklaeren aber die praktische Bedeutung noch
  nicht konsequent in Uebersicht, Pflegeaufgaben und Datensatzliste.
- `qualityScore`/`qualityStatus` koennen mit Nutzbarkeit verwechselt werden,
  obwohl der Score nur Orientierung ist.
- Die UI braucht eine kompakte Nutzbarkeitsspalte bzw. -kennzeichnung, ohne
  Lizenz/Open-Data/Score redundant nebeneinander zu zeigen.

Konsolidierte Archivinformationen:

- Aus historischen Projektstaenden: Empfehlungen pro Kriterium sind bereits
  vorhanden und koennen fuer Erklaertexte erweitert werden.
- Aus Datenbasis/Limits: Nutzbarkeitsaussagen muessen die Datenbasis
  beruecksichtigen; bei Stichproben darf keine absolute Aussage ueber alle
  Datensaetze entstehen.
- Aus verifizierten Annahmen: Lizenz und Open Data sind fachlich strikt zu
  unterscheiden, duerfen aber in der UI nicht redundant erscheinen.

Entscheidung fuer die naechsten Abschnitte:

- Nutzbarkeit wird als fachliche Erklaerschicht ueber Kriterien und Score
  verstanden.
- `qualityScore` bleibt Orientierung, nicht absolute Wahrheit.
- UI-Texte fuer Pflegeaufgaben sollen praktische Auswirkungen nennen.
- Eine spaetere Datensatzliste darf eine kompakte Nutzbarkeitskennzeichnung
  zeigen, Details bleiben im Detailpanel.

## Punkt 11: Qualitaetslogik

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Aktive Kriterien bleiben:
  `opening_hours_missing`, `license_missing`, `description_missing`,
  `image_missing`, `image_author_missing`, `public_transport_missing`,
  `booking_link_missing`.
- `booking_link_missing` ist fuer Hotel per API-Pushdown verifiziert; Package
  bleibt offen und serverseitig zu pruefen.
- Nicht automatisch aktivieren:
  `geo_missing`, `touristtrip_incomplete`, `manual_image_quality`.
- Score-Logik: 80 bis 100 `gut`, 60 bis 79 `pruefen`, 0 bis 59 `kritisch`,
  nicht berechenbar separat.
- Score ist Orientierung und Motivation, keine absolute Wahrheit.
- Nicht pruefbare Kriterien separat ausweisen.

Aktueller Nachweis aus dem Code:

- `Statistik/quality.js` definiert genau die sieben aktiven Kriterien in
  `qualityCriteria`.
- `getQualityStatus()` setzt die geforderten Score-Schwellen um:
  `>= 80` gut, `>= 60` pruefen, darunter kritisch, sonst nicht berechenbar.
- `calculateQualityScore()` beruecksichtigt nur automatisch pruefbare
  gewichtete Kriterien.
- `evaluateQualityForItem()` erzeugt `missingCriteria`, `fulfilledCriteria`,
  `manualCriteria`, `qualityScore`, `qualityStatus` und `recommendations`.
- `getQualityScanConfig()` unterscheidet API-Pushdown, Server-Scan,
  Verifikation und Warnungen.
- `booking_link_missing` nutzt fuer Hotel `*:* NOT booking:*` als verifizierten
  Pushdown und laesst Package als Server-Scan offen.
- `geo_missing`, `touristtrip_incomplete` und `manual_image_quality` sind nicht
  in `qualityCriteria` aktiv.

Luecke zum Zielbild:

- `image_author_missing` ist technisch `autoCheck: true`, aber bewusst
  `server_scan`; UI muss das als nicht per API-Pushdown verifiziert und nicht
  als Vollstaendigkeit aus Browser-Sample darstellen.
- Es gibt aktuell keine aktiven `autoCheck: false`-Kriterien; falls spaeter
  manuelle Kriterien ergaenzt werden, muss ihre separate Darstellung erhalten
  bleiben.
- Score und Status sind vorhanden, duerfen aber in Pflegeaufgaben nicht zu viel
  Gewicht gegenueber konkreter Handlung bekommen.

Konsolidierte Archivinformationen:

- Aus verifizierten Annahmen: API-Pushdown nur fuer dokumentierte Kombinationen;
  generische Negativqueries bleiben verboten.
- Aus historischen Projektstaenden: Kriterienkonfiguration ist die zentrale
  Quelle fuer UI, Aggregationen, Fehlerlisten, CSV und Proxy-Scan.
- Aus fachlich offenen Punkten: Package-Buchungslink, Hotel-Bild/Beschreibung
  und Event-Beispiele bleiben offen.

Entscheidung fuer die naechsten Abschnitte:

- Aktive Kriterienliste bleibt unveraendert, bis neue Feldannahmen verifiziert
  sind.
- Keine automatische Aktivierung von Geo, TouristTrip oder manueller
  Bildqualitaet.
- Score wird weiter berechnet, aber UI soll Pflegeaufgabe und Nutzbarkeit vor
  Score-Zahl priorisieren.
- Package-Buchungslink bleibt offenes Fach-/API-Thema.

## Punkt 12: Reale Feldmappings

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Bestehende reale Feldmappings verwenden.
- Lizenz: `attributes[].key = license` mit `CC0`, `CC-BY`, `CC-BY-SA`, `PD`.
- Beschreibung: `texts[].rel = details`; Teaser allein zaehlt nicht.
- Oeffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen`.
- Bild: pruefbare `media_objects[]`, nicht `booking`, `canonical`, `logo`,
  `socialmedia`.
- Bildurheber: pruefbare Medien ohne `copyrightText`.
- OePNV: `features[].value` oder `features_old[]` enthaelt
  `Mit OePNV erreichbar`.
- Hotel-Buchungslink: `media_objects[].rel = booking` mit nicht-leerer `url`.
- Gebiet/Kategorie: `areas[]`/`areas_old[]` und
  `categories[]`/`categories_old[]`.
- Keine neuen Feldannahmen ohne Pruefung.

Aktueller Nachweis aus dem Code:

- `hasValidDatasetLicense()` prueft Lizenzattribute gegen erlaubte Open-Data-
  Werte.
- `hasDescription()` nutzt Details-Texte; reine Teaser sollen nicht als
  vollwertige Beschreibung zaehlen.
- `hasOpeningHours()` beruecksichtigt Openings-Texte, Zeitintervalle und
  `alwaysOpen`.
- `hasImages()` filtert pruefbare Medien und schliesst u. a. Booking,
  Canonical, Logo und Socialmedia aus.
- `hasImageAuthor()` prueft Copyright-/Urheberangaben fuer pruefbare Medien.
- `hasPublicTransportFeature()` wertet OePNV-Features aus.
- `hasBookingLink()` prueft Buchungs-/Reservierungslinks.
- Normalisierung nutzt Gebiet und Kategorie aus realen Area-/Category-
  Strukturen und Fallbacks.

Luecke zum Zielbild:

- Neue Typen oder Kriterien duerfen nicht durch Alias-Fallbacks allein als
  fachlich verifiziert gelten.
- Package-Buchungslink ist im Mapping noch offen und muss gegen echte API- und
  Beispieldaten geprueft werden.
- Hotel `image_missing` und `description_missing` sind fachlich offen und
  duerfen ohne Entscheidung nicht automatisch aktiv werden.
- Event-spezifische Kriterien brauchen echte Event-Beispiele.

Konsolidierte Archivinformationen:

- Aus verifizierten Annahmen: reale Feldmappings sind dokumentiert und duerfen
  nicht durch generische Feldnamen ersetzt werden.
- Aus Beispieldaten: POI, Gastro, Tour und Hotel liegen als Fixtures vor; Event
  fehlt als belastbares Beispiel.
- Aus Datenbasis/Limits: Feldmappings und API-Queries muessen gemeinsam
  verifiziert werden, bevor UI Vollstaendigkeit behauptet.

Entscheidung fuer die naechsten Abschnitte:

- `Statistik/quality.js` bleibt Quelle fuer Feldchecks und Kriterienmappings.
- Keine neuen Kriterien, Typ-Erweiterungen oder API-Pushdowns ohne dokumentierte
  Verifikation.
- Alias-Fallbacks duerfen Robustheit helfen, ersetzen aber keine fachliche
  Feldentscheidung.

## Punkt 13: Tabellen verschlanken

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Jede Tabelle braucht einen klaren Zweck.
- Jede Spalte muss eine aktuelle Entscheidung unterstuetzen oder ins
  Detailpanel wandern.
- Tabellen sollen Entscheidungshilfe sein, keine Datenablage.

Aktueller Nachweis aus dem Code:

- `ISSUE_LIST_COLUMNS` enthaelt aktuell 15 Spalten: Titel, ID, Typ, Gebiet, Ort,
  Kategorie, Kriterium, Prioritaet, Score, Status, Open-Data, Lizenz, letzte
  Aktualisierung, Empfehlung und Link/URL.
- `renderTable()` bleibt fuer aggregierte Statistik sinnvoll, weil dort
  Gebiet/Ort/Typ/Kategorie, Counts und Open-Data-Quote verglichen werden.
- `renderIssueList()` ist die wichtigste Verschlankungsstelle, weil sie eine
  konkrete Pflegeaufgabe bereits kennt und deshalb viele technische Spalten
  nicht sofort zeigen muss.

Entscheidung:

- Zuerst Fehlerlisten verschlanken.
- Statistiktabellen bleiben aggregiert und duerfen zahlenorientiert bleiben.
- Datensatzdetails werden nicht geloescht, sondern in Detailpanel, Aktionen
  oder CSV verschoben.

## Punkt 14: Doppelte Bedeutungen entfernen

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Fachlich gleiche oder fast gleiche Spalten vermeiden.
- Lizenz/Open Data/Lizenzstatus/Lizenz fehlt nicht redundant nebeneinander
  anzeigen.
- Kontext entscheidet: Pflegeaufgabe, allgemeine Datensatzliste oder Statistik.

Aktueller Nachweis aus dem Code:

- Fehlerliste zeigt aktuell gleichzeitig Kriterium, Open-Data, Lizenz,
  Qualitaets-Score und Qualitaetsstatus.
- Bei `license_missing` ist die Spalte `Lizenz` redundant, weil alle Eintraege
  wegen fehlender Lizenz erscheinen.
- Statistik-CSV und Fehlerlisten-CSV duerfen mehr Felder enthalten als die UI,
  brauchen aber klare Zuordnung.

Entscheidung:

- In Pflegeaufgaben wird die Aufgabe selbst zum Kontext; redundante Status- und
  Lizenzspalten werden aus der UI-Tabelle entfernt.
- Allgemeine Datensatzlisten erhalten spaeter eine kompakte Nutzbarkeitsspalte.
- Statistik zeigt Lizenz/Open Data nur aggregiert.

## Punkt 15: Fehlerlisten verschlanken

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Eine geoeffnete Pflegeaufgabe zeigt eine schlanke Liste.
- Standardspalten: Titel, Typ, Ort/Gebiet, Kategorie nur falls relevant,
  Problem, Naechster Schritt, Aktion.
- Optional nur bei echtem Nutzen: ID, letzte Aktualisierung, Qualitaetsstatus.
- Nicht standardmaessig: Open-Data-Status bei Open-Data-Aufgabe, Lizenzwert bei
  Lizenz-fehlt, Score, global_id, lange URLs, Rohdaten, technische Fehlercodes.

Aktueller Nachweis aus dem Code:

- `renderIssueList()` rendert aktuell alle `ISSUE_LIST_COLUMNS`.
- Jede Zeile ist bereits klickbar und oeffnet `openItemDetailPanel(item)`.
- Pagination mit `issueListPageSize = 50` existiert.
- `issueRowValues()` berechnet bereits alle benoetigten Werte; Verschlankung
  kann daher im Rendering/Spaltensatz erfolgen, ohne Datenverlust.

Entscheidung:

- UI-Fehlerliste wird auf Arbeitsspalten reduziert.
- Detailpanel und CSV behalten weiterfuehrende Informationen.
- Die Liste bleibt datensatzbasiert, paginiert und klickbar.

## Punkt 16: Detailpanel als Entlastung nutzen

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Selten benoetigte Informationen gehoeren ins Detailpanel.
- Dazu zaehlen ID, global_id, konkrete Lizenz, Open-Data-Status, Score, Status,
  Pages-Link, Quell-URL, letzte Aktualisierung, vollstaendige Kriterienbewertung,
  Rohdaten-Auszug und Debug-Informationen.

Aktueller Nachweis aus dem Code:

- `item-detail-panel` existiert als Seitenpanel.
- `openItemDetailPanel()` zeigt Stammdaten, Open-Data-Status, Lizenz, Score,
  Qualitaetsstatus, Links, fehlende/erfuellte/manuelle Kriterien, Empfehlungen
  und Rohdaten in einem `details`-Block.
- Damit ist die technische Grundlage fuer Tabellenverschlankung bereits
  vorhanden.

Entscheidung:

- Detailpanel bleibt die Tiefe.
- Tabellen duerfen dadurch deutlich schlanker werden.
- Rohdaten bleiben hinter expliziter Nutzeraktion.

## Punkt 17: Aktionen statt Spalten

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Informationen, die nur fuer eine Handlung gebraucht werden, als Aktion
  anbieten statt als eigene Spalte.
- Beispiele: ID kopieren, Link oeffnen, Link kopieren, Details anzeigen,
  kompakter naechster Schritt statt mehrerer Statusspalten.

Aktueller Nachweis aus dem Code:

- Fehlerlistenzeilen sind bereits als Detail-Aktion klickbar.
- Links liegen aktuell im Detailpanel; in der Tabelle steht aber weiterhin eine
  Link/URL-Spalte.
- Copy-Aktionen fuer ID/global_id/Page-Link sind noch nicht sichtbar umgesetzt.

Entscheidung:

- Fehlerlisten erhalten eine Aktion-Spalte statt URL-/ID-Spalten.
- Copy-/Open-Aktionen werden spaeter dort ergaenzt, wo sie einen Workflow
  beschleunigen.

## Punkt 18: Ladezustaende ins UI integrieren

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Loader komponentennah und ruhig integrieren.
- Keine dominanten globalen Loader fuer kleine Teilbereiche.
- Ladezustand soll sagen, was gerade laedt: Pflegeaufgaben, Fehlerliste,
  Statistik usw.

Aktueller Nachweis aus dem Code:

- Es gibt einen globalen `loading-container` mit grosser Grafik und den Text
  `Abfrage laeuft...`.
- Fehlerliste hat bereits einen lokalen Zustand
  `Server-Fehlerliste wird geladen ...`.
- Fortschritt (`progWrap`) zeigt technische Gesamtabfrage-Progression.

Entscheidung:

- Globale Ladeanzeige wird bei UI-Arbeit reduziert.
- Lokale Ladezustaende fuer Uebersicht, Pflegeaufgaben, Fehlerliste und
  Statistik werden bevorzugt.
- Fortschritt bleibt nur sichtbar, wenn er fuer Nutzer wirklich relevant ist.

## Punkt 19: Statusmeldungen aus dem UI reduzieren

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Technische Statusmeldungen nicht dauerhaft im UI zeigen.
- API-Details, URLs, Stacktraces, Debug-Ausgaben, Diagnosen und interne
  Statuswechsel in die Console verschieben.
- UI-Meldungen kurz, nutzerrelevant und handlungsorientiert halten.

Aktueller Nachweis aus dem Code:

- `serverIssueDiagnosticText()` schreibt Methode, Query, Verifikation,
  Warnungen, Vollstaendigkeit, Grund, `overallcount` und gescannte Items direkt
  in die Fehlerlisten-Kopfzeile.
- `fetchCountForJob()` baut technische Fehlertexte mit URL, Status,
  Content-Type und Preview.
- `setPill()` zeigt mehrere Erfolgsmeldungen wie `Pflegebedarf gewaehlt`,
  `CSV exportiert` oder `Fehlerliste exportiert`.

Entscheidung:

- Technische Scan-/HTTP-/Query-Details wandern in `console.warn()` oder
  `console.error()`.
- UI zeigt nur kurze Meldungen und Datenlimit-Hinweise.
- Erfolgreiche Aktionen brauchen nicht immer sichtbare Status-Pills.

## Punkt 20: Visuelle Entlastung

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Weniger Tabellenraender, Badges und farbige Statuslabels.
- Keine Warnfarbe fuer normale oder mittlere Hinweise.
- Kritische Farben nur fuer echte kritische Pflegebedarfe.
- Texttabellen linksbuendig, Statistik-/Aggregatzahlen passend ausrichten.
- Lange Inhalte umbrechen oder ins Detailpanel verschieben.

Aktueller Nachweis aus dem Code:

- `style.css` enthaelt bereits responsive Tabellen- und Panelregeln.
- Fehlerlisten haben viele Spalten und werden ueber CSS teilweise verdeckt bzw.
  schmaler gemacht.
- Prioritaets- und Statusklassen existieren und muessen sparsamer eingesetzt
  werden.

Entscheidung:

- Visuelle Reduktion folgt der Tabellenverschlankung.
- Kritische Signalfarbe nur fuer echte kritische Pflegebedarfe.
- Technische IDs und lange Links bleiben unprominent.

## Punkt 21: ET4-Pages-Links

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Automatische ET4-Pages-Links nur fuer verifizierte Typen erzeugen.
- Aktuell verifiziert ist POI:
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`.
- Items ohne `global_id` duerfen keinen geratenen Pages-Link erhalten.
- Links nicht als lange Tabellen-URL zeigen, sondern als Oeffnen-/Kopieraktion.

Aktueller Nachweis aus dem Code:

- Projektstand dokumentiert aktuell nur POI als verifiziert.
- `openItemDetailPanel()` zeigt `ET4 Pages oeffnen` mit Hinweis auf
  verifiziertes POI-Mapping.
- Andere Typen duerfen noch nicht automatisch als Pages-Link erzeugt werden,
  solange sie nicht verifiziert sind.

Entscheidung:

- POI bleibt aktuell der einzige automatisch verifizierte ET4-Pages-Link.
- Andere Typen bleiben TODO, auch wenn der Arbeitsauftrag eine plausible
  Segmentlogik nennt.
- Kein `global_id`, kein Pages-Link.

## Punkt 22: KI/n8n

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- KI bleibt optional und dezent.
- KI laeuft ueber n8n; one.intelligence-Keys gehoeren nicht ins Frontend.
- Browser sendet nur reduzierten Dashboard-Kontext, keine kompletten Rohdaten,
  Bilddaten oder unnoetigen personenbezogenen Daten.
- `buildAiContext()` begrenzt sichtbare Items standardmaessig auf 50 reduzierte
  Datensaetze.
- KI-Antworten muessen transparent sein, besonders bei Samples.
- KI soll nicht als Hauptnavigation dominieren.

Aktueller Nachweis aus dem Code:

- `buildAiContext()` reduziert Items und enthaelt `dataLimit` mit
  `sampleSize`, `truncated`, `browserDataMode`, `collectedItems` und
  `estimatedTotalItems`.
- `reduceItemForAi()` wird fuer sichtbare Items und Detailkontext verwendet.
- KI ist als Seitenpanel vorhanden, aber auch noch als Hauptnavigationspunkt
  `ai`.
- n8n-Konfiguration liegt im Frontend ohne one.intelligence-Key, nutzt optional
  Webhook/Mock-Modus.

Entscheidung:

- KI bleibt Seitenpanel/Aktion fuer die aktuelle Ansicht.
- Hauptnavigation soll KI spaeter nicht mehr als gleichwertigen Bereich zeigen.
- Kontextbegrenzung und Sample-Transparenz bleiben Pflicht.

## Punkt 23: CSV-Export

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- CSV-Export passt zur jeweiligen Ansicht.
- Statistik exportiert aggregierte Statistikdaten.
- Pflegeaufgaben/Datensaetze exportieren die aktuelle Fehlerliste.
- Fehlerlisten-CSV soll perspektivisch serverseitige Treffer beruecksichtigen.
- Wenn Samples exportiert werden, muss das in UI und Exportkontext klar sein.
- CSV darf technischer sein als die UI-Tabelle, wenn es fuer Weiterverarbeitung
  sinnvoll ist.

Aktueller Nachweis aus dem Code:

- `exportCurrentViewToCSV()` exportiert bei aktivem Issue die Fehlerliste,
  sonst Statistikdaten.
- `buildCsvRowsForResults()` exportiert Aggregatfelder.
- `buildCsvRowsForIssueList()` exportiert bewusst mehr technische Felder als
  die UI enthalten soll.
- Ein klarer Exportkontext fuer Browser-Sample vs. Server-Scan ist noch nicht
  im CSV enthalten.

Entscheidung:

- UI-Tabelle wird schlank, CSV darf erweitert bleiben.
- CSV braucht spaeter Datenquellen-/Sample-Hinweise.
- Vollstaendige grosse Exporte brauchen Server-Scan oder spaetere Job-/Snapshot-
  Pfade.

## Punkt 24: Migration

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Schrittweise migrieren, keine komplette Neuentwicklung.
- Reihenfolge: Verstehen, Navigation reduzieren, Arbeitskontext, Uebersicht,
  Tabellen/Fehlerlisten, Statusmeldungen, Loader, Pflegeaufgaben,
  Datensatzlisten, Statistiktrennung, JS-Helfer, echte HTML-Seiten,
  Panel-Komplexitaet reduzieren.
- Bestehende Funktionalitaet nicht unnoetig brechen.

Aktueller Nachweis aus dem Code:

- Der bestehende Single-Page-Stand ist funktional, aber dicht.
- Viele Zielbausteine existieren bereits: Detailpanel, KI-Panel, Pagination,
  Server-Scan, CSV, zentrale Qualitaetslogik.
- Deshalb ist inkrementelle Migration realistisch.

Entscheidung:

- Naechste echte Umsetzung beginnt nicht mit Mehrseiten-Neubau.
- Erste Codearbeit soll UI-Audit, Fehlerlistenverschlankung, Statusmeldungen
  und Loader priorisieren.
- Mehrseitenstruktur wird vorbereitet, nicht erzwungen.

## Punkt 25: Konkrete erste Umsetzungsschritte

Status: konsolidiert am 2026-06-04.

Gepruefter Auftrag:

- Start mit kleinen, ueberpruefbaren Aenderungen.
- Schritt 1: UI auditieren.
- Schritt 2: Tabellen verschlanken, zuerst Fehlerlisten.
- Schritt 3: Statusmeldungen umbauen.
- Schritt 4: Loader komponentennah integrieren.
- Schritt 5: Arbeitskontext vorbereiten.
- Schritt 6: Navigation beruhigen.

Aktueller Nachweis aus dem Code:

- Auditpunkte sind konkret vorhanden: acht Hauptnavigationspunkte, globale
  Steuerflaeche, grosse Fehlerlistentabelle, sichtbare Serverdiagnosen,
  globaler Loader, KI als Hauptnavigation.
- Fehlerlistenverschlankung kann isoliert an `ISSUE_LIST_COLUMNS`,
  `issueRowValues()` und `renderIssueList()` beginnen.
- Statusumbau betrifft `serverIssueDiagnosticText()`, Fehlertexte,
  `setPill()`-Verwendungen und Console-Ausgaben.
- Loaderumbau betrifft `loading-container`, `progWrap` und lokale Listenstates.

Entscheidung fuer Umsetzung:

- Die operative Aufgabenliste in
  `Datenqualitaetsmonitor_Offene_TODOs.md` bleibt fuehrend fuer die naechsten
  Codeaenderungen.
- Reihenfolge fuer die naechste Umsetzung:
  UI-Audit, Fehlerlisten verschlanken, Statusmeldungen, Loader, Arbeitskontext,
  Navigation.

## Umsetzung: Umbau Statistik - Startseite

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Gepruefte Quellen:

- `docs/Codex/Umbau_Statistik/Startseite.png`
- `docs/Codex/Umbau_Statistik/Startseite.md` (als umbenanntes Office-Dokument
  ausgelesen)

Umgesetzte Anpassungen:

- `Statistik/index.html` wurde als helle Startseite nach Mockup neu aufgebaut.
- Gemeinsame App-Shell mit Kopfzeile, Arbeitskontext, Seitenleiste und
  Aktualisierungsstatus ist vorbereitet.
- Echte HTML-Zielseiten fuer `Pflegeaufgaben`, `Datensaetze` und `Statistik`
  wurden angelegt.
- Platzhalterseiten initialisieren nur die Shell und loesen keine Daten- oder
  Qualitaets-API-Aufrufe aus.
- Arbeitskontext wird lokal unter `satournWorkContext` gespeichert und umfasst
  Region, Ort und Datentyp.
- Die Startseite nutzt `/api/search` fuer Summen und Open-Data-Zaehler mit
  `limit=1`.
- Qualitaets-KPIs basieren auf begrenzten Stichproben pro Datentyp und
  verwenden weiter `quality.js`; `/api/quality/scan` wird auf der Startseite
  nicht verwendet.
- Die UI zeigt KPI-Karten, priorisierte Pflegeaufgaben, Qualitaetsverteilung,
  Open-Data-Status und Schnellzugriffe ohne grosse Tabellen oder technische
  Debug-Ausgaben.
- CSV-Export der Startseitenuebersicht ist vorbereitet.

Bewusste Einschraenkungen:

- Pflegeaufgaben, Datensatzlisten und Statistik sind als Zielseiten angelegt,
  aber noch nicht nach ihren eigenen Mockups umgesetzt.
- Qualitaetszahlen der Startseite sind Stichprobenwerte; vollstaendige
  serverseitige Auswertungen bleiben spaeteren Detailseiten vorbehalten.
- Lokale Browser-Sichtpruefung konnte mangels Projektserver/Build-Manifest und
  ohne Node/npm in dieser Umgebung nicht automatisiert werden.

Pruefung:

- `rg` gegen alte Dashboard-Haken und `quality/scan` in `Statistik` ohne Treffer.
- `git diff --check` ohne Fehler.

## Umsetzung: Umbau Statistik - Pflegeaufgaben

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Gepruefte Quellen:

- `docs/Codex/Umbau_Statistik/Pflegeaufgaben.png`
- `docs/Codex/Umbau_Statistik/Datenqualitaetsmonitor_Pflegeaufgaben_Seite.md`

Umgesetzte Anpassungen:

- `Statistik/tasks.html` wurde von einem Platzhalter zu einer echten
  Pflegeaufgaben-Seite nach Mockup umgebaut.
- Die Seite nutzt dieselbe helle App-Shell mit Header, Arbeitskontext,
  Seitenleiste und Aktualisierung wie die Startseite.
- Obere KPI-Zeile zeigt offene Aufgaben, hohe Prioritaet, betroffene
  Datensatz-Treffer, Open-Data-Relevanz und abgeleitetes Potenzial.
- Filterleiste fuer Suche, Prioritaet, Datentyp, Pruefbarkeit und Auswirkung
  wirkt lokal auf die Aufgabenuebersicht.
- Aufgabenliste entsteht aus `qualityCriteria` und
  `qualityAggregations.issueSummary` auf Basis begrenzter Samples.
- Aufgaben ohne betroffene Datensaetze werden nicht angezeigt.
- Detailkarte zeigt Problem, Auswirkung, empfohlene Aktion, betroffene Typen,
  Pruefbarkeit und Datenbasis-Hinweis.
- `/api/quality/scan` wird nicht beim Seitenaufruf genutzt, sondern erst nach
  Klick auf `Datensaetze anzeigen` fuer konkrete Aufgabe und konkreten Typ.
- Datensatzliste bleibt schlank: Titel, Typ, Ort/Gebiet, Problem, naechster
  Schritt und Aktion.
- CSV-Export ist nur aktiv, wenn Datensatzzeilen geladen wurden.
- Primaersystem-Hinweise werden nur funktional gerendert: Outdooractive nur mit
  vorhandener Source-ID, Feratel Deskline nur fuer Hotel/Unterkunft ohne
  geratenen Link.

Bewusste Einschraenkungen:

- Betroffenen-Zahlen auf der Aufgabenuebersicht sind Sample-basiert und werden
  entsprechend gekennzeichnet.
- Vollstaendigere Trefferlisten entstehen erst ueber den budgetierten
  Server-Scan pro Aufgabe und Typ.
- Browser-Sichtpruefung gegen das Mockup konnte in dieser Umgebung weiterhin
  nicht automatisiert werden, weil keine lokale Preview-/Build-Umgebung und
  kein Node/npm verfuegbar sind.

Pruefung:

- `rg` gegen Mock-/Ticketsystem-Begriffe in `Statistik/tasks.html` und
  `Statistik/scripts.js` ohne Treffer.
- `/api/quality/scan` in `Statistik/scripts.js` nur fuer `loadTaskRecords()`.
- `git diff --check` ohne Fehler.

## Umsetzung: Umbau Statistik - Datensaetze-Hauptseite

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Gepruefte Quellen:

- `docs/Codex/Umbau_Statistik/Datensatz-Haupseite.png`
- `docs/Codex/Umbau_Statistik/Datenqualitaetsmonitor_Datensaetze_Hauptseiteg.md`

Abgrenzung:

- Die Datensatz-Detailseite wurde bewusst nicht umgesetzt. Sie bleibt der
  naechste separate Abschnitt.

Umgesetzte Anpassungen:

- `Statistik/records.html` wurde von einem Platzhalter zu einer eigenstaendigen
  Datensaetze-Hauptseite nach Mockup umgebaut.
- Die Seite nutzt die gemeinsame helle App-Shell mit aktivem Hauptnavpunkt
  `Datensaetze`.
- Ein gemeinsames Suchfeld deckt Titel, ID, `global_id`, Ort, Gebiet,
  Kategorie, Typ und Problem/Kriterium ab.
- Suche waehrend der Eingabe filtert lokal mit Debounce und loest keine
  API-Anfrage pro Tastendruck aus.
- Explizite Suche per Enter oder Button startet nur dann eine gezielte
  API-Suche, wenn lokal keine Treffer vorhanden sind und der Suchbegriff wie
  eine ID oder `global_id` aussieht.
- Erste Filterebene umfasst Typ, Kategorie, Qualitaetsstatus und
  Problem/Kriterium; Schnellfilter sind lokal auf der geladenen Datenbasis.
- Tabelle bleibt schlank: Titel mit kleinem Bild/Platzhalter und IDs unter dem
  Titel, Typ, Ort/Gebiet, Kategorie, Qualitaetsstatus, Hauptproblem,
  Qualitaets-Score, Aktualisierung und Aktionen.
- ViewModels trennen Tabellenanzeige von Rohdaten.
- Detail-Links zeigen vorbereitet auf `record-detail.html` mit Typ und ID bzw.
  `global_id`, ohne die Detailseite jetzt zu bauen.
- Pagination mit 25/50/100 pro Seite ist umgesetzt; `Alle anzeigen` gibt es
  nicht.
- CSV-Export bezieht sich auf die aktuell gefilterte Liste und enthaelt
  zusaetzliche technische Felder fuer Weiterverarbeitung.

Bewusste Einschraenkungen:

- Die Liste basiert beim Laden auf begrenzten Samples pro Typ und wird
  entsprechend gekennzeichnet.
- Eine vollstaendige serverseitige Fehlerliste wird auf dieser Hauptseite nicht
  automatisch geladen.
- Grid-Ansicht und Spaltensteuerung sind nur als ruhige, deaktivierte
  Oberflaechenanker vorbereitet.
- Browser-Sichtpruefung gegen das Mockup konnte in dieser Umgebung weiterhin
  nicht automatisiert werden.

Pruefung:

- `git diff --check` ohne Fehler.
- Keine Detailseiten-Umsetzung in diesem Schritt.

## Umsetzung: Umbau Statistik - Datensatz-Detailseite

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Gepruefte Quellen:

- `docs/Codex/Umbau_Statistik/Detailansicht datensatz.png`
- `docs/Codex/Umbau_Statistik/Datenqualitaetsmonitor_Datensatz_Detailseite.md`

Umgesetzte Anpassungen:

- `Statistik/record-detail.html` wurde als eigene statische Detailseite
  angelegt.
- Die Hauptnavigation markiert weiterhin `Datensaetze` als aktiven Bereich.
- Die Detailseite liest `type`, `id` und `global_id` aus der URL und laedt nur
  den konkreten Datensatz gezielt nach.
- Es werden keine Vollabfragen und keine Qualitaets-Server-Scans beim Oeffnen
  der Detailseite gestartet.
- Die Qualitaetsbewertung nutzt `evaluateQualityForItem()` und die bestehenden
  `qualityCriteria`.
- Die Anzeige ist ueber ein Detail-ViewModel aufgebaut: Identitaet,
  Qualitaet, Nutzbarkeit, Texte, Medien, Oeffnungszeiten, OePNV, Detailinfos
  und Kriterienliste.
- Beschreibungstexte aus HTML werden als bereinigter Plaintext angezeigt.
- Mediengalerie nutzt nur pruefbare Bilder aus `media_objects`; Bildrechte,
  fehlende Urheberangaben und fehlende Alt-Texte werden kompakt
  zusammengefasst.
- ET4-Pages-Link wird nur fuer verifizierte POI-Logik mit `global_id`
  erzeugt.
- Outdooractive- und Google-Places-IDs werden als IDs angezeigt, aber ohne
  geratenen Link.
- Vollstaendige Rohdaten werden nicht als UI-Viewer angezeigt.
- Datensatzlisten aus Pflegeaufgaben koennen nun ebenfalls zur Detailseite
  fuehren.

Bewusste Einschraenkungen:

- Vorheriger/Naechster bleibt deaktiviert, bis spaeter ein leichter
  Listen-Kontext ohne grosse Rohdatenspeicherung definiert ist.
- Aktionen-Menue ist noch nicht ausgebaut; Link kopieren und ID-Kopieren sind
  vorhanden.
- Browser-Sichtpruefung gegen das Mockup konnte in dieser Umgebung weiterhin
  nicht automatisiert werden.

Pruefung:

- `git diff --check` ohne Fehler.
- Keine Mockdaten oder erfundenen Detailwerte in der Detailseite.

## Umsetzung: Logo, Pflegesystem und echter Count-Pfad

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Umgesetzte Anpassungen:

- Das im Repository vorhandene `SaTourN-RGB.png` ist als Markenlogo in der
  Statistik-Shell eingebunden.
- Die Pflegesystem-Erkennung basiert nicht mehr auf Datentyp-Vermutungen,
  sondern auf `keywords_old` und `keywords`.
- `import_source_feratel` oder `HasSystemId_Feratel` kennzeichnen `feratel`.
- `import_source_outdooractive` kennzeichnet `outdooractive`.
- Ohne externen Import-Hinweis wird der Datensatz als `SaTourN` behandelt.
- `import_sourceid_*` wird als externe Source-ID aus den Keywords gelesen und
  fuer CSV-Export sowie Kopieraktionen verwendet.
- Die Datensatz-Detailseite zeigt das erkannte Pflegesystem in den
  Detailinformationen.
- Die Pflegeaufgaben-Karte fuer externe Systeme aggregiert nun nach echtem
  Pflegesystem und zeigt die Anzahl betroffener Datensaetze.
- `/api/quality/count` wurde als neuer Render-Proxy-Endpunkt vorbereitet. Er
  nutzt nur verifizierte API-Pushdown-Kriterien und liefert `overallcount`,
  ohne Datensatz-Stichproben zu laden.
- Der Count-Endpunkt cached Ergebnisse fuer kurze Zeit serverseitig, damit
  wiederholte UI-Abfragen Render und Destination.One weniger belasten.

Bewusste Einschraenkungen:

- Die Startseite und Pflegeaufgaben-Uebersicht verwenden aktuell noch ihre
  bestehenden Stichprobenpfade; die UI-Umstellung auf `/api/quality/count` ist
  der naechste Schritt.
- Nicht verifizierte Kriterien wie `image_author_missing` bleiben serverseitige
  Scans und duerfen nicht als vollstaendige API-Pushdown-Zahlen angezeigt
  werden.

Pruefung:

- PowerShell-Auswertung der lokalen Fixtures bestaetigt vorhandene
  `feratel`- und `outdooractive`-Faelle.
- `git diff --check` ohne Fehler; nur Windows-CRLF-Hinweise.

## Umsetzung: Weg von Browser-Stichproben

Status: umgesetzt am 2026-06-04, technische Abschlusspruefung lokal erfolgt.

Umgesetzte Anpassungen:

- Startseite und Pflegeaufgaben laden keine Browser-Stichproben mehr fuer
  Qualitaetszahlen.
- Pflegeaufgaben werden aus `/api/quality/count` aufgebaut, sofern
  Kriterium/Typ per API-Pushdown verifiziert sind.
- Die wichtigsten Pflegeaufgaben auf der Startseite verwenden dieselbe
  Count-Summary wie die Pflegeaufgaben-Seite.
- Qualitaetsstatus und Qualitaets-Score werden ohne vollstaendige
  Einzelbewertung nicht mehr als absolute Werte geschaetzt.
- Die Datensatz-Hauptseite laedt initial keine Browser-Stichprobe mehr.
- Konkrete Fehlerlisten werden ueber `/api/quality/scan` geladen, mit den
  maximal vorgesehenen Request-Budgets des Proxys.
- Schnellfilter wie `Ohne Lizenz` laden nun echte Fehlerlisten statt lokal auf
  einer Stichprobe zu filtern.
- Die UI-Texte unterscheiden jetzt zwischen API-Count, API-/Server-Scan und
  nicht berechenbaren Gesamtstatuswerten.

Bewusste Einschraenkungen:

- `image_author_missing` ist weiterhin kein verifizierter API-Pushdown und
  bleibt ein Server-Scan-Thema.
- `/api/quality/scan` liefert echte Datensaetze, bleibt aber budgetiert. Fuer
  vollstaendige Exporte sehr grosser Fehlerlisten ist spaeter Pagination oder
  ein Job-/Batch-Endpunkt sinnvoll.
- Schnelle Gesamtzahlen fuer Qualitaetsstatus `gut`, `pruefen`, `kritisch`
  sind ohne vollstaendige Einzelbewertung nicht belastbar und bleiben daher
  leer statt geschaetzt.

Pruefung:

- `rg` bestaetigt: `loadQualitySampleRows` wird nicht mehr verwendet und ist
  aus `Statistik/scripts.js` entfernt.
- `git diff --check` ohne Fehler; nur Windows-CRLF-Hinweise.
