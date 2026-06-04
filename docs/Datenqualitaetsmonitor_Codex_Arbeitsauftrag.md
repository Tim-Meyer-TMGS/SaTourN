# Codex-Script: SaTourN Datenqualitäts-Monitor weiterentwickeln

## 0. Rolle

Du bist Codex und arbeitest am SaTourN Datenqualitäts-Monitor im Bereich `Statistik/`.

Denke das Produkt nicht als reines Statistik-Dashboard, sondern als ruhige, handlungsorientierte Arbeitsoberfläche für Datenqualität.

Ziel ist nicht, möglichst viele Kennzahlen, Tabellen und technische Details gleichzeitig zu zeigen. Ziel ist, Nutzer dabei zu unterstützen, dauerhaft gute, nutzbare und pflegbare Daten zu haben.

Das Dashboard soll beantworten:

* Welche Daten sind nutzbar?
* Welche Daten sind Open-Data-fähig?
* Welche Daten sind kritisch?
* Wo liegen die wichtigsten Baustellen?
* Welche Pflegeaufgaben haben den größten Effekt?
* Welche konkreten Datensätze müssen bearbeitet werden?

Statistiken sind Einstieg und Orientierung. Die eigentliche Arbeit führt immer möglichst zur konkreten Pflegehandlung auf Datensatzebene.

---

## 1. Technischer Rahmen

Behalte die bestehende Architektur bei.

* Das Frontend bleibt statisches HTML/CSS/Vanilla-JavaScript auf GitHub Pages.
* Node/Express bleibt Proxy für API-Key-geschützte Destination.One/eT4-Requests.
* Keine neue Build-Kette einführen.
* Keine Secrets, API-Keys oder one.intelligence-Zugänge ins Frontend schreiben.
* Bestehende Statistik-Logik und Qualitätslogik getrennt halten.
* Bestehende Funktionen bevorzugt erweitern statt komplett neu bauen.
* Python nicht als GitHub-Pages-Laufzeit einsetzen.

Relevante Dateien:

* `Statistik/index.html`
* `Statistik/scripts.js`
* `Statistik/style.css`
* `Statistik/quality.js`
* `index.js`
* `routes/search.js`
* `routes/quality.js`
* `lib/search-utils.js`

Wichtige bestehende State-Struktur:

* `dashboardState`
* `window.satournDashboardState`
* `latestRows`
* `rawItemResponses`
* `allItems`
* `normalizedItems`
* `filteredItems`
* `activeFilters`
* `activeIssue`
* `activeIssueType`
* `activePanel`
* `qualityDataMeta`
* `serverIssueList`
* `activeDetailItem`
* `aiChat`

Diese Strukturen dürfen angepasst und modularisiert werden, sollen aber nicht unnötig ersetzt werden.

---

## 2. Produktziel

Das Ziel ist ein mehrseitiger, ruhiger Datenqualitäts-Monitor.

Das Dashboard soll nicht als eine überladene Single-Page-Anwendung mit vielen ein- und ausgeblendeten Panels weiterwachsen. Perspektivisch sollen mehrere statische HTML-Seiten entstehen, damit:

* die UI übersichtlicher wird,
* die Navigation echter und verständlicher wird,
* jede Seite nur die API-Anfragen ausführt, die sie wirklich braucht,
* Nutzer schneller zu ihrer konkreten Datenpflege kommen.

Das Zielbild ist Orientierung, keine pixelgenaue Vorlage.

Entscheidend ist:

* API-schonend,
* ruhig,
* gleichmäßig,
* handlungsorientiert,
* datensatznah,
* verständlich für Fachnutzer.

---

## 3. Zentrale Produktperspektive

Betrachte das Dashboard aus Sicht eines Datenanalysten oder Datenpflegers.

Ein Nutzer arbeitet häufig nicht für ganz Sachsen, sondern für eine bestimmte Destination, ein Gebiet, einen Ort oder bestimmte Datentypen.

Deshalb ist nicht jede Statistik für jeden Nutzer gleich relevant.

Die tägliche Arbeitsfrage lautet nicht:

„Wie viele Datensätze gibt es insgesamt?“

Sondern:

„Welche meiner Datensätze verhindern gerade gute Nutzung, Open Data, Ausspielung oder Weiterverarbeitung?“

Das Dashboard soll deshalb nicht primär Vollständigkeit als abstrakte Statistik zeigen, sondern Nutzbarkeit und Pflegebedarf erklären.

---

## 4. UI-Grundprinzip

Das UI soll ruhig, gleichmäßig und nicht überfordernd sein.

Vermeide:

* zu viele Hauptmenüpunkte,
* zu viele sichtbare Filter,
* zu viele KPIs auf einmal,
* zu viele Warnfarben,
* zu viele Tabellen gleichzeitig,
* technische Detailansichten auf der Startseite,
* große Einstellungsbereiche,
* auffällige Statusmeldungen für normale technische Vorgänge.

Nutze stattdessen:

* wenige Hauptbereiche,
* klare Überschriften,
* gleichmäßige Karten,
* konsistente Abstände,
* zurückhaltende Farben,
* deutliche, aber sparsame Handlungsaufforderungen,
* Progressive Disclosure.

Komplexität wird erst sichtbar, wenn der Nutzer sie braucht.

Leitsatz:

Nicht mehr anzeigen, sondern besser führen.

---

## 5. Navigation und Mehrseitenstruktur

Perspektivisch soll ein echtes Menü mit mehreren Seiten entstehen.

Reduziere die Hauptnavigation auf wenige ruhige Hauptbereiche:

1. Übersicht
2. Pflegeaufgaben
3. Datensätze
4. Statistik

Weitere Funktionen sollen nicht als gleichwertige Hauptmenüpunkte erscheinen, sondern kontextuell erreichbar sein:

* Kriterien-Matrix innerhalb von „Pflegeaufgaben“
* Datentyp-Vergleich innerhalb von „Pflegeaufgaben“ oder „Statistik“
* CSV-Export nur in Listenansichten
* KI-Analyse als dezente Aktion für die aktuelle Ansicht
* Detail- und Rohdatenansicht nur auf Datensatzebene
* Vergleichswerte innerhalb von „Statistik“

Mögliche Zielseiten:

* `index.html` oder `overview.html`
* `tasks.html`
* `records.html`
* `stats.html`

Optional später:

* `compare.html`
* `ai.html`

Bestehende Panel-Strukturen mit `data-view-panel`, `data-statistik-view` und `activePanel` dürfen als Übergang bestehen bleiben. Neue Arbeit soll aber nicht das bestehende Panel-System weiter aufblähen, sondern in Richtung echter Seitenarchitektur gehen.

---

## 6. Arbeitskontext statt Einstellungsflut

Nutzer sollen nicht mit einem großen Einstellungsmenü überfordert werden.

Stattdessen soll es einen einfachen lokalen Arbeitskontext geben.

Der Arbeitskontext speichert maximal:

* Gebiet / Destination
* optional Ort
* optional Datentyp

Dieser Kontext dient dazu:

* die Startansicht relevanter zu machen,
* API-Anfragen zu reduzieren,
* Nutzer nicht jedes Mal neu filtern zu lassen.

Beispielhafte Anzeige im Header:

„Arbeitskontext: Dresden Elbland · Alle Datentypen · Ändern“

Der Button „Ändern“ öffnet ein kleines ruhiges Panel oder Modal mit maximal drei Feldern:

* Gebiet
* Ort
* Datentyp

Keine weiteren Einstellungen in der ersten Ausbaustufe.

Speichere lokal nur kleine UI- und Filterwerte, zum Beispiel in `localStorage`.

Nicht lokal speichern:

* vollständige API-Antworten,
* große Fehlerlisten,
* Rohdaten,
* Secrets,
* KI-Kontexte,
* personenbezogene Daten.

Wenn kein Arbeitskontext vorhanden ist, zeige keinen komplexen Setup-Prozess. Zeige stattdessen eine ruhige Startansicht mit der Möglichkeit, den Arbeitskontext zu setzen.

---

## 7. API-schonende Grundregeln

Arbeite streng API-schonend.

Jede Seite lädt nur die Daten, die sie wirklich braucht.

Keine Seite soll automatisch alle Datenbereiche laden.

Grundregeln:

* `/api/search` dient für schnelle Statistik-Counts und begrenzte Item-Samples.
* Bestehende Statistik-KPIs, Charts, Ergebnisliste und Statistik-CSV bleiben auf Aggregatzeilen und `overallcount` basiert.
* Qualitäts-KPIs, Pflegebedarfe, Datentypen, Matrix, Fehlerlisten, Detailpanel, KI-Kontext und Fehlerlisten-CSV basieren auf normalisierten Items.
* Browser-Samples bleiben begrenzt.
* Große Listen werden nicht vollständig im Browser gesammelt.
* Fehlerlisten werden erst geladen, wenn Nutzer eine konkrete Pflegeaufgabe öffnen.
* `/api/quality/scan` nur verwenden, wenn Typ und Kriterium eindeutig sind.
* API-Pushdown nur für verifizierte Kriterium-/Typ-Kombinationen nutzen.
* Nicht verifizierte Kriterien als Server-Scan mit der bestehenden `Statistik/quality.js`-Logik behandeln.
* Keine generischen Negativqueries erzeugen.
* Vollständigkeit nur behaupten, wenn Datenbasis und Scan-Budget das hergeben.
* Stichproben immer transparent als Stichproben kennzeichnen.

Wichtige bestehende Limits beachten:

* `SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY`
* `SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS`
* `qualityDataMeta.truncated`

---

## 8. Datenfluss beibehalten und sinnvoll modularisieren

Bestehender Datenfluss:

1. Nutzer setzt Filter oder Arbeitskontext.
2. Aktive Filter werden synchronisiert.
3. Statistik-Requests liefern Counts und begrenzte Item-Samples.
4. `refreshNormalizedItems()` normalisiert und bewertet Items.
5. `refreshFilteredItems()` baut Basislisten und `qualityAggregations`.
6. Render-Funktionen aktualisieren die jeweilige Ansicht.
7. Klick auf Pflegebedarf, Datentyp oder Matrixzeile setzt `activeIssue`.
8. Bei eindeutigem Typ und Kriterium nutzt die Fehlerliste `/api/quality/scan`.
9. CSV exportiert entweder Statistik-Aggregate oder die aktive Fehlerliste.
10. Detailpanel und KI-Kontext nutzen reduzierte, gefilterte Daten.

Dieser Ablauf ist fachlich richtig. Er soll in Richtung Mehrseitenstruktur modularisiert werden, ohne unnötige Funktionalität zu brechen.

---

## 9. Seitenlogik

### 9.1 Übersicht

Die Übersicht ist die ruhige Startseite.

Sie zeigt nicht alles, sondern nur die wichtigste Lage für den aktuellen Arbeitskontext.

Inhalte:

* Qualitäts-Score
* gute Datensätze
* Datensätze mit Pflegebedarf
* kritische Datensätze
* wichtigste Pflegeaufgaben
* dezente Open-Data-Kennzahl
* klare nächste Aktionen

Beispielhafte Aktionen:

* „Pflegeaufgaben ansehen“
* „Datensätze prüfen“
* „Statistik öffnen“

Die Übersicht darf kompakte KPIs und kleine Samples nutzen, aber keine großen Fehlerlisten und keine unnötigen Voll-Scans laden.

Nicht auf der Übersicht zeigen:

* Rohdaten
* lange Tabellen
* technische Fehlermeldungen
* komplette Kriterien-Matrix
* alle Filter gleichzeitig
* mehrere konkurrierende Diagramme

---

### 9.2 Pflegeaufgaben

Diese Seite ist der wichtigste Arbeitsbereich.

Sie zeigt nicht primär technische Kriterien, sondern verständliche Aufgaben.

Beispiele:

* Lizenzangabe ergänzen
* Beschreibung ergänzen
* Bild ergänzen
* Bildurheber ergänzen
* Öffnungszeiten ergänzen
* Buchungslink ergänzen
* ÖPNV-Anreise ergänzen

Jede Aufgabe soll zeigen:

* Pflegeaufgabe
* Anzahl betroffener Datensätze
* Priorität
* betroffene Typen
* praktische Bedeutung
* empfohlene Aktion

Jede Aufgabe muss klickbar sein und zu einer konkreten Fehlerliste führen.

Die Pflegeaufgaben-Übersicht soll keine Datensatzdetails zeigen.

Nicht sichtbar in der Aufgabenübersicht:

* IDs
* einzelne URLs
* einzelne Lizenzwerte
* Rohdaten
* Score je Datensatz
* Detailstatus je Datensatz

Ziel: Nutzer entscheidet, welche Aufgabe er öffnet.

---

### 9.3 Datensätze

Diese Seite ist die Arbeitsliste auf Datensatzebene.

Sie zeigt konkrete Datensätze, nicht nur Aggregate.

Die Standardtabelle soll schlank sein.

Empfohlene Standardspalten:

* Titel
* Typ
* Ort / Gebiet
* Qualitätsstatus
* wichtigste Baustelle
* Nutzbarkeit
* Aktion

Optionale Informationen gehören ins Detailpanel oder hinter „Mehr Details“:

* ID
* global_id
* konkrete Lizenz
* Qualitäts-Score
* Kategorie
* letzte Aktualisierung
* Link
* Rohdaten
* vollständige Kriterienbewertung

Funktionen:

* Suche
* Filter
* Sortierung
* Pagination
* CSV-Export
* Detailpanel
* optional Copy-Aktion für ID oder Link

Diese Seite darf gezielt `/api/quality/scan` nutzen, aber nur bei konkretem Typ und Kriterium.

---

### 9.4 Statistik

Diese Seite zeigt aggregierte Statistik.

Sie ist wichtig, aber nicht die tägliche Pflegeoberfläche.

Inhalte:

* SaTourN-Gesamtzahl
* Open-Data-Zahl
* Open-Data-Quote
* Typvergleich
* Gebiet-/Ortvergleich, falls passend
* Diagramme
* Export aggregierter Statistikdaten

Diese Seite soll primär `overallcount`-basierte Daten nutzen und keine unnötigen Qualitäts-Scans auslösen.

Keine Datensatzdetails in der Statistikseite anzeigen.

Nicht sichtbar:

* einzelne IDs
* einzelne Links
* einzelne Lizenzen
* Rohdaten

---

## 10. Nutzbarkeit statt nur Vollständigkeit

Das Dashboard soll Nutzbarkeit erklären.

Unterscheide fachlich zwischen:

* nutzbar
* eingeschränkt nutzbar
* nicht nutzbar
* nicht bewertbar

Beispiele:

* Ein Datensatz ohne Lizenz ist eventuell fachlich gepflegt, aber nicht Open-Data-fähig.
* Ein Datensatz ohne Beschreibung ist redaktionell schlecht nutzbar.
* Ein Bild ohne Urheberangabe ist rechtlich oder redaktionell problematisch.
* Ein POI ohne Öffnungszeiten ist für Gäste schlechter planbar.
* Ein Hotel ohne Buchungslink ist weniger konvertierend.
* Ein Datensatz ohne ÖPNV-Info ist für nachhaltige Ausspielung schwächer.

Das Dashboard soll nicht nur „fehlendes Feld“ sagen, sondern möglichst kurz erklären, was dieser Mangel praktisch bedeutet.

---

## 11. Qualitätslogik

Aktive Qualitätskriterien:

* `opening_hours_missing`: POI, Gastro; API-Pushdown verifiziert.
* `license_missing`: POI, Gastro, Tour, Hotel, Package; API-Pushdown verifiziert.
* `description_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
* `image_missing`: POI, Gastro, Tour; API-Pushdown verifiziert.
* `image_author_missing`: alle Typen mit prüfbaren Medien; Server-Scan.
* `public_transport_missing`: POI, Gastro, Tour, Hotel, Event; API-Pushdown verifiziert.
* `booking_link_missing`: Hotel per API-Pushdown verifiziert, Package offen und serverseitig zu prüfen.

Nicht als automatische Fehler aktivieren:

* `geo_missing`
* `touristtrip_incomplete`
* `manual_image_quality`

Score-Logik:

* 80 bis 100: gut
* 60 bis 79: prüfen
* 0 bis 59: kritisch
* nicht berechenbar: separat ausweisen

Der Qualitäts-Score ist Orientierung und Motivation, keine absolute Wahrheit.

Nicht prüfbare Kriterien separat ausweisen.

---

## 12. Reale Feldmappings

Nutze die bestehenden realen Feldmappings.

* Lizenz: `attributes[].key = license` mit `CC0`, `CC-BY`, `CC-BY-SA`, `PD`.
* Beschreibung: `texts[].rel = details`; Teaser allein zählt nicht.
* Öffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen`.
* Bild: prüfbare `media_objects[]`, nicht `booking`, `canonical`, `logo`, `socialmedia`.
* Bildurheber: prüfbare Medien ohne `copyrightText`.
* ÖPNV: `features[].value` oder `features_old[]` enthält `Mit ÖPNV erreichbar`.
* Hotel-Buchungslink: `media_objects[].rel = booking` mit nicht-leerer `url`.
* Gebiet/Kategorie: `areas[]` / `areas_old[]` und `categories[]` / `categories_old[]`.

Keine neuen Feldannahmen ohne Prüfung einbauen.

---

## 13. Tabellen verschlanken

Tabellen müssen deutlich leichter werden.

Grundregel:

Jede Tabelle bekommt einen klaren Zweck.

Vor jeder Tabellenspalte prüfen:

* Hilft diese Spalte bei der aktuellen Entscheidung?
* Muss der Nutzer diese Information sofort sehen?
* Oder reicht sie im Detailpanel?
* Ist die Information bereits durch eine andere Spalte abgedeckt?
* Ist sie nur technisch interessant?

Wenn eine Spalte nicht direkt zur nächsten Handlung beiträgt, soll sie entfernt oder ins Detailpanel verschoben werden.

Tabellen sollen nicht als Datenablage funktionieren, sondern als Entscheidungshilfe.

---

## 14. Doppelte Bedeutungen entfernen

Vermeide Spalten, die fachlich das Gleiche oder fast das Gleiche ausdrücken.

Beispiel Lizenz / Open Data:

Nicht gleichzeitig anzeigen:

* Open-Data
* Lizenz
* Lizenzstatus
* Lizenz fehlt

Besser je nach Kontext:

### In Pflegeaufgaben

Wenn die Aufgabe „Lizenzangabe fehlt“ ist, reicht:

* Titel
* Typ
* Ort / Gebiet
* empfohlene Aktion
* Aktion

Die Spalte „Lizenz“ ist dort überflüssig, weil alle Einträge genau wegen fehlender Lizenz in der Liste stehen.

### In allgemeinen Datensatzlisten

Eine kompakte Spalte reicht:

* „Nutzbarkeit“

Mögliche Werte:

* Open Data
* Lizenz fehlt
* eingeschränkt
* nicht bewertbar

Die konkrete Lizenz gehört ins Detailpanel.

### In Statistikansichten

Nur aggregiert anzeigen:

* Open-Data-fähig
* nicht Open-Data-fähig
* nicht bewertbar

Keine Einzelspalten für Lizenzdetails.

---

## 15. Fehlerlisten verschlanken

Wenn eine konkrete Pflegeaufgabe geöffnet ist, soll die Liste schlank sein.

Standardspalten:

* Titel
* Typ
* Ort / Gebiet
* Kategorie, falls für die Aufgabe relevant
* Problem
* Nächster Schritt
* Aktion

Optional, nur wenn wirklich hilfreich:

* ID
* letzte Aktualisierung
* Qualitätsstatus

Nicht standardmäßig anzeigen:

* Open-Data-Status, wenn die Aufgabe bereits Open-Data-bezogen ist
* Lizenzwert, wenn die Aufgabe „Lizenz fehlt“ ist
* Qualitäts-Score, wenn die Liste bereits nach einem konkreten Fehler gefiltert ist
* global_id als eigene Spalte
* lange URLs
* Rohdaten
* technische Fehlercodes

IDs, global_id, URL und Rohdaten gehören ins Detailpanel oder in eine Kopieraktion.

---

## 16. Detailpanel als Entlastung nutzen

Informationen, die selten gebraucht werden, sollen nicht in Tabellen stehen.

Ins Detailpanel verschieben:

* ID
* global_id
* konkrete Lizenz
* Open-Data-Status
* Qualitäts-Score
* Qualitätsstatus
* Pages-Link
* Quell-URL
* letzte Aktualisierung
* vollständige Kriterienbewertung
* Rohdaten-Auszug
* Debug-Informationen

Die Tabelle zeigt nur die Arbeitsliste. Das Detailpanel zeigt die Tiefe.

---

## 17. Aktionen statt Spalten

Wenn eine Information nur gebraucht wird, um etwas zu tun, soll sie als Aktion erscheinen, nicht als eigene Spalte.

Beispiele:

Statt Spalte „global_id“:

* Button „ID kopieren“

Statt Spalte „Link / URL“:

* Button „Öffnen“
* Button „Link kopieren“

Statt Spalte „Rohdaten“:

* Button „Details“

Statt mehrere Statusspalten:

* eine kompakte Spalte „Nächster Schritt“

---

## 18. Ladezustände ins UI integrieren

Ladebalken und Ladezustände sollen ruhig in die jeweilige Komponente integriert werden.

Nicht als dominantes globales Element, wenn nur eine Tabelle oder Karte lädt.

Beispiele:

* In einer Tabelle: schmale Ladezeile oberhalb oder innerhalb der Tabelle
* In einer Karte: dezenter Skeleton- oder Inline-Status
* In der Übersicht: ruhige Meldung „Daten werden geladen …“
* Bei Pagination: nur der Listenbereich zeigt Ladezustand

Vermeide mehrere konkurrierende Ladeanzeigen gleichzeitig.

Der Ladezustand soll erklären, was gerade geladen wird:

* „Pflegeaufgaben werden geladen …“
* „Fehlerliste wird geladen …“
* „Statistik wird aktualisiert …“

Nicht verwenden:

* große globale Ladeelemente für kleine Teilbereiche
* mehrere parallele Loader
* generische Meldungen wie „Loading“
* technische Fortschrittsdetails, wenn sie nicht nötig sind

---

## 19. Statusmeldungen aus dem UI reduzieren

Technische Statusmeldungen sollen nicht dauerhaft im UI stehen.

In die Browser-Console verschieben:

* technische API-Fehlerdetails
* vollständige URLs
* Stacktraces
* Debug-Ausgaben
* Diagnoseinformationen
* detaillierte Request-/Response-Hinweise
* interne Statuswechsel
* erfolgreiche technische Operationen

Im UI bleiben nur nutzerrelevante Meldungen.

Gute UI-Meldungen:

* „Für diese Auswahl wurden keine Datensätze gefunden.“
* „Die Fehlerliste konnte nicht geladen werden. Bitte später erneut versuchen.“
* „Die Datenbasis ist eine begrenzte Stichprobe.“
* „Für diese Aufgabe ist ein konkreter Datentyp erforderlich.“

Nicht im UI anzeigen:

* HTTP-Status mit technischer URL
* JSON-Parse-Preview
* interne Query-Details
* Debug-Warnings
* technische Erfolgsmeldungen wie „Request abgeschlossen“

Erfolgsmeldungen im UI sparsam verwenden.

Nicht jede erfolgreiche Anfrage braucht eine sichtbare Meldung.

Besser:

* Daten erscheinen aktualisiert.
* Zeitstempel wird dezent aktualisiert.
* Ladezustand verschwindet.
* Keine zusätzliche grüne Erfolgsmeldung nötig.

Fehlermeldungen:

* kurz
* verständlich
* ohne technische Details
* mit möglicher nächster Handlung

Technische Details dazu per `console.warn()` oder `console.error()`.

---

## 20. Visuelle Entlastung

Reduziere visuelle Schwere.

* Weniger Tabellenränder.
* Weniger Badges.
* Weniger farbige Statuslabels.
* Keine Warnfarbe für mittlere oder normale Hinweise.
* Kritische Farben nur für echte kritische Pflegebedarfe.
* Zahlen rechtsbündig nur in Statistik-/Aggregattabellen.
* Texttabellen linksbündig und gut lesbar.
* Lange Inhalte umbrechen oder ins Detailpanel verschieben.
* Tabellen nicht breiter machen als nötig.
* Keine technischen IDs als prominente Hauptinformation.

---

## 21. ET4-Pages-Links

Automatische ET4-Pages-Links nur für verifizierte Typen erzeugen.

Aktuell verifiziert:

* POI:
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`

Hotel, Gastro, Event, Package und Tour folgen der gleichen Logik wie POI. Der ET4-Pages-Link wird aus dem jeweiligen Typsegment und der `global_id` gebildet, zum Beispiel `/Hotel/{global_id}/x`, `/Gastro/{global_id}/x`, `/Event/{global_id}/x`, `/Package/{global_id}/x` oder `/Tour/{global_id}/x`.

Items ohne `global_id` dürfen keinen geratenen Pages-Link erhalten.

Wenn Links in Tabellen gebraucht werden, nicht als lange URL-Spalte anzeigen. Stattdessen:

* „Öffnen“
* „Link kopieren“

---

## 22. KI/n8n

KI-Analyse bleibt optional und dezent.

* KI-Analyse läuft über n8n.
* one.intelligence-Keys gehören nicht ins Frontend.
* Browser sendet nur reduzierten Dashboard-Kontext.
* Keine kompletten Rohdaten senden.
* Keine Bilddaten senden.
* Keine unnötigen personenbezogenen Daten senden.
* `buildAiContext()` begrenzt sichtbare Items standardmäßig auf 50 reduzierte Datensätze.
* KI-Antworten müssen transparent sein, besonders wenn nur Samples oder begrenzte Scans vorliegen.

KI soll nicht als Hauptnavigation dominieren. Sie kann als dezente Aktion für die aktuelle Ansicht erscheinen, zum Beispiel:

„Analyse dieser Ansicht“

---

## 23. CSV-Export

CSV-Export soll zur jeweiligen Ansicht passen.

* Statistikseite: Export aggregierter Statistikdaten.
* Pflegeaufgaben / Datensätze: Export der aktuellen Fehlerliste.
* Fehlerlisten-CSV soll perspektivisch serverseitige Treffer berücksichtigen, nicht nur Browser-Samples.

Wenn nur Samples exportiert werden, muss das im UI und im Exportkontext klar erkennbar sein.

CSV darf mehr technische Informationen enthalten als die UI-Tabelle, aber nur wenn sie für Weiterverarbeitung sinnvoll sind.

Die UI-Tabelle bleibt schlank.

---

## 24. Migration

Arbeite schrittweise.

Empfohlene Reihenfolge:

1. Bestehende Dateien und Datenfluss verstehen.
2. Hauptnavigation fachlich auf wenige Bereiche reduzieren.
3. Arbeitskontext lokal speichern und dezent im Header anzeigen.
4. Übersicht ruhiger und handlungsorientierter gestalten.
5. Tabellen und Fehlerlisten verschlanken.
6. Technische Statusmeldungen aus dem UI in die Console verschieben.
7. Ladezustände komponentennah integrieren.
8. Pflegeaufgaben als zentrale Arbeitsseite stärken.
9. Datensatzlisten klarer und paginiert ausbauen.
10. Statistikseite von Qualitäts- und Pflegeansichten trennen.
11. Gemeinsame JS-Helfer auslagern, wenn dadurch Mehrseitenstruktur einfacher wird.
12. Echte HTML-Seiten schrittweise einführen.
13. Nicht mehr benötigte Panel-Komplexität reduzieren.

Bestehende Funktionalität darf während der Migration nicht unnötig gebrochen werden.

---

## 25. Konkrete erste Umsetzungsschritte

Beginne nicht mit einer kompletten Neuentwicklung.

Starte mit kleinen, überprüfbaren Änderungen:

### Schritt 1: UI auditieren

Prüfe bestehende Tabellen, Statusmeldungen und Loader.

Identifiziere:

* doppelte Spalten,
* zu technische Spalten,
* überflüssige Statusmeldungen,
* dominante Ladeelemente,
* zu viele sichtbare Panels oder Menüeinträge.

### Schritt 2: Tabellen verschlanken

Reduziere zuerst die Fehlerlisten.

Ziel-Standardspalten:

* Titel
* Typ
* Ort / Gebiet
* Problem
* Nächster Schritt
* Aktion

Verschiebe technische Felder ins Detailpanel.

### Schritt 3: Statusmeldungen umbauen

Technische Details aus dem UI entfernen.

* technische Fehler in `console.error`
* technische Warnungen in `console.warn`
* Debug-Infos in `console.debug`
* UI nur mit kurzen nutzerrelevanten Meldungen

### Schritt 4: Loader integrieren

Globale Ladeanzeigen reduzieren.

Loader dort anzeigen, wo Daten geladen werden:

* Übersichtskarte
* Pflegeaufgabenliste
* Fehlerliste
* Statistikblock

### Schritt 5: Arbeitskontext vorbereiten

Einfachen lokalen Arbeitskontext einführen:

* Gebiet
* Ort
* Datentyp

Dezent im Header anzeigen.

Noch kein großes Einstellungsmenü bauen.

### Schritt 6: Navigation beruhigen

Hauptnavigation auf vier Bereiche ausrichten:

* Übersicht
* Pflegeaufgaben
* Datensätze
* Statistik

Andere Bereiche kontextuell zugänglich machen.

---

## 26. Tests und Checks

Standard:

* `git diff --check`

Wenn Node verfügbar ist:

* `npm run check`
* `npm run diagnose:quality-examples`

Wenn Node nicht verfügbar ist, dokumentiere, dass diese Checks nicht ausgeführt werden konnten.

Keine Änderungen abschließen, ohne kurz zu dokumentieren:

* was geändert wurde,
* welche API-Anfragen reduziert oder vermieden wurden,
* welche UI-Elemente entfernt oder verschoben wurden,
* welche Tests ausgeführt wurden.

---

## 27. Akzeptanzkriterien

Eine Umsetzung ist gut, wenn:

* das Dashboard weiterhin ohne Build-Schritt lädt,
* keine Secrets im Frontend stehen,
* bestehende Statistikfunktionen erhalten bleiben,
* die UI ruhiger und weniger überladen wirkt,
* die Hauptnavigation reduziert ist oder klar in diese Richtung migriert,
* der Nutzer einen einfachen Arbeitskontext setzen kann,
* jede Seite oder Ansicht nur notwendige Daten lädt,
* Pflegeaufgaben klar priorisiert werden,
* Klick auf eine Pflegeaufgabe zu konkreten Datensätzen führt,
* Fehlerlisten datensatzbasiert, paginiert und deutlich schlanker sind,
* Tabellen keine doppelten Bedeutungen mehr zeigen,
* Lizenz / Open Data / Lizenzstatus nicht redundant nebeneinander stehen,
* technische Statusmeldungen nicht mehr dauerhaft im UI sichtbar sind,
* Ladezustände dort erscheinen, wo tatsächlich geladen wird,
* erfolgreiche Requests nicht unnötig als UI-Meldung erscheinen,
* technische Details in der Console landen,
* Detailinformationen weiterhin erreichbar sind,
* Stichproben transparent gekennzeichnet sind,
* CSV-Exporte zur jeweiligen Ansicht passen,
* keine unnötigen Vollabfragen im Hintergrund laufen,
* Qualitätslogik aus `quality.js` wiederverwendet wird,
* `git diff --check` ohne Fehler läuft.

---

## 28. Nicht tun

Nicht:

* neues Framework einführen,
* Build-Kette einführen,
* Secrets ins Frontend schreiben,
* alle Daten beim Start laden,
* Vollständigkeit behaupten, wenn nur Samples vorliegen,
* nicht verifizierte ET4-Links raten,
* technische Fehlerdetails prominent im UI anzeigen,
* Tabellen als Rohdatenablage verwenden,
* jedes verfügbare Feld als Spalte anzeigen,
* Nutzer mit vielen Einstellungen überfordern,
* KI als dominanten Hauptbereich platzieren,
* bestehende Statistikaggregate in Datensatzvollständigkeit umdeuten.

---

## 29. Leitbild

Das Dashboard soll ruhig von der Übersicht zur konkreten Pflegehandlung führen.

Eine gute Ansicht zeigt nicht alles, was technisch verfügbar ist.

Eine gute Ansicht zeigt genau das, was der Nutzer in diesem Schritt braucht.
