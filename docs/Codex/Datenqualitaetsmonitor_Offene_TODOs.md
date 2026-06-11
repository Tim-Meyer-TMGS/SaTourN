# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-11

Diese Datei ist die kurze Arbeitsliste fuer die naechsten Schritte.
Abgeschlossene Analysen, Mockup-Arbeiten und Pushdown-Nachweise stehen in den
verlinkten Detaildokumenten und werden hier nicht doppelt ausgeschrieben.

## Referenzen

- Projektstand:
  `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
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
- Keine generischen Feldannahmen ohne echte Positiv-/Negativpruefung.
- UI zeigt handlungsrelevante Informationen, nicht technische Zwischenwerte.

## Prioritaet A - Als Naechstes

### 1. Weitere API-Kriterien verifizieren und aktivieren

Offen:

- Hotel:
  weitere Fremdsprachen, weitere Zahlungsarten, weitere sinnvolle
  Ausstattungs-/Eignungsmerkmale aus `VermieterMerkmalTree.xml`
- Gastro:
  weitere belastbare Kuechenarten aus echten Kategorien
- Event:
  Lizenz und Beschreibung weiter pruefen
- Strassenregeln:
  Hotel, POI, Gastro, Event gegen echte Positiv-/Negativbeispiele verifizieren
- Package:
  pruefen, ob fuer Buchbarkeit ein sauberer Pushdown analog zu Hotel moeglich
  ist oder ob Server-Scan bleibt

Hinweis:

- Konkrete Querys und Nachweisfelder stehen in
  `Datenqualitaetsmonitor_API_Pruefliste.md`.

### 2. Sonderfaelle fuer Pflegeaufgaben ausschliessen

Offen:

- POI-Kategorien identifizieren, fuer die Oeffnungszeiten fachlich nicht
  erwartet werden
- Ausschlussregel nicht nur im UI, sondern in Query/Regellogik verankern
- Count, Fehlerliste und Detailseite mit derselben Ausschlusslogik betreiben

Quelle:

- `testdata/treepoi.xml`

### 3. Hilfe-Seite fachlich weiter schaerfen

Offen:

- Entscheiden, ob neben den aktiven Score-Regeln eine zweite, kurze Sektion
  fuer "fachlich relevant, aber noch nicht scorewirksam" sichtbar werden soll
- Hotel-/POI-/Gastro-/Tour-Karten mit spaeteren aktivierten Kriterien
  fortlaufend nachziehen

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

## Bewusst nicht aktivieren

Diese Themen bleiben offen oder clientseitig:

- Telefon
- E-Mail
- Webseite
- Teaser
- Preisfelder / Preisinformation
- Bild-/Medienurheber als API-Pushdown
- Ansprechperson / Organisation / Veranstalter
- Event-Termine als Datenqualitaetskriterium
- Tour-Startbeschreibung / Tour-Zielbeschreibung
- `category:"regionale Küche"` als Missing-Regel
- `booking:*` fuer Hotel
- `keywords:"Bookable"` fuer Hotel

## Standardchecks

- Immer: `git diff --check`
- Wenn Node verfuegbar ist:
  `npm run check`
  `npm run diagnose:quality-examples`
- Wenn Node nicht verfuegbar ist:
  keine erfolgreiche Laufzeitpruefung behaupten
