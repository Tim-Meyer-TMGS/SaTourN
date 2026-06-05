# Datenqualitaets-Monitor - Aufgabenbeschreibungen

Stand: 2026-06-04

Diese Datei ist die operative Aufgabenliste. Sie integriert die Vorgaben ab
Punkt 25 aus `../Datenqualitaetsmonitor_Codex_Arbeitsauftrag.md`. Wir arbeiten
den Arbeitsauftrag danach abschnittsweise durch.

## Arbeitsregel fuer alle Aufgaben

- Keine komplette Neuentwicklung starten.
- Bestehende Statistikfunktionen erhalten.
- Keine neue Build-Kette und keine Secrets im Frontend.
- Jede Aenderung muss API-schonend sein und darf keine unnoetigen Vollabfragen
  ausloesen.
- Technische Details gehoeren in die Console, nicht dauerhaft in die UI.
- Detailinformationen muessen erreichbar bleiben, aber nicht als
  Standardspalten sichtbar sein.
- Samples und unvollstaendige Daten immer transparent kennzeichnen.

## Offene TODOs nach Arbeitsauftrag-Abschnitt

### Punkt 1: Technischer Rahmen

Aktuell keine blockierenden Architektur-TODOs.

Offen fuer spaetere Abschnitte:

- Bei jeder groesseren Modularisierung pruefen, ob sie ohne neue Build-Kette und
  ohne Framework-Einfuehrung bleibt.
- Wenn echte statische Mehrseitenstruktur entsteht, gemeinsame JS-Helfer nur
  auslagern, wenn dadurch weniger Dopplung und keine neue Build-Komplexitaet
  entsteht.
- Vor jedem neuen API-Pfad pruefen, ob er ueber den bestehenden Node/Express-
  Proxy laufen muss, damit keine Secrets ins Frontend wandern.
- Node-/npm-Checks erneut ausfuehren, sobald Node in der Umgebung verfuegbar ist.

### Punkt 2: Produktziel

Aktueller Befund:

- `Statistik/` ist noch eine Single-Page mit acht `activePanel`-Bereichen.
- Das Ziel ist eine ruhigere, perspektivisch mehrseitige Struktur.

Offen fuer spaetere Abschnitte:

- Zielnavigation auf wenige Hauptbereiche herunterbrechen:
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- Bestehende Bereiche `quality`, `issues`, `types`, `matrix`, `results`, `ai`
  fachlich auf diese Hauptbereiche verteilen.
- Keine neuen gleichwertigen Hauptpanels hinzufuegen.
- Pruefen, welche UI- und Datenladefunktionen spaeter pro statischer HTML-Seite
  isoliert werden koennen.
- API-Anfragen pro Zielseite definieren, damit keine Seite unnoetige Scans oder
  Vollabfragen ausloest.
- Zielbild als Orientierung nutzen, aber nicht pixelgenau nachbauen.

### Punkt 3: Zentrale Produktperspektive

Aktueller Befund:

- Gebiet, Ort, Typ und Kategorie sind technisch als Filter vorhanden.
- Die UI startet noch stark als Statistik-/Filteroberflaeche.
- Pflegeaufgaben sind vorhanden, aber noch nicht die klare taegliche
  Arbeitsfrage der Oberflaeche.

Offen fuer spaetere Abschnitte:

- Gebiet, Ort und Datentyp als dezenten Arbeitskontext sichtbar machen.
- Texte und View-Hierarchie auf die Frage ausrichten:
  `Welche meiner Datensaetze verhindern Nutzung, Open Data oder Ausspielung?`
- Uebersicht und Pflegeaufgaben so gewichten, dass konkrete Pflegehandlungen vor
  Gesamtstatistiken kommen.
- Statistikwerte weiterhin anbieten, aber als Orientierung und nicht als
  primaeren Arbeitsmodus.
- Filterlogik nicht neu bauen, sondern vorhandene `activeFilters` als
  Arbeitskontext weiterverwenden.
- Bei jeder neuen Ansicht pruefen, ob sie fuer Datenpfleger im aktuellen
  Gebiet/Ort/Datentyp hilfreich ist.

### Punkt 4: UI-Grundprinzip

Aktueller Befund:

- Die aktuelle Seite hat acht Hauptnavigationspunkte und eine sehr dichte
  Steuerflaeche.
- Filter, Sortierung, Qualitaetsfilter, Suche, Status, Loader, Fortschritt und
  Aktionen liegen im ersten Arbeitsbereich eng beieinander.
- Detail- und KI-Seitenpanel sind bereits passende Muster fuer Progressive
  Disclosure.

Offen fuer spaetere Abschnitte:

- UI-Audit konkretisieren: Welche sichtbaren Elemente bleiben im ersten
  Sichtbereich, welche wandern in Listen-, Detail- oder Kontextbereiche?
- Hauptnavigation und erste Steuerflaeche so reduzieren, dass Nutzer zuerst
  Arbeitskontext und naechste Pflegeaufgabe verstehen.
- KPI-Bloecke pro Ansicht priorisieren; nicht gleichzeitig alle Statistik- und
  Qualitaetskennzahlen sichtbar machen.
- Warnfarben und technische Statusmeldungen auf nutzerrelevante Faelle
  begrenzen.
- Globale Loader und Fortschrittsanzeigen gegen lokale Lade- und Empty-States
  pruefen.
- Rohdaten, Diagnose, Server-Scan-Details und KI-Kontext nur bei Bedarf zeigen
  oder in die Console bzw. Detailpanels verschieben.

### Punkt 5: Navigation und Mehrseitenstruktur

Aktueller Befund:

- `activePanel` steuert acht gleichrangige Views:
  `overview`, `stats`, `quality`, `issues`, `types`, `matrix`, `results`, `ai`.
- Das Zielbild fordert vier Hauptbereiche:
  Uebersicht, Pflegeaufgaben, Datensaetze, Statistik.
- KI und Detailansicht sind technisch schon als Seitenpanels vorhanden, aber KI
  erscheint weiterhin als Hauptnavigation.

Offen fuer spaetere Abschnitte:

- Bestehende Views fachlich auf vier Hauptbereiche mappen:
  `overview` -> Uebersicht,
  `quality`/`issues`/`matrix` -> Pflegeaufgaben,
  `results`/Detailpanel -> Datensaetze,
  `stats`/`types` -> Statistik oder Pflegeaufgaben je Kontext.
- KI-Analyse aus der Hauptnavigation nehmen und als dezente Aktion der
  aktuellen Ansicht behandeln.
- CSV-Export nur dort sichtbar machen, wo eine Liste oder Statistik tatsaechlich
  exportierbar ist.
- Kriterien-Matrix und Datentypvergleich als kontextuelle Einstiege behalten,
  nicht als gleichwertige Hauptpunkte.
- Keine neuen `data-view-panel`-Gruppen einfuehren, solange nicht klar ist, wie
  sie in die Zielseitenstruktur uebergehen.
- Spaeter pruefen, welche gemeinsamen JS-Helfer fuer `overview.html`,
  `tasks.html`, `records.html` und `stats.html` ausgelagert werden muessen.

### Punkt 6: Arbeitskontext statt Einstellungsflut

Aktueller Befund:

- Gebiet, Ort und Typ sind bereits technisch vorhanden und werden ueber
  `activeFilters` synchronisiert.
- Es gibt noch keine persistente, ruhige Header-Anzeige wie
  `Arbeitskontext: Dresden Elbland - Alle Datentypen - Aendern`.
- Lokale Speicherung fuer Arbeitskontext existiert noch nicht.

Offen fuer spaetere Abschnitte:

- Arbeitskontext fachlich auf Gebiet, optional Ort und optional Datentyp
  begrenzen.
- Kategorie, Suche, Qualitaetsstatus, Prioritaet, Pruefbarkeit und Kriterium als
  ansichtsspezifische Listenfilter trennen.
- Kleines Kontext-Panel oder Modal mit maximal drei Feldern entwerfen.
- `localStorage` nur fuer kleine Kontextwerte nutzen; keine API-Antworten,
  Fehlerlisten, Rohdaten, Secrets, KI-Kontexte oder personenbezogene Daten
  speichern.
- Beim Kontextwechsel `currentFilters()`, `syncActiveFilters()`,
  Pflegeaufgaben, Fehlerlisten, Statistik, CSV und KI-Kontext konsistent
  aktualisieren.
- Startzustand ohne Kontext ruhig halten und keinen komplexen Setup-Prozess
  erzwingen.

### Punkt 7: API-schonende Grundregeln

Aktueller Befund:

- `/api/search` liefert bereits `overallcount` und begrenzte Item-Samples.
- `QUALITY_ITEMS_PER_QUERY`, `QUALITY_ITEM_MAX_ITEMS` und
  `qualityDataMeta.truncated` begrenzen und kennzeichnen Browser-Samples.
- `/api/quality/scan` wird bereits fuer eindeutige Typ-/Kriteriumskontexte
  genutzt.

Offen fuer spaetere Abschnitte:

- Fuer jede Zielseite explizit festlegen, welche API-Anfragen sie ausloesen
  darf.
- Uebersicht und Statistik so umbauen, dass sie keine unnoetigen
  Qualitaets-Scans starten.
- Fehlerlisten erst nach konkretem Klick auf eine Pflegeaufgabe laden.
- Export-Hinweise verbessern: klar zwischen Aggregat, Browser-Stichprobe und
  Server-Scan unterscheiden.
- UI-Hinweis zu `qualityDataMeta.truncated` auch im CSV-/Fehlerlisten-Kontext
  sichtbar und ruhig formulieren.
- Keine generischen Negativqueries einfuehren; neue Pushdowns nur nach
  Verifikation dokumentieren.
- Bei Mehrseitenstruktur verhindern, dass gemeinsame Initialisierung alle
  bisherigen Datenbereiche pauschal laedt.

### Punkt 8: Datenfluss beibehalten und sinnvoll modularisieren

Aktueller Befund:

- Der bestehende Datenfluss ist fachlich korrekt und in `scripts.js` zentral
  umgesetzt.
- `currentFilters()`, `prepareRows()`, `runQueue()`,
  `refreshNormalizedItems()`, `refreshFilteredItems()` und
  `renderQualitySections()` bilden den Kernablauf.
- `Statistik/quality.js` ist bereits die zentrale Qualitaetslogik fuer Browser
  und Proxy.

Offen fuer spaetere Abschnitte:

- Modularisierungsgrenzen definieren: Datenladen, Filter/State,
  Qualitaetsaggregation, Statistikrendering, Aufgaben-/Listenrendering,
  Detailpanel, KI-Kontext.
- Gemeinsame Helfer nur auslagern, wenn dadurch spaetere Seiten weniger
  Dopplung und keine neue Build-Komplexitaet bekommen.
- Keine Query-, Normalisierungs- oder Kriterienlogik pro Seite kopieren.
- `renderQualitySections()` spaeter in ansichtsspezifische Renderpfade
  aufteilen, damit Zielseiten nur benoetigte Teile aktualisieren.
- Datenlimit-Informationen (`qualityDataMeta`) durch alle neuen Module
  durchreichen.

### Punkt 9: Seitenlogik

Aktueller Befund:

- `overview` zeigt derzeit mehrere Informationsarten gleichzeitig:
  Statistik-KPIs, Qualitaets-KPIs, Pflegebedarfe und Datentypen.
- Pflegeaufgaben sind als Issue Summary vorhanden, aber noch auf
  `quality`, `issues` und `matrix` verteilt.
- Die heutige Fehlerliste ist die naechste Datensatz-Arbeitsliste, aber noch zu
  breit und technisch.
- Statistikbereiche basieren bereits auf `latestRows` und `overallcount`.

Offen fuer spaetere Abschnitte:

- Uebersicht auf kompakte Lage, wichtigste Pflegeaufgaben, dezente Open-Data-
  Kennzahl und klare naechste Aktionen reduzieren.
- Pflegeaufgaben fachlich benennen und als primaeren Arbeitsbereich
  strukturieren.
- Pflegeaufgaben-Uebersicht ohne Datensatzdetails, IDs, URLs, Lizenzwerte,
  Rohdaten oder Einzel-Scores gestalten.
- Datensatzliste auf Standardspalten verschlanken:
  Titel, Typ, Ort/Gebiet, Qualitaetsstatus, wichtigste Baustelle, Nutzbarkeit,
  Aktion.
- Detailpanel als Ort fuer ID, `global_id`, Lizenz, Score, Kategorie,
  Aktualisierung, Link, Rohdaten und vollstaendige Kriterienbewertung nutzen.
- Statistikseite strikt aggregiert halten und keine Datensatzdetails anzeigen.
- Matrix und Datentypvergleich als kontextuelle Einstiege in Pflegeaufgaben oder
  Statistik einordnen.

### Punkt 10: Nutzbarkeit statt nur Vollstaendigkeit

Aktueller Befund:

- `qualityStatus` unterscheidet aktuell `gut`, `pruefen`, `kritisch` und
  `nicht berechenbar`.
- Kriterien enthalten bereits `recommendation`-Texte.
- Eine eigene Nutzbarkeitskennzeichnung mit `nutzbar`,
  `eingeschraenkt nutzbar`, `nicht nutzbar`, `nicht bewertbar` existiert noch
  nicht.

Offen fuer spaetere Abschnitte:

- Fachliche Nutzbarkeitslogik entwerfen, ohne sie mit `qualityScore` zu
  verwechseln.
- Pflegeaufgaben um kurze praktische Bedeutung ergaenzen, z. B. Open-Data,
  redaktionelle Nutzbarkeit, rechtliche/redaktionelle Risiken, Planbarkeit,
  Konversion oder nachhaltige Ausspielung.
- Datensatzlisten mit einer kompakten Nutzbarkeitsspalte planen.
- Lizenz/Open-Data/Nutzbarkeit so darstellen, dass keine redundanten Spalten
  entstehen.
- Bei Stichproben keine absolute Nutzbarkeitsaussage fuer die Gesamtmenge
  formulieren.

### Punkt 11: Qualitaetslogik

Aktueller Befund:

- `Statistik/quality.js` enthaelt genau die sieben aktiven Kriterien aus dem
  Arbeitsauftrag.
- Score-Schwellen sind umgesetzt:
  `>= 80` gut, `>= 60` pruefen, darunter kritisch, sonst nicht berechenbar.
- `geo_missing`, `touristtrip_incomplete` und `manual_image_quality` sind nicht
  aktiv.

Offen fuer spaetere Abschnitte:

- Score in UI und Tabellen als Orientierung behandeln, nicht als primare
  Entscheidungsspalte.
- Nicht automatisch pruefbare Kriterien separat darstellen, falls spaeter
  `autoCheck: false`-Kriterien ergaenzt werden.
- Package-Buchungslink ist als Server-Scan verifiziert; API-Pushdown bleibt
  nicht verifiziert und darf erst nach separater Query-Verifikation aktiviert
  werden.
- Hotel `image_missing` und `description_missing` fachlich entscheiden, bevor
  sie fuer Hotel aktiviert werden.
- Event-Beispieldaten beschaffen, bevor neue Event-spezifische Kriterien
  entstehen.
- Bei neuen Kriterien erst Typen, Felder, Gewicht, Prioritaet,
  Verifikationsstatus und API-Methode dokumentieren.

### Punkt 12: Reale Feldmappings

Aktueller Befund:

- Reale Feldchecks sind zentral in `Statistik/quality.js` umgesetzt.
- Die aktiven Kriterien nutzen verifizierte Mappings fuer Lizenz, Details,
  Openings, Medien, Copyright, OePNV, Booking, Gebiet und Kategorie.
- Einige Alias-Fallbacks existieren fuer Robustheit, ersetzen aber keine
  fachliche Verifikation.

Offen fuer spaetere Abschnitte:

- Keine neuen Feldannahmen aus generischen Aliasnamen ableiten.
- Neue Feldmappings erst mit Fixture, API-Beispiel oder dokumentierter
  Verifikation aufnehmen.
- Package-Buchungslink-Feldstruktur ist fuer Server-Scan verifiziert;
  API-Pushdown bleibt nicht verifiziert.
- Event-Fixture beschaffen und reale Felder pruefen.
- Bei jeder Erweiterung `Statistik/quality.js`, Proxy-Scan und Doku gemeinsam
  aktualisieren.
- Diagnose-Skript mit passenden Fixtures erweitern, sobald neue Mappings
  verifiziert werden.

### Punkt 13: Tabellen verschlanken

Aktueller Befund:

- Fehlerliste hat aktuell 15 UI-Spalten und wirkt wie Datenablage.
- Statistiktabelle ist aggregiert und darf zahlenorientiert bleiben.

Offen fuer spaetere Abschnitte:

- Jede Tabellenansicht mit Zweck und Entscheidung dokumentieren.
- Fehlerlisten-UI zuerst auf Arbeitsspalten reduzieren.
- Technische Spalten ins Detailpanel oder CSV verschieben.
- CSS nach Tabellenverschlankung vereinfachen und mobile Darstellung pruefen.

### Punkt 14: Doppelte Bedeutungen entfernen

Aktueller Befund:

- Fehlerliste zeigt gleichzeitig Kriterium, Open-Data, Lizenz, Score und
  Qualitaetsstatus.
- Bei konkreten Aufgaben sind einige dieser Spalten redundant.

Offen fuer spaetere Abschnitte:

- Lizenz/Open-Data/Lizenzstatus/Lizenz-fehlt nicht nebeneinander anzeigen.
- Pflegeaufgaben-Kontext nutzen, um Problemspalten zu vereinfachen.
- Allgemeine Datensatzlisten spaeter mit kompakter Nutzbarkeitsspalte planen.
- Statistikansichten nur aggregiert zu Open-Data-Faehigkeit zeigen.

### Punkt 15: Fehlerlisten verschlanken

Aktueller Befund:

- `renderIssueList()` rendert alle `ISSUE_LIST_COLUMNS`.
- Detailpanel ist bereits per Zeilenklick erreichbar.
- Pagination existiert.

Offen fuer spaetere Abschnitte:

- UI-Standardspalten setzen:
  Titel, Typ, Ort/Gebiet, Problem, Naechster Schritt, Aktion.
- Kategorie nur anzeigen, wenn sie fuer die Aufgabe relevant ist.
- ID, letzte Aktualisierung oder Qualitaetsstatus nur optional anzeigen.
- Score, Lizenzwert, Open-Data-Status, `global_id`, URL, Rohdaten und
  technische Codes aus der UI-Tabelle entfernen.
- Tastaturbedienung und Detailpanel-Oeffnung nach Spaltenumbau erhalten.

### Punkt 16: Detailpanel als Entlastung nutzen

Aktueller Befund:

- Detailpanel zeigt bereits Stammdaten, Open-Data, Lizenz, Score, Status, Links,
  Kriterien, Empfehlungen und Rohdaten.

Offen fuer spaetere Abschnitte:

- Sicherstellen, dass alle aus Tabellen entfernten Informationen im Detailpanel
  oder CSV erreichbar bleiben.
- Copy-Aktionen fuer ID, `global_id` und Links pruefen.
- Rohdaten weiter hinter explizitem `details`-Element halten.
- Debug-Informationen nicht prominenter machen als Pflegeinformationen.

### Punkt 17: Aktionen statt Spalten

Aktueller Befund:

- Zeilen sind klickbar und oeffnen Details.
- Link-/URL-Informationen sind noch als Tabellenspalte vorhanden.
- Copy-Aktionen existieren noch nicht.

Offen fuer spaetere Abschnitte:

- Aktion-Spalte fuer Details/Oeffnen/Kopieren entwerfen.
- Lange URL-Spalten entfernen.
- `ID kopieren`, `Link kopieren`, `Oeffnen` nur dort anzeigen, wo ein Wert
  vorhanden und verifiziert ist.
- Mehrere Statusspalten durch `Naechster Schritt` ersetzen.

### Punkt 18: Ladezustaende ins UI integrieren

Aktueller Befund:

- Globaler `loading-container` ist dominant.
- Fehlerliste hat bereits lokalen Ladezustand.
- Fortschritt zeigt technische Gesamtabfrage.

Offen fuer spaetere Abschnitte:

- Globale Ladeanzeige reduzieren oder nur fuer echte Gesamtladung verwenden.
- Lokale Ladezustaende fuer Uebersichtskarte, Pflegeaufgabenliste,
  Fehlerliste und Statistikblock umsetzen.
- Lade- und Empty-States klar trennen.
- Keine parallelen Loader fuer denselben Vorgang anzeigen.
- Ladezustand fachlich benennen, z. B. `Fehlerliste wird geladen ...`.

### Punkt 19: Statusmeldungen aus dem UI reduzieren

Aktueller Befund:

- `serverIssueDiagnosticText()` zeigt technische Scan-Details direkt in der UI.
- Fehlertexte koennen technische URLs, Status und Content-Previews enthalten.
- Mehrere erfolgreiche Aktionen setzen sichtbare Status-Pills.

Offen fuer spaetere Abschnitte:

- Technische Details in `console.warn()`, `console.error()` oder
  `console.debug()` verschieben.
- UI-Fehlertexte kurz und handlungsorientiert formulieren.
- Server-Scan-Diagnose in der UI auf Datenquelle, Stichprobe/Vollstaendigkeit
  und ggf. kurzen Hinweis reduzieren.
- Erfolgsmeldungen sparsamer einsetzen; aktualisierte Daten koennen als Feedback
  reichen.
- Keine HTTP-URL-, Query- oder JSON-Preview-Texte prominent anzeigen.

### Punkt 20: Visuelle Entlastung

Aktueller Befund:

- Tabellen- und Status-CSS ist funktional, aber auf viele Spalten und Labels
  ausgelegt.
- Einige Spalten werden per CSS schmal gehalten statt fachlich reduziert.

Offen fuer spaetere Abschnitte:

- Nach Spaltenreduktion Tabellen-CSS vereinfachen.
- Badges, Statusfarben und Warnfarben reduzieren.
- Kritische Farbe nur fuer echte kritische Pflegebedarfe nutzen.
- Lange Texte umbrechen oder ins Detailpanel verschieben.
- Technische IDs nicht als prominente Hauptinformation zeigen.

### Punkt 21: ET4-Pages-Links

Aktueller Befund:

- POI-Pages-Link ist verifiziert.
- Detailpanel zeigt ET4-Pages-Link mit POI-Hinweis.
- Andere Typen sind noch nicht verifiziert.

Offen fuer spaetere Abschnitte:

- Hotel-, Gastro-, Event-, Package- und Tour-Pages-Pfade mit echten
  `global_id`-Werten verifizieren.
- Erst danach automatische Links fuer weitere Typen erzeugen.
- Items ohne `global_id` nie mit geratenem Pages-Link versehen.
- Links in Tabellen nur als `Oeffnen`/`Link kopieren`-Aktionen zeigen.

### Punkt 22: KI/n8n

Aktueller Befund:

- KI laeuft ueber Seitenpanel und `buildAiContext()`.
- Kontext wird auf reduzierte Datensaetze begrenzt und enthaelt Datenlimits.
- KI ist trotzdem noch Hauptnavigationspunkt.

Offen fuer spaetere Abschnitte:

- KI aus der Hauptnavigation nehmen und als dezente Aktion der aktuellen Ansicht
  behandeln.
- Sicherstellen, dass keine Rohdaten, Bilddaten, Secrets oder unnoetigen
  personenbezogenen Daten an n8n gesendet werden.
- KI-Antworten und UI-Kontext bei Samples deutlich kennzeichnen.
- n8n produktiv absichern: CORS, Auth, Rate-Limit, Antwortformat.
- Mock-/Webhook-Status dezent halten und technische Details nicht prominent
  anzeigen.

### Punkt 23: CSV-Export

Aktueller Befund:

- Statistik-CSV und Fehlerlisten-CSV sind getrennt.
- Fehlerlisten-CSV enthaelt mehr technische Felder als die UI.
- Exportkontext unterscheidet noch nicht klar Browser-Sample vs. Server-Scan im
  CSV-Inhalt.

Offen fuer spaetere Abschnitte:

- UI-Tabelle schlank halten, CSV bewusst erweitert lassen.
- CSV-Metadaten oder Kopfzeilen fuer Datenquelle/Sample/Server-Scan pruefen.
- UI-Hinweis vor Export setzen, wenn nur Browser-Samples exportiert werden.
- Fehlerlisten-CSV perspektivisch an serverseitige Treffer oder Export-Job
  anbinden.
- Statistik-Export strikt aggregiert halten.

### Punkt 24: Migration

Aktueller Befund:

- Viele Zielbausteine existieren bereits, aber noch als dichte Single-Page.
- Eine komplette Neuentwicklung ist nicht erforderlich.

Offen fuer spaetere Abschnitte:

- Umsetzung in kleiner Reihenfolge beibehalten:
  Audit, Fehlerlisten, Status, Loader, Arbeitskontext, Navigation.
- Bestehende Statistikfunktionen nach jedem Schritt kurz pruefen.
- Panel-Komplexitaet erst reduzieren, wenn Zielbereiche funktional vorbereitet
  sind.
- Gemeinsame JS-Helfer erst auslagern, wenn Mehrseitenstruktur dadurch wirklich
  einfacher wird.

### Punkt 25: Konkrete erste Umsetzungsschritte

Aktueller Befund:

- Die operativen Aufgaben 1 bis 6 in dieser Datei decken die geforderte erste
  Umsetzung ab.
- Konkrete Code-Einstiege sind bekannt:
  `ISSUE_LIST_COLUMNS`, `renderIssueList()`, `serverIssueDiagnosticText()`,
  `loading-container`, `activePanel`, `activeFilters`.

Offen fuer naechste Codearbeit:

- Aufgabe 1 als konkretes UI-Audit abschliessen und Befund dokumentieren.
- Danach Aufgabe 2 umsetzen: Fehlerlisten-UI-Spalten reduzieren.
- Danach Aufgabe 3: technische Statusdetails aus der UI entfernen.
- Danach Aufgabe 4: Loader lokaler integrieren.
- Danach Aufgabe 5: Arbeitskontext vorbereiten.
- Danach Aufgabe 6: Navigation beruhigen.

## Aufgabe 1: UI auditieren

Ziel: Vor der Umgestaltung konkret erfassen, wo die aktuelle Statistikseite zu
laut oder zu technisch ist.

Umfang:

- Tabellen, Statusmeldungen, Loader, Panels und Menueintraege in
  `Statistik/index.html`, `Statistik/scripts.js` und `Statistik/style.css`
  pruefen.
- Doppelte Spalten, technische Spalten, ueberfluessige Statusmeldungen,
  dominante Ladeelemente und zu viele sichtbare Panels markieren.
- Ergebnis als kurze Audit-Notiz in dieser Datei oder in der Antwort zum
  Abschnitt dokumentieren.

Nachweis:

- Liste konkreter UI-Elemente, die verschlankt, verschoben oder behalten werden.
- Keine produktiven UI-Aenderungen ohne vorherige Audit-Entscheidung.

## Aufgabe 2: Fehlerlisten und Tabellen verschlanken

Ziel: Fehlerlisten werden datensatzbasiert, paginiert und deutlich schlanker.

Standardspalten fuer Fehlerlisten:

- Titel
- Typ
- Ort / Gebiet
- Problem
- Naechster Schritt
- Aktion

In das Detailpanel verschieben:

- ID und `global_id`
- konkrete Lizenzwerte
- Open-Data-Detailstatus, wenn redundant
- Qualitaets-Score
- Kategorie, wenn sie nicht fuer die Aufgabe relevant ist
- letzte Aktualisierung
- Link und Rohdaten
- vollstaendige Kriterienbewertung

Nachweis:

- Fehlerliste bleibt klickbar und oeffnet konkrete Datensaetze.
- CSV-Export passt zur verschlankten Ansicht oder exportiert bewusst erweiterte
  Felder mit klarer Zuordnung.

## Aufgabe 3: Statusmeldungen umbauen

Ziel: UI zeigt nur kurze nutzerrelevante Meldungen; technische Diagnose wandert
in die Console.

Regeln:

- Technische Fehler: `console.error`.
- Technische Warnungen: `console.warn`.
- Debug-Infos: `console.debug`.
- Erfolgreiche Requests nicht dauerhaft als UI-Meldung anzeigen.
- UI-Text kurz halten, z. B. `Daten konnten nicht geladen werden.` statt langer
  API-Diagnose.

Nachweis:

- Technische Scan-/Query-/HTTP-Details sind nicht mehr dominant sichtbar.
- Nutzbare Hinweise fuer Stichproben, leere Listen und nicht pruefbare Kriterien
  bleiben sichtbar.

## Aufgabe 4: Loader komponentennah integrieren

Ziel: Globale Ladeanzeigen reduzieren und Loader dort zeigen, wo gerade Daten
geladen werden.

Zielbereiche:

- Uebersichtskarte
- Pflegeaufgabenliste
- Fehlerliste
- Statistikblock

Regeln:

- Keine grosse, dauerhaft dominante Ladeanimation fuer kleine Teilrequests.
- Abbrechen/Progress nur dort sichtbar machen, wo es fuer Nutzer relevant ist.
- Leere Zustaende und Ladezustaende eindeutig trennen.

Nachweis:

- Jede Ansicht zeigt ihren Ladezustand lokal.
- Keine unnoetigen Layoutspruenge durch Loader.

## Aufgabe 5: Arbeitskontext vorbereiten

Ziel: Nutzer koennen einen einfachen lokalen Arbeitskontext setzen, ohne ein
grosses Einstellungsmenue bedienen zu muessen.

Minimaler Kontext:

- Gebiet
- Ort
- Datentyp

Regeln:

- Kontext dezent im Header anzeigen.
- Bestehende Filterlogik wiederverwenden.
- Noch kein grosses Einstellungsmenue bauen.
- Kontextwechsel darf aktive Listen und KI-Kontext sauber aktualisieren.

Nachweis:

- Aktiver Kontext ist sichtbar.
- Pflegeaufgaben, Datensaetze, Statistik und CSV beziehen sich auf denselben
  Kontext.

## Aufgabe 6: Navigation beruhigen

Ziel: Hauptnavigation in Richtung vier ruhige Bereiche migrieren.

Zielbereiche:

- Uebersicht
- Pflegeaufgaben
- Datensaetze
- Statistik

Kontextuell statt Hauptnavigation:

- Kriterien-Matrix
- Datentyp-Vergleich
- CSV-Export
- KI-Analyse
- Detail- und Rohdatenansicht

Nachweis:

- Hauptnavigation ist reduziert oder klar auf diese Richtung vorbereitet.
- Bestehende `data-view-panel`-/`activePanel`-Logik wird nicht weiter
  aufgeblasen, sondern dient nur als Uebergang.

## Aufgabe 7: Offene Fach- und API-Themen

- ET4-Pages-Pfade fuer Hotel, Gastro, Tour, Event und Package verifizieren,
  bevor weitere Typen automatisch verlinkt werden.
- Package-Buchungslink: Server-Scan ist verifiziert; nur eine moegliche
  API-Pushdown-Query bleibt offen.
- Hotel `image_missing` und `description_missing` fachlich entscheiden und mit
  `media:*` bzw. `details:*` testen.
- Event-Beispieldaten nachreichen, bevor Event-spezifische Kriterien entstehen.
- n8n-Webhook produktiv absichern: CORS, Auth, Rate-Limit, Antwortformat.
- Fehlerlisten-CSV perspektivisch an serverseitige Treffer anbinden.

## Checks

Immer:

```bash
git diff --check
```

Wenn Node verfuegbar ist:

```bash
npm run check
npm run diagnose:quality-examples
```

Wenn Node nicht verfuegbar ist, dokumentieren und JSON-Fixtures alternativ mit
PowerShell parsebar pruefen.

## Abschlusskriterien

Eine Abschnittsumsetzung ist erst fertig, wenn:

- Dashboard weiterhin ohne Build-Schritt laedt.
- bestehende Statistikfunktionen erhalten bleiben.
- UI ruhiger und weniger technisch wirkt.
- Hauptnavigation reduziert ist oder sichtbar in diese Richtung migriert.
- Pflegeaufgaben priorisiert und klickbar zu konkreten Datensaetzen fuehren.
- Fehlerlisten schlanker, paginiert und datensatzbasiert sind.
- Tabellen keine doppelten Bedeutungen mehr zeigen.
- technische Statusmeldungen nicht dauerhaft im UI stehen.
- Ladezustaende dort erscheinen, wo tatsaechlich geladen wird.
- Detailinformationen weiterhin erreichbar sind.
- `quality.js` als zentrale Qualitaetslogik wiederverwendet wird.
- `git diff --check` ohne Fehler laeuft.

## Umbau Statistik: offene Folgepunkte nach Startseite

- Startseite im Browser mit echten API-Daten visuell gegen
  `docs/Codex/Umbau_Statistik/Startseite.png` pruefen.
- Entscheiden, ob die Qualitaets-KPIs der Startseite dauerhaft als Stichprobe
  gekennzeichnet bleiben oder spaeter serverseitige Snapshot-Werte bekommen.
- Mockups fuer Datensatz-Hauptseite, Datensatzliste und Detailansichten
  nacheinander auf die vorbereiteten Zielseiten migrieren.
- Schnellzugriff `KI-Analyse` erst nach fachlicher Webhook-/Auth-Klaerung aktiv
  schalten.
- Browser-QA und Responsive-Abgleich nachholen, sobald eine lokale Server- oder
  Preview-Umgebung verfuegbar ist.

## Umbau Statistik: offene Folgepunkte nach Pflegeaufgaben

- Pflegeaufgaben-Seite im Browser mit echten API-Daten gegen
  `docs/Codex/Umbau_Statistik/Pflegeaufgaben.png` pruefen.
- Verhalten von `/api/quality/scan` fuer weitere grosse Fehlerlisten und
  Pagination-Szenarien mit echten Daten validieren; `image_author_missing` und
  `booking_link_missing` sind als Server-Scan getestet.
- Pagination fuer Datensatzlisten erweitern, falls mehr als die aktuell
  geladenen 25 Treffer pro Aufgabe benoetigt werden.
- Datensatzliste in `records.html` mit den naechsten Mockups verbinden und
  Parameteruebergabe von Pflegeaufgaben vorbereiten.
- Primaersystem-Erkennung mit echten Feldern validieren, insbesondere
  Outdooractive-Source-ID und Feratel-Hotel-Zuordnung.

## Umbau Statistik: offene Folgepunkte nach Datensaetze-Hauptseite

- Datensaetze-Hauptseite im Browser mit echten API-Daten gegen
  `docs/Codex/Umbau_Statistik/Datensatz-Haupseite.png` pruefen.
- Gezielte ID-Suche mit realen Beispielen testen, insbesondere numerische ID
  und `global_id`.
- Ruecksprung von Detailseite zur aktuellen Liste spaeter ohne grosse
  Rohdaten-Speicherung vorbereiten.
- Parameteruebergabe von Pflegeaufgaben zur Datensaetze-Hauptseite spaeter
  verbinden, ohne automatische Vollscans auszulösen.
- Optionales Spaltenmenue und Rasteransicht erst erweitern, wenn fachlich
  benoetigt.

## Umbau Statistik: offene Folgepunkte nach Datensatz-Detailseite

- Datensatz-Detailseite im Browser mit echten API-Daten gegen
  `docs/Codex/Umbau_Statistik/Detailansicht datensatz.png` pruefen.
- Detailseite mit `testdata/quality-examples/poi.json` fachlich gegen
  Beschreibung, Medien, Bildrechte und Oeffnungszeiten validieren.
- Vorheriger/Naechster erst umsetzen, wenn ein kleiner Listen-Kontext ohne
  Rohdaten-Speicherung definiert ist.
- Optionales Aktionen-Menue fuer ID kopieren, `global_id` kopieren und
  CSV-Zeile exportieren spaeter ausbauen.
- Medien-Detailansicht fuer einzelne Bilder spaeter ergaenzen, falls fuer
  Bildrechte-Pflege benoetigt.

## Umbau Statistik: offene Folgepunkte nach Logo/Pflegesystem/Count-Pfad

- Fuer nicht verifizierte Kriterien im UI klar zwischen vollstaendiger
  API-Zahl, budgetiertem Server-Scan und Browser-Stichprobe unterscheiden.
- `/api/quality/count` mit echten Render-Daten pro Region, Typ und Kriterium
  pruefen.
- Optional einen Batch-Endpunkt fuer mehrere Count-Jobs ergaenzen, falls die UI
  sonst zu viele Einzelrequests ausloest.

## Umbau Statistik: offene Folgepunkte nach Wegfall Browser-Stichproben

- `/api/quality/scan` fuer grosse Fehlerlisten paginierbar in der UI machen,
  damit mehr als die aktuell geladenen Proxy-Maximalergebnisse bearbeitbar
  sind.
- Fuer sehr grosse Exporte einen Batch-/Job-Endpunkt pruefen, damit CSV-Dateien
  nicht an Browser- oder Request-Limits haengen.
- Qualitaetsstatus-Gesamtzahlen nach dem ersten vollstaendigen Nacht-Snapshot
  fachlich pruefen und nur bei `complete=true` als belastbar behandeln.
- `image_author_missing` ist als Server-Scan verifiziert; API-Pushdown bleibt
  mangels belastbarer Destination.One-Query nicht verifiziert.

## Umbau Statistik: offene Folgepunkte nach Render Key Value und Nacht-Snapshot

- Render Key Value in Render anlegen und `REDIS_URL` sowohl im Webservice als
  auch im Cron Job setzen.
- Sicherstellen, dass der Cron Job nicht ohne `REDIS_URL` laeuft; Memory-
  Fallback ist nur fuer lokale Trockenlaeufe mit
  `QUALITY_SNAPSHOT_ALLOW_MEMORY=1` gedacht.
- Render Cron Job mit Command `npm run quality:snapshot` anlegen.
- Cron-Zeit festlegen: im Sommer fuer 22:00 Berlin `0 20 * * *` UTC, im Winter
  `0 21 * * *` UTC oder saisonal anpassen.
- Ersten Nachtlauf pruefen: Laufzeit, gescannte Datensaetze, `complete`,
  begrenzte Listen und Fehlermeldungen in den Render Logs kontrollieren.
- `QUALITY_SNAPSHOT_CONTEXTS` festlegen, wenn neben Sachsen gesonderte
  Regionen/Orte/Typen vorab gecached werden sollen.
- `QUALITY_SNAPSHOT_LIST_LIMIT` fachlich dimensionieren: genug Treffer fuer die
  Arbeit, aber keine unnoetig grossen Rohlisten im Cache.
- Nach erfolgreichem Cron-Lauf im Browser pruefen, ob Startseite,
  Pflegeaufgaben, Datensaetze und Open-Data-Statistik Cache-Hinweise anzeigen
  und bei Cache-Miss weiter live funktionieren.
