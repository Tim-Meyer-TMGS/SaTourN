# Datenqualitäts-Monitor - Offene TODOs

Stand: 2026-06-12

Diese Datei ist die kurze Arbeitsliste für die nächsten Schritte.
Abgeschlossene Analysen, Mockup-Arbeiten und Pushdown-Nachweise stehen in den
verlinkten Detaildokumenten und werden hier nicht doppelt ausgeschrieben.

## Referenzen

- Projektstand:
  `docs/Codex/Datenqualitätsmonitor_Aktüller_Projektstand.md`
- Kriterienmatrix 2026-06-11:
  `docs/Codex/Datenqualitätsmonitor_Kriterienmatrix_2026-06-11.md`
- API-Prüfliste:
  `docs/Codex/Datenqualitätsmonitor_API_Prüfliste.md`
- Pushdown-Erkenntnisse allgemein:
  `docs/Codex/Datenqualitätsmonitor_API_Pushdown_Erkenntnisse.md`
- Pushdown-Erkenntnisse Hotel/Vermieter:
  `docs/Codex/Datenqualitätsmonitor_Hotel_Vermieter_Pushdown.md`
- Entscheidungen:
  `docs/Codex/Datenqualitätsmonitor_Entscheidungen.md`

## Arbeitsprinzipien

- Nur fachlich sinnvolle und technisch belastbare Kriterien aktivieren.
- Count, Fehlerliste, Detailseite und Score müssen dieselbe Regel nutzen.
- Missing-Qüries mit API-Pushdown immer mit `all:all` verankern.
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam.
- Keine generischen Feldannahmen ohne echte Positiv-/Negativprüfung.
- Keine generischen Wildcard-Pushdowns wie `street:*`, `details:*`,
  `openings:*` oder `feature:*` in `open-data-sachsen-tourismus`.
- UI zeigt handlungsrelevante Informationen, nicht technische Zwischenwerte.

## Priorität A - Als Nächstes

### 0. one.intelligence produktiv anschliessen und testen

Warum jetzt:

- die technische Trennung ist im Code vorbereitet
- die produktive Nutzbarkeit hängt jetzt an Render-Setup, Modellwahl und
  Live-Tests
- dieser Schritt ist fachlich getrennt von der Qualitätslogik und kann
  parallel sauber abgeschlossen werden

Offen:

- `OI_API_KEY`, `OI_MODEL_MAIL` und `OI_MODEL_SEARCH` in Render hinterlegen
- prüfen, welche konkreten Modellnamen in one.intelligence für
  `chat/completions` freigegeben sind
- zwei getrennte Modelle oder Konfigurationen sauber benennen:
  eines für Mail-Entwurf, eines für KI-Suche
- Systemprompts in one.intelligence anlegen, ohne den im Code gesendeten
  JSON-Zwang zu verwischen
- Mail-Entwurf mit echtem Datensatz, E-Mail-Adresse und Fehlerkontext
  prüfen
- KI-Suche mit echten Themenanfragen prüfen und die Qualität der
  `global_id`-Rückgaben bewerten
- Rate-Limit, Timeout und Fehlermeldungen gegen Live-Verhalten prüfen

Arbeitsanweisung:

- Render nur um neü `OI_*`-Variablen erweitern
- bestehende Meta-/Search-Keys, `LICENSEKEY` und bestehende Proxy-Logik nicht
  anfassen
- bei Modelltests zunächst niedrige Kreativität und strikt parsebare
  Antworten bevorzugen
- Erkenntnisse in `Render_OI_Einrichtung.md` und später in den
  Entscheidungen nachziehen

### 1. Weitere API-Kriterien verifizieren und aktivieren

Warum jetzt:

- Die fachlich unsauberen Wildcard-Annahmen sind bereinigt.
- Die erste POI-Ausschlusswelle ist produktiv in der Bewertungslogik.
- Neü Aktivierungen sollen deshalb nur noch auf der sauberen Basis erfolgen.

Offen:

- Hotel:
  weitere sinnvolle Feature-OR-Listen über Sprache, Zahlungsarten und
  Parkhinweise hinaus verifizieren
- POI:
  Preisregel und weitere fachlich sinnvolle Kriterien gegen echte
  Datensätze absichern, soweit sie nicht bereits per Server-Scan aktiv sind
- Gastro:
  erweiterte Sprachen-, Zahlungs- und Küchenangebote-OR-Listen verifizieren
- Tour:
  weitere Anreise-/Eignungsregeln über ÖPNV, Parken und Saison hinaus
  prüfen
- Event:
  Zahlungsarten, Lizenz und optionale Sprach-/Eignungsregeln prüfen
- Package:
  prüfen, ob für Buchbarkeit ein sauberer Pushdown analog zu Hotel möglich
  ist oder ob Server-Scan bleibt

Verifikationsschema je Kriterium:

- `baseline`
- `positiveQüry`
- `missingQüry`
- `positive + missing = baseline`
- positiver Beispieldatensatz
- negativer Beispieldatensatz
- Listentreffer und Detailansicht prüfen
- erst dann auf `active` umstellen

Qülle:

- `Datenqualitätsmonitor_API_Prüfliste.md`

### 2. POI-Ausschlusslogik erweitern

Bereits umgesetzt:

- zentrale Ausschlusslogik in `Statistik/quality.js`
- produktiv für:
  `poi_street_missing`
  `poi_phone_missing`
  `poi_email_missing`
  `poi_website_missing`
  `opening_hours_missing`
  `poi_payment_options_missing`

Noch offen:

- Preisregel produktiv nachziehen, sobald Feldbasis und Kategorien sauber
  gegen echte Daten geprüft sind
- weitere spätere POI-Kriterien dieselbe Ausschlusslogik mitnutzen lassen
- reale Grenzfälle gegen `testdata/treepoi.xml` und Live-Daten qürprüfen

Qüllen:

- `testdata/treepoi.xml`
- `docs/Codex/Datenqualitätsmonitor_Kriterienmatrix_2026-06-11.md`

### 3. Hilfe-Seite bei neün Kriterien fortlaufend nachziehen

Bereits umgesetzt:

- Score-Erklärung fokussiert auf Nutzerwirkung
- Sektion für `source_guarded`, `not_applicable` und
  `excluded_by_category`
- Typkarten zeigen automatisch geprüfte versus fachlich vorbereitete
  Kriterien

Noch offen:

- neü aktivierte Kriterien später direkt in die Typkarten übernehmen
- Nutzertexte nachjustieren, falls sich Score-Gewichte oder Mindestlogik
  fachlich ändern
- vorbereitete Prüfungen sind jetzt sichtbar; als Nächstes müssen sie
  gewichtet und später in die 3-Ebenen-Logik überführt werden

## Priorität B - Wichtig, aber nicht zürst

### 4. Suche und Listen weiter verbessern

Offen:

- Reale Suchfälle weiter gegen echte Daten prüfen:
  Titel, Ort, Kategorie, numerische ID, `global_id`
- Sicherstellen, dass Arbeitskontext bei serverseitiger Suche erhalten bleibt
- Grosse Fehlerlisten in der UI weiter paginierbar und verständlich halten

### 5. UI weiter entschlacken

Offen:

- Detailseite weiter auf Titel, Probleme, Pflegehinweise und Aktionen
  zuschneiden
- Statistikseite weiter auf konkrete Aussagen reduzieren
- Technische Hinweise in UI nur dort zeigen, wo sie eine echte Entscheidung
  beeinflussen
- OI-Aktionen in der Datensatzliste nach Live-Test noch feinjustieren:
  deaktivierte Zustände, Fehlermeldungen, Button-Texte und Modal-Texte
- die neü 3-Ebenen-Logik systemweit nachziehen:
  `Kritische Fehler`, `Fehler`, `Leichte Optimierungen`
  für Pflegeaufgaben, Detailseite, E-Mail-Texte und spätere Filter
- entscheiden, ob vorbereitete Prüfungen später auch eine eigene Sicht in
  Datensatzliste oder Pflegeaufgaben erhalten sollen

## Priorität C - Später / Rahmenbedingungen

### 6. Datenschutz und Consent

Erledigt:

- Zentrale Runtime-Liste produktiv genutzter externer Dienste vorbereitet
  (`_layouts/default.html`)
- Help-Seite um Datenschutz-/Consent-Bereich erweitert
- Lokale Speicherungen für den Nutzer sichtbar dokumentiert
- Einfache Consent-Steürung für optionale Kategorien vorbereitet

Weiter offen:

- Externe UI-Abhängigkeiten (Google Fonts / Material Icons) entweder lokal
  ausliefern oder später über echten Consentmanager blockieren
- Finalen Datenschutz-Hinweis erst schreiben, wenn produktive Drittdienste
  und Rechtsgrundlagen final entschieden sind
- Falls später Analytics oder KI-Aktionen produktiv kommen:
  dieselben Kategorien aus der vorbereiteten Consent-Struktur nutzen,
  keine neü Sonderlogik baün

### 7. Performance und Cache

Erledigt:

- Kurzer Browser-In-Memory-Cache für wiederholte GET-Abfragen eingebaut
- In-Flight-Deduplizierung für gleiche Reqüsts eingebaut
- Manülle Refreshs und Kontextwechsel umgehen den Kurzzeit-Cache bewusst
- Snapshot-/Listen-Cache bleibt optional und nur per Flag aktiv

Weiter offen:

- Scan-Budgets und Timeouts weiter mit echten Gebietsdaten prüfen
- Wirkung des `media:*`-Prefilters für `image_author_missing` mit
  Realabfragen messen
- Entscheiden, ob serverseitig Redis/KV, Snapshot-Job oder bewusst nur
  Browser-Kurzzeitcache genutzt wird
- Git-basierter 2h-Snapshot bleibt Idee, bis eine echte Betriebslösung
  getroffen ist

### 8. Betriebsentscheidungen

Offen:

- Vercel-Migration separat behandeln; aktüll bleibt Render der Proxy
- n8n nur produktiv anbinden, wenn CORS, Auth, Limits und Antwortformat
  sauber geklärt sind
- für one.intelligence später entscheiden, ob getrennte Modelle genügen
  oder ob eigene Assistent-/Prompt-Konfigurationen versioniert gepflegt
  werden sollen

## Bewusst nicht aktivieren

Diese Themen bleiben offen oder clientseitig:

- generische Wildcard-Pushdowns:
  `street:*`
  `details:*`
  `openings:*`
  `feature:*`
- `category:"regionale Küche"` als Missing-Regel
- Bild-/Medienurheber als API-Pushdown
- Event-Termine und Event-Veranstaltungsort als Datenqualitätskriterium
- Tour-Polyline, Tour-Länge, Tour-Daür als Datenqualitätskriterium
- fehlender Titel / fehlende Kategorie / fehlende Geo-Daten als normale
  Pflegeaufgabe
- `booking:*` für Hotel
- `keywords:"Bookable"` für Hotel

## Zuletzt umgesetzt

- Help-Seite reduziert:
  Consent aus dem Help-Hauptinhalt entfernt, Score-Texte vereinfacht,
  neü 3-Ebenen-Erklärung vorbereitet
- vorbereitete Prüfungen in Help-Karten und Datensatz-Detailseite
  integriert; Score und automatische Fehlerlisten bleiben unverändert
- one.intelligence-Integration als separaten Backend-Strang vorbereitet:
  `/api/oi/mail-draft`, `/api/oi/search-records`,
  `/api/records/by-global-ids`
- Datensatzliste um `AI-Search` und KI-Mailaktion erweitert

- aktive Wildcard-Annahmen für Beschreibung und Öffnungszeiten aus
  fachlich unsauberen Pushdowns entfernt und auf Server-Scan umgestellt
- neü produktive POI-Server-Scan-Kriterien aktiviert:
  `poi_street_missing`
  `poi_teaser_missing`
  `poi_email_missing`
  `poi_website_missing`
  `poi_phone_missing`
- Hotel-OR-Listen für Fremdsprachen, Zahlungsarten und Parkhinweise live
  über den Render-Proxy verifiziert und produktiv aktiviert
- `poi_price_missing` produktiv als Server-Scan mit Kategorien-Ausschluss
  aktiviert
- `tour_season_missing` und `tour_parking_missing` produktiv als
  Server-Scan-Kriterien aktiviert
- erste zentrale POI-Ausschlusswelle in Score, Fehlerliste, Detailseite und
  Exportlogik verankert
- Pflegeaufgaben nutzen bei Gebiet oder Ort denselben regionalen
  Qualitätsscan wie die Übersicht
- Help-Seite erklärt jetzt auch bewusst nicht scorewirksame Fälle

## Standardchecks

- Immer: `git diff --check`
- Wenn Node verfügbar ist:
  `npm run check`
  `npm run diagnose:quality-examples`
- Wenn Node nicht verfügbar ist:
  keine erfolgreiche Laufzeitprüfung behaupten
