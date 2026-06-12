# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-12

Diese Datei ist die kurze Arbeitsliste fuer die naechsten Schritte.
Abgeschlossene Analysen, Mockup-Arbeiten und Pushdown-Nachweise stehen in den
verlinkten Detaildokumenten und werden hier nicht doppelt ausgeschrieben.

## Referenzen

- Projektstand:
  `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- Kriterienmatrix 2026-06-11:
  `docs/Codex/Datenqualitaetsmonitor_Kriterienmatrix_2026-06-11.md`
- API-Pruefliste:
  `docs/Codex/Datenqualitaetsmonitor_API_Pruefliste.md`
- Pushdown-Erkenntnisse allgemein:
  `docs/Codex/Datenqualitaetsmonitor_API_Pushdown_Erkenntnisse.md`
- Pushdown-Erkenntnisse Hotel/Vermieter:
  `docs/Codex/Datenqualitaetsmonitor_Hotel_Vermieter_Pushdown.md`
- Entscheidungen:
  `docs/Codex/Datenqualitaetsmonitor_Entscheidungen.md`

## Arbeitsprinzipien

- Nur fachlich sinnvolle und technisch belastbare Kriterien aktivieren.
- Count, Fehlerliste, Detailseite und Score muessen dieselbe Regel nutzen.
- Missing-Queries mit API-Pushdown immer mit `all:all` verankern.
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam.
- Keine generischen Feldannahmen ohne echte Positiv-/Negativpruefung.
- Keine generischen Wildcard-Pushdowns wie `street:*`, `details:*`,
  `openings:*` oder `feature:*` in `open-data-sachsen-tourismus`.
- UI zeigt handlungsrelevante Informationen, nicht technische Zwischenwerte.

## Prioritaet A - Als Naechstes

### 0. one.intelligence produktiv anschliessen und testen

Warum jetzt:

- die technische Trennung ist im Code vorbereitet
- die produktive Nutzbarkeit haengt jetzt an Render-Setup, Modellwahl und
  Live-Tests
- dieser Schritt ist fachlich getrennt von der Qualitaetslogik und kann
  parallel sauber abgeschlossen werden

Offen:

- `OI_API_KEY`, `OI_MODEL_MAIL` und `OI_MODEL_SEARCH` in Render hinterlegen
- pruefen, welche konkreten Modellnamen in one.intelligence fuer
  `chat/completions` freigegeben sind
- zwei getrennte Modelle oder Konfigurationen sauber benennen:
  eines fuer Mail-Entwurf, eines fuer KI-Suche
- Systemprompts in one.intelligence anlegen, ohne den im Code gesendeten
  JSON-Zwang zu verwischen
- Mail-Entwurf mit echtem Datensatz, E-Mail-Adresse und Fehlerkontext
  pruefen
- KI-Suche mit echten Themenanfragen pruefen und die Qualitaet der
  `global_id`-Rueckgaben bewerten
- Rate-Limit, Timeout und Fehlermeldungen gegen Live-Verhalten pruefen

Arbeitsanweisung:

- Render nur um neue `OI_*`-Variablen erweitern
- bestehende Meta-/Search-Keys, `LICENSEKEY` und bestehende Proxy-Logik nicht
  anfassen
- bei Modelltests zunaechst niedrige Kreativitaet und strikt parsebare
  Antworten bevorzugen
- Erkenntnisse in `Render_OI_Einrichtung.md` und spaeter in den
  Entscheidungen nachziehen

### 1. Weitere API-Kriterien verifizieren und aktivieren

Warum jetzt:

- Die fachlich unsauberen Wildcard-Annahmen sind bereinigt.
- Die erste POI-Ausschlusswelle ist produktiv in der Bewertungslogik.
- Neue Aktivierungen sollen deshalb nur noch auf der sauberen Basis erfolgen.

Offen:

- Hotel:
  weitere sinnvolle Feature-OR-Listen ueber Sprache, Zahlungsarten und
  Parkhinweise hinaus verifizieren
- POI:
  Preisregel und weitere fachlich sinnvolle Kriterien gegen echte
  Datensaetze absichern, soweit sie nicht bereits per Server-Scan aktiv sind
- Gastro:
  erweiterte Sprachen-, Zahlungs- und Kuechenangebote-OR-Listen verifizieren
- Tour:
  weitere Anreise-/Eignungsregeln ueber OePNV, Parken und Saison hinaus
  pruefen
- Event:
  Zahlungsarten, Lizenz und optionale Sprach-/Eignungsregeln pruefen
- Package:
  pruefen, ob fuer Buchbarkeit ein sauberer Pushdown analog zu Hotel moeglich
  ist oder ob Server-Scan bleibt

Verifikationsschema je Kriterium:

- `baseline`
- `positiveQuery`
- `missingQuery`
- `positive + missing = baseline`
- positiver Beispieldatensatz
- negativer Beispieldatensatz
- Listentreffer und Detailansicht pruefen
- erst dann auf `active` umstellen

Quelle:

- `Datenqualitaetsmonitor_API_Pruefliste.md`

### 2. POI-Ausschlusslogik erweitern

Bereits umgesetzt:

- zentrale Ausschlusslogik in `Statistik/quality.js`
- produktiv fuer:
  `poi_street_missing`
  `poi_phone_missing`
  `poi_email_missing`
  `poi_website_missing`
  `opening_hours_missing`
  `poi_payment_options_missing`

Noch offen:

- Preisregel produktiv nachziehen, sobald Feldbasis und Kategorien sauber
  gegen echte Daten geprueft sind
- weitere spaetere POI-Kriterien dieselbe Ausschlusslogik mitnutzen lassen
- reale Grenzfaelle gegen `testdata/treepoi.xml` und Live-Daten querpruefen

Quellen:

- `testdata/treepoi.xml`
- `docs/Codex/Datenqualitaetsmonitor_Kriterienmatrix_2026-06-11.md`

### 3. Hilfe-Seite bei neuen Kriterien fortlaufend nachziehen

Bereits umgesetzt:

- Score-Erklaerung fokussiert auf Nutzerwirkung
- Sektion fuer `source_guarded`, `not_applicable` und
  `excluded_by_category`
- Typkarten zeigen automatisch gepruefte versus fachlich vorbereitete
  Kriterien

Noch offen:

- neue aktivierte Kriterien spaeter direkt in die Typkarten uebernehmen
- Nutzertexte nachjustieren, falls sich Score-Gewichte oder Mindestlogik
  fachlich aendern
- vorbereitete Pruefungen sind jetzt sichtbar; als Naechstes muessen sie
  gewichtet und spaeter in die 3-Ebenen-Logik ueberfuehrt werden

## Prioritaet B - Wichtig, aber nicht zuerst

### 4. Suche und Listen weiter verbessern

Offen:

- Reale Suchfaelle weiter gegen echte Daten pruefen:
  Titel, Ort, Kategorie, numerische ID, `global_id`
- Sicherstellen, dass Arbeitskontext bei serverseitiger Suche erhalten bleibt
- Grosse Fehlerlisten in der UI weiter paginierbar und verstaendlich halten

### 5. UI weiter entschlacken

Offen:

- Detailseite weiter auf Titel, Probleme, Pflegehinweise und Aktionen
  zuschneiden
- Statistikseite weiter auf konkrete Aussagen reduzieren
- Technische Hinweise in UI nur dort zeigen, wo sie eine echte Entscheidung
  beeinflussen
- OI-Aktionen in der Datensatzliste nach Live-Test noch feinjustieren:
  deaktivierte Zustaende, Fehlermeldungen, Button-Texte und Modal-Texte
- die neue 3-Ebenen-Logik systemweit nachziehen:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`
  fuer Pflegeaufgaben, Detailseite, E-Mail-Texte und spaetere Filter
- entscheiden, ob vorbereitete Pruefungen spaeter auch eine eigene Sicht in
  Datensatzliste oder Pflegeaufgaben erhalten sollen

## Prioritaet C - Spaeter / Rahmenbedingungen

### 6. Datenschutz und Consent

Erledigt:

- Zentrale Runtime-Liste produktiv genutzter externer Dienste vorbereitet
  (`_layouts/default.html`)
- Help-Seite um Datenschutz-/Consent-Bereich erweitert
- Lokale Speicherungen fuer den Nutzer sichtbar dokumentiert
- Einfache Consent-Steuerung fuer optionale Kategorien vorbereitet

Weiter offen:

- Externe UI-Abhaengigkeiten (Google Fonts / Material Icons) entweder lokal
  ausliefern oder spaeter ueber echten Consentmanager blockieren
- Finalen Datenschutz-Hinweis erst schreiben, wenn produktive Drittdienste
  und Rechtsgrundlagen final entschieden sind
- Falls spaeter Analytics oder KI-Aktionen produktiv kommen:
  dieselben Kategorien aus der vorbereiteten Consent-Struktur nutzen,
  keine neue Sonderlogik bauen

### 7. Performance und Cache

Erledigt:

- Kurzer Browser-In-Memory-Cache fuer wiederholte GET-Abfragen eingebaut
- In-Flight-Deduplizierung fuer gleiche Requests eingebaut
- Manuelle Refreshs und Kontextwechsel umgehen den Kurzzeit-Cache bewusst
- Snapshot-/Listen-Cache bleibt optional und nur per Flag aktiv

Weiter offen:

- Scan-Budgets und Timeouts weiter mit echten Gebietsdaten pruefen
- Wirkung des `media:*`-Prefilters fuer `image_author_missing` mit
  Realabfragen messen
- Entscheiden, ob serverseitig Redis/KV, Snapshot-Job oder bewusst nur
  Browser-Kurzzeitcache genutzt wird
- Git-basierter 2h-Snapshot bleibt Idee, bis eine echte Betriebsloesung
  getroffen ist

### 8. Betriebsentscheidungen

Offen:

- Vercel-Migration separat behandeln; aktuell bleibt Render der Proxy
- n8n nur produktiv anbinden, wenn CORS, Auth, Limits und Antwortformat
  sauber geklaert sind
- fuer one.intelligence spaeter entscheiden, ob getrennte Modelle genuegen
  oder ob eigene Assistent-/Prompt-Konfigurationen versioniert gepflegt
  werden sollen

## Bewusst nicht aktivieren

Diese Themen bleiben offen oder clientseitig:

- generische Wildcard-Pushdowns:
  `street:*`
  `details:*`
  `openings:*`
  `feature:*`
- `category:"regionale Kueche"` als Missing-Regel
- Bild-/Medienurheber als API-Pushdown
- Event-Termine und Event-Veranstaltungsort als Datenqualitaetskriterium
- Tour-Polyline, Tour-Laenge, Tour-Dauer als Datenqualitaetskriterium
- fehlender Titel / fehlende Kategorie / fehlende Geo-Daten als normale
  Pflegeaufgabe
- `booking:*` fuer Hotel
- `keywords:"Bookable"` fuer Hotel

## Zuletzt umgesetzt

- Help-Seite reduziert:
  Consent aus dem Help-Hauptinhalt entfernt, Score-Texte vereinfacht,
  neue 3-Ebenen-Erklaerung vorbereitet
- vorbereitete Pruefungen in Help-Karten und Datensatz-Detailseite
  integriert; Score und automatische Fehlerlisten bleiben unveraendert
- one.intelligence-Integration als separaten Backend-Strang vorbereitet:
  `/api/oi/mail-draft`, `/api/oi/search-records`,
  `/api/records/by-global-ids`
- Datensatzliste um `AI-Search` und KI-Mailaktion erweitert

- aktive Wildcard-Annahmen fuer Beschreibung und Oeffnungszeiten aus
  fachlich unsauberen Pushdowns entfernt und auf Server-Scan umgestellt
- neue produktive POI-Server-Scan-Kriterien aktiviert:
  `poi_street_missing`
  `poi_teaser_missing`
  `poi_email_missing`
  `poi_website_missing`
  `poi_phone_missing`
- Hotel-OR-Listen fuer Fremdsprachen, Zahlungsarten und Parkhinweise live
  ueber den Render-Proxy verifiziert und produktiv aktiviert
- `poi_price_missing` produktiv als Server-Scan mit Kategorien-Ausschluss
  aktiviert
- `tour_season_missing` und `tour_parking_missing` produktiv als
  Server-Scan-Kriterien aktiviert
- erste zentrale POI-Ausschlusswelle in Score, Fehlerliste, Detailseite und
  Exportlogik verankert
- Pflegeaufgaben nutzen bei Gebiet oder Ort denselben regionalen
  Qualitaetsscan wie die Uebersicht
- Help-Seite erklaert jetzt auch bewusst nicht scorewirksame Faelle

## Standardchecks

- Immer: `git diff --check`
- Wenn Node verfuegbar ist:
  `npm run check`
  `npm run diagnose:quality-examples`
- Wenn Node nicht verfuegbar ist:
  keine erfolgreiche Laufzeitpruefung behaupten
