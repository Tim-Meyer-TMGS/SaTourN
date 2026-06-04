# Datenqualitaets-Monitor - Entscheidungen

Stand: 2026-06-04

## Architektur

- Das Statistik-Frontend bleibt statisches HTML/CSS/JavaScript auf GitHub Pages.
- Node/Express bleibt Proxy fuer API-Key-geschuetzte Destination.One/eT4-Requests.
- Python wird nicht als GitHub-Pages-Laufzeit eingesetzt. Sinnvolle Python-Pfade
  sind GitHub-Actions-Snapshots, Vollscan-/Export-Jobs oder lokale Analyse.
- Bestehende Statistik-Aggregate und itembasierte Qualitaetsdaten bleiben
  getrennt.
- Punkt 1 des Arbeitsauftrags bestaetigt diese Architektur als verbindlichen
  Rahmen fuer die naechsten Abschnitte: erweitern und modularisieren, nicht
  ersetzen.
- Punkt 2 legt das Produktziel fest: weg vom weiter anwachsenden
  Single-Page-Panel-Dashboard, hin zu wenigen ruhigen Hauptbereichen und
  perspektivisch mehreren statischen HTML-Seiten.
- Bestehende `activePanel`-/`data-view-panel`-Logik bleibt Uebergang, soll aber
  nicht durch neue gleichrangige Hauptbereiche weiter aufgeblasen werden.
- Punkt 3 legt die Nutzerperspektive fest: Gebiet, Ort und Datentyp sind nicht
  nur Filter, sondern der Arbeitskontext eines Datenpflegers.
- Pflegeaufgaben und konkrete Datensaetze haben Prioritaet vor abstrakten
  Gesamtstatistiken.
- Punkt 4 legt das UI-Grundprinzip fest: weniger sichtbare Komplexitaet,
  ruhigere Priorisierung, Progressive Disclosure und technische Diagnosen nicht
  dauerhaft in der Startansicht.
- Punkt 5 legt die Zielnavigation fest: Uebersicht, Pflegeaufgaben,
  Datensaetze und Statistik sind Hauptbereiche; Matrix, Datentypvergleich,
  CSV, KI und Rohdaten sind kontextuelle Funktionen.
- Punkt 6 legt den Arbeitskontext fest: lokal gespeichert werden duerfen nur
  kleine UI-/Filterwerte fuer Gebiet, Ort und Datentyp. Vollstaendige
  API-Antworten, Fehlerlisten, Rohdaten, Secrets und KI-Kontexte werden nicht
  lokal persistiert.
- Punkt 7 legt API-Schonung als harte Produktregel fest: keine impliziten
  Vollabfragen, `/api/search` fuer Counts und begrenzte Samples,
  `/api/quality/scan` nur nach konkreter Pflegeaufgabe mit eindeutigem Typ und
  Kriterium.
- Punkt 8 legt fest, dass der bestehende Datenfluss fachlich erhalten bleibt:
  Filter synchronisieren, Counts/Samples laden, Items normalisieren,
  Aggregationen bauen, danach ansichtsspezifisch rendern.
- Punkt 9 legt die Seitenlogik fest: Uebersicht ruhig und kompakt,
  Pflegeaufgaben als Hauptarbeitsbereich, Datensaetze als schlanke Arbeitsliste
  mit Detailpanel, Statistik aggregiert und `overallcount`-orientiert.
- Punkt 10 legt Nutzbarkeit als fachliche Erklaerschicht fest: UI soll
  praktische Auswirkungen eines Mangels erklaeren und Score nicht als absolute
  Wahrheit darstellen.
- Punkt 11 bestaetigt die aktive Qualitaetslogik aus `Statistik/quality.js`.
  `geo_missing`, `touristtrip_incomplete` und `manual_image_quality` werden
  nicht automatisch aktiviert.
- Punkt 12 bestaetigt reale Feldmappings als verbindlich. Neue Feldannahmen,
  Typ-Erweiterungen oder API-Pushdowns brauchen dokumentierte Pruefung.
- Punkte 13 bis 17 legen die Tabellenregel fest: UI-Tabellen sind
  Entscheidungshilfen, keine Datenablage. Fehlerlisten werden auf
  Arbeitsspalten reduziert; technische Tiefe wandert in Detailpanel, Aktionen
  oder CSV.
- Punkte 18 bis 20 legen visuelle Ruhe fest: Loader komponentennah, technische
  Statusdetails in die Console, weniger Badges/Farben/Raender und kritische
  Farben nur fuer echte kritische Pflegebedarfe.
- Punkt 21 legt fest: automatische ET4-Pages-Links nur fuer verifizierte Typen.
  Aktuell ist nur POI verifiziert; andere Typen bleiben offen.
- Punkt 22 legt KI als optionale dezente Aktion fest, nicht als dominanten
  Hauptbereich.
- Punkt 23 legt fest: CSV darf technischer sein als die UI, muss aber Datenquelle
  und Sample-/Scan-Kontext klar machen.
- Punkte 24 und 25 legen die Migration fest: kleine pruefbare Schritte, zuerst
  UI-Audit, Fehlerlisten, Statusmeldungen, Loader, Arbeitskontext, Navigation.

## Datenbasis und Limits

- `/api/search` liefert schnelle Statistik-Counts und begrenzte Item-Samples.
- Browser-Schutz: `SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY`,
  `SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS`, `qualityDataMeta.truncated`.
- `/api/quality/scan` scannt ein konkretes Kriterium fuer einen konkreten Typ
  budgetiert und paginiert.
- Vollstaendigkeit darf nur behauptet werden, wenn Datenbasis und Scan-Budget das
  hergeben. Samples muessen als Samples behandelt werden.
- Grosse Fehlerlisten werden nicht automatisch im Browser gesammelt, sondern
  nur nach Nutzeraktion und konkretem Typ-/Kriteriumskontext geladen.

## Kriterien und Queries

- API-Pushdown nur fuer explizit verifizierte Kriterium-/Typ-Kombinationen.
- Nicht verifizierte Kriterien laufen als Server-Scan mit derselben
  `Statistik/quality.js`-Logik.
- Negative Queries duerfen nicht generisch erzeugt werden; Beispiel:
  Hotel-Buchungslink nutzt `*:* NOT booking:*`, nicht `*:* -booking:*`.
- `image_author_missing` bleibt Server-Scan, weil kein verifizierter API-Pushdown
  fuer fehlende `media_objects[].copyrightText` vorliegt.
- Der Qualitaets-Score ist Orientierung und Motivation. Pflegeaufgaben und
  Nutzbarkeit haben in Arbeitslisten Vorrang vor der Score-Zahl.
- Package-Buchungslink bleibt fuer API-Pushdown offen; Hotel ist verifiziert.

## UI und Tabellen

- Fehlerlisten-UI-Zielspalten: Titel, Typ, Ort/Gebiet, Problem, Naechster
  Schritt, Aktion. Kategorie, ID, Aktualisierung oder Qualitaetsstatus nur bei
  konkretem Nutzen.
- ID, `global_id`, Lizenz, Open-Data-Status, Score, Status, Pages-Link,
  Quell-URL, letzte Aktualisierung, vollstaendige Kriterienbewertung, Rohdaten
  und Debug-Informationen gehoeren ins Detailpanel oder in CSV.
- Informationen, die nur eine Handlung ermoeglichen, werden als Aktion gezeigt:
  oeffnen, kopieren, Details anzeigen.
- Erfolgreiche technische Operationen brauchen nicht automatisch sichtbare
  Erfolgsmeldungen.

## Reale Feldmappings

- Lizenz: `attributes[].key = license` mit `CC0`, `CC-BY`, `CC-BY-SA`, `PD`.
- Beschreibung: `texts[].rel = details`, Teaser allein zaehlt nicht.
- Oeffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen`.
- Bild: pruefbare `media_objects[]`, nicht `booking`, `canonical`, `logo`,
  `socialmedia`.
- Bildurheber: pruefbare Medien ohne `copyrightText`.
- OePNV: `features[].value` oder `features_old[]` enthaelt
  `Mit OePNV erreichbar`.
- Hotel-Buchungslink: `media_objects[].rel = booking` mit nicht-leerer `url`.
- Gebiet/Kategorie: `areas[]`/`areas_old[]` und
  `categories[]`/`categories_old[]`.

## KI/n8n

- Das Frontend ruft one.intelligence nicht direkt mit Secrets auf.
- Browser sendet nur reduzierten Dashboard-Kontext an n8n.
- Keine kompletten Rohdaten, Bilddaten oder unnoetigen personenbezogenen Daten in
  den KI-Kontext.
- `buildAiContext()` begrenzt sichtbare Items standardmaessig auf 50 reduzierte
  Datensaetze.
- n8n muss Payload validieren, Kontextgroesse pruefen, CORS/Auth/Rate-Limit
  absichern und Antwort auf `{ answer, suggestions, warnings }` normalisieren.

## Umbau Statistik

- Die Startseite ist jetzt die fuehrende Einstiegssicht und ersetzt die alte
  dichte Panel-Startansicht fuer diesen Umbauabschnitt.
- `Pflegeaufgaben`, `Datensaetze` und `Statistik` sind echte HTML-Zielseiten,
  bleiben bis zu ihren eigenen Mockups aber bewusst API-freie Platzhalter.
- Nur `Statistik/index.html` laedt Uebersichtsdaten. Platzhalterseiten
  initialisieren ausschliesslich Header, Navigation und Arbeitskontext.
- Die Startseite verwendet fuer Summen `/api/search` mit `limit=1` und fuer
  Qualitaets-KPIs begrenzte Stichproben; `/api/quality/scan` bleibt fuer
  spaetere konkrete Pflegeaufgaben reserviert.
