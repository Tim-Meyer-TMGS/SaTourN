# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-05

Diese Liste enthaelt die naechsten konkreten Schritte. Integriert wurden:

- `C:\Users\meyer\Desktop\Datenqualitaetskriterien.docx`
- `C:\Users\meyer\Desktop\Offene Themen.docx`

Abgeschlossene Abschnittsprotokolle und alte Mockup-Befehle liegen im Archiv.

## 1. UI bereinigen

Ziel: Die Seiten sollen ruhiger werden und keine technischen Zwischenwerte
anzeigen, die fuer Datenpflege nicht direkt helfen.

Konkrete Schritte:

- Detailseite entschlacken. Aktuell wirkt sie fachlich und visuell zu beladen.
  Prioritaet zuerst auf Titel, Typ, Arbeitskontext, wichtigste Probleme,
  Pflegehinweise und konkrete Aktionen legen.
- Open-Data-Statistik weiter entschlacken: kein doppelter Arbeitskontext, keine
  redundante Tabelle, keine Legende im Donut selbst, keine zweite prominente
  Wiederholung gleicher Kennzahlen.
- `Menue einklappen` aus allen Sidebar-Bereichen entfernen, solange die
  Funktion nicht aktiv genutzt wird.
- Hilfe nicht als deaktivierten Button fuehren. Entweder echte Hilfeseite
  anlegen oder sichtbare Hilfe-Buttons entfernen.
- Farbkontrast und Darstellung des Arbeitskontext-Dialogs pruefen:
  Gebiet, Ort und Datentyp muessen klar lesbar und freundlich wirken.
- Technische Detailanzeigen in Pflegeaufgaben reduzieren:
  `Pruefbarkeit`, `Automatisch pruefbar`, `Datenbasis`,
  `Verifizierter API-Count` und lange Hinweise nicht als prominente
  Hauptinformationen zeigen.
- Hinweis wie `Die Anzahl betroffener Datensaetze basiert auf verifizierten
  API-Counts ...` nur kurz und kontextnah anzeigen; Details in Console oder
  technische Doku verschieben.
- Footer-/Infozeile `Die dargestellten Zahlen basieren ... Datenbasis:
  Vollstaendig` auf der Statistikseite entfernen oder stark kuerzen, wenn die
  Aussage redundant ist.
- Qualitaetsstatus `gut`, `pruefen`, `kritisch`, `nicht bewertbar` aus
  allgemeinen Arbeitslisten entfernen, wo er keine direkte Pflegehandlung
  ausloest. Stattdessen Problem und naechster Schritt anzeigen.

Arbeitsanweisung fuer Umsetzung:

- Pro Seite zuerst sichtbare UI-Elemente inventarisieren.
- Alles entfernen oder ausblenden, was keine Entscheidung oder Aktion ausloest.
- Technische Statusdetails in `console.debug/warn/error` verschieben.
- Nach jeder UI-Aenderung mit Null-Treffern testen: keine leeren Aufgaben,
  keine falschen Status, keine ueberfluessigen technischen Hinweise.

## 2. Datensatzsuche verbessern

Ziel: Suche darf nicht nur ueber ID funktionieren. Nutzer muessen Titel, Ort,
Kategorie, id, und `global_id` finden koennen.

Konkrete Schritte:

- Aktuelle Suche in `records.html` gegen echte Daten pruefen:
  Titel-Volltext, Ort, Kategorie, ID und `global_id`.
- Falls nur lokal in geladenen Treffern gesucht wird, explizite serverseitige
  Suche ueber `/api/search` ergaenzen.
- Keine Vollabfrage beim Tippen. Suche erst per Button oder Debounce mit
  kleinem Limit starten.
- Suchquery so bauen, dass Arbeitskontext erhalten bleibt.
- Trefferliste nach Suche weiterhin schlank halten; technische Treffergrenzen
  ruhig ausweisen.

Arbeitsanweisung fuer Umsetzung:

- Zuerst 5 reale Suchbeispiele notieren: Titel, Ort, Kategorie, numerische ID,
  `global_id`.
- Danach `searchSingleRecordById()` nicht ersetzen, sondern um eine
  Volltextsuche ergaenzen.
- API-Requests in DevTools/Console zaehlen und sicherstellen, dass keine
  Requests pro Tastendruck entstehen.

## 3. Fachliche Qualitaetskriterien modellieren

Ziel: Die fachlichen Kriterien aus `Datenqualitaetskriterien.docx` werden als
Qualitaetsmodell vorbereitet. Nicht jedes Kriterium wird sofort automatisch als
Pflegeaufgabe aktiviert. die bisherigen kriterien sind hier gegenzuprüfen und entsprechend einzuordnen. dabei soll die bisherige logik mit "kritisch" und "kleines Problem" beibehalten werden. Integriere das auch in einer dargestellten matrix in der Hilfe-Seite. User müssen sich informieren können, welche kriterien wichtig sind.
Beisieldaten für die identifizierung sind hinterlegt.
technische prüfungen nach folgenden dingen müssen nicht integriert werden,  da diese bei fehlen sowieso nicht als datensätze ausgegeben werden:
titel
kategorie
geo-informationen
Ort
- Tour-Geometrie bzw. Polyline
- Tourdaten wie Laenge, Dauer oder vergleichbare Basisdate
Betriebsart
- Veranstalter
- Termine

Entsprechende Beispieldaten sind hinterlegt. Ich prüfe gern nach, ob wir bestimmte punkte gegen die api pushen können statt diese selbst zu berechnen.

### Hotel / Gastgeber

Minimale Anforderungen:

- Titel
- Kategorie
- Geo-Informationen
- Ort
- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text

Gute Qualitaet:

- E-Mail
- Webseite
- Merkmale
- Zahlungsmoeglichkeiten
- Preisinformation

Sehr gute Qualitaet:

- Ansprechperson
- Erreichbarkeit per OePNV
- Fremdsprachenkenntnisse
- CC-Lizenz
- Parkplaetze

### Touren

Basisanforderungen:

- Tour-Geometrie bzw. Polyline
- Tourdaten wie Laenge, Dauer oder vergleichbare Basisdaten

Minimale Anforderungen:

- Titel
- Kategorie
- Geo-Information
- Ort
- Beschreibungstext
- Teaser-Text

Gute Qualitaet:

- Eignung oder Jahreszeit
- Anreise mit OePNV und Parken
- Autor oder Organisation

Sehr gute Qualitaet:

- Start- und Zielbeschreibungen
- CC-Lizenz

### POI

Minimale Anforderungen:

- Titel
- Kategorie
- Geo-Information
- Ort
- Strasse
- Beschreibungstext
- Teaser-Text

Gute Qualitaet:

- E-Mail
- Webseite
- Telefon
- Oeffnungszeiten
- Preisinformation

Sehr gute Qualitaet:

- Zahlungsmoeglichkeiten
- Lizenz

### Gastronomie

Minimale Anforderungen:

- Titel
- Betriebsart
- Geo-Information
- Ort
- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text

Gute Qualitaet:

- E-Mail
- Webseite
- Oeffnungszeiten
- Zahlungsmoeglichkeiten

Sehr gute Qualitaet:

- CC-Lizenz
- Kuechenart
- Fremdsprachenkenntnisse
- Anfahrt
- Parkplaetze
- Kueche

### Veranstaltungen

Minimale Anforderungen:

- Titel
- Kategorie
- Geo-Information
- Ort
- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text
- Veranstalter
- Termine

Gute Qualitaet:

- E-Mail
- Webseite
- Preisinformationen

Sehr gute Qualitaet:

- Zahlungsmoeglichkeiten
- CC-Lizenz

Arbeitsanweisung fuer Umsetzung:

- Neues fachliches Kriterienmodell nicht blind in `qualityCriteria`
  aktivieren.
- Fuer jedes Kriterium erst festhalten:
  Datentyp, Qualitaetsstufe, Feldmapping, pruefbare API-Query,
  Server-Scan-Notwendigkeit, fachliche Empfehlung und UI-Prioritaet.
- Nur Kriterien mit verifiziertem Feldmapping und belastbarer Abfrage in
  Pflegeaufgaben aktivieren.
- Mindestanforderungen hoeher priorisieren als gute oder sehr gute Qualitaet.
- Open-Data-relevante Kriterien, besonders Lizenz, getrennt von allgemeinen
  Vollstaendigkeitskriterien ausweisen.
- Bestehende Kriterien in `Statistik/quality.js` nur erweitern, wenn
  Frontend, Proxy-Scan, Count-Logik und Doku gemeinsam angepasst werden.

Aktueller Umsetzungsstand:

- `domainQualityModel` ist die gemeinsame fachliche Quelle fuer alte und neue
  Qualitaets- und Pruefkriterien.
- Alle Modellkriterien gelten fachlich. Technische Status wie `active`,
  `needs_verification`, `source_guarded` oder `manual_review` beschreiben nur
  die aktuelle automatische Pruefbarkeit.
- Alte nicht-automatische Kriterien wie `geo_missing`,
  `touristtrip_incomplete` und `manual_image_quality` sind ebenfalls im
  Fachmodell enthalten.
- Aktive Altkriterien sind ueber `domainCriterionIds` den fachlichen
  Modellpunkten zugeordnet.
- Schritt 4 klaert die technische Aktivierung der neuen Kriterien.

## 4. Feldmappings und API-Queries verifizieren

Ziel: Aus den fachlichen Kriterien werden echte, belastbare technische Regeln. Halte dich dabei an den vorherigen schritt: Nicht alles muss überprüft werden.

Konkrete Schritte:

- Fuer Telefon, Strasse, Teaser, E-Mail, Webseite, Preisinformation,
  Zahlungsmoeglichkeiten, Parkplaetze, Fremdsprachen, Veranstalter, Termine,
  Kuechenart, Betriebsart, Autor/Organisation, Start-/Zielbeschreibung und
  Tourdaten echte Destination.One-Felder ermitteln.
- Fuer jedes Feld pruefen, ob ein API-Count per Query moeglich ist.
- Wenn kein API-Pushdown moeglich ist, Server-Scan-Kosten abschaetzen.
- Event-Beispieldaten beschaffen, bevor Veranstaltungskriterien aktiviert
  werden.
- Hotel-`image_missing` und Hotel-`description_missing` fachlich entscheiden
  und mit echten Daten testen.
- Package-`booking_link_missing`: Logik kann von Hotel übernommen werden und nach Verifikation aktivieren.
- ET4-Pages-Pfade fuer Hotel, Gastro, Tour, Event und Package mit echten
  `global_id`-Werten verifizieren.

Arbeitsanweisung fuer Umsetzung:

- Pro neuem Feld mindestens einen echten positiven und einen echten negativen
  Datensatz dokumentieren.
- Keine generischen Alias-Annahmen als verifiziert behandeln.
- Erst Query in Proxy/API testen, dann UI aktivieren.
- Count, Liste und Detailbewertung muessen dieselbe fachliche Logik nutzen.

Aktueller Arbeitsstand:

- Die Meta-Service- und Meta-Query-Anleitungen wurden ausgewertet. Der
  Search-Service unterstuetzt `q`, `type`, `limit`, `offset`, `request` und
  Query-Prefixes. Reine Negativabfragen sollen mit `all:all` kombiniert
  werden.
- Die spaeteren Pushdown-Erkenntnisse sind zusaetzlich in
  `docs/Codex/Datenqualitaetsmonitor_API_Pushdown_Erkenntnisse.md`
  abgelegt.
- In `Statistik/quality.js` gibt es jetzt `apiCandidate`-Metadaten im
  `domainQualityModel`. Diese Kandidaten sind technische Vorbereitungen, aber
  noch keine aktiven Score- oder Pflegeaufgaben-Regeln.
- Export-Helfer `getDomainApiCandidatesForType()` und
  `getDomainCriterionApiCandidate()` liefern die Kandidaten fuer gezielte
  Proxy-Tests.
- API-Kandidaten aus dokumentierten Prefixes:
  - `street:*` fuer Strassen-Kriterien bei Hotel, POI, Gastro und Event.
  - `lat:* AND lon:*` als Teilpruefung fuer Geo-Informationen.
  - `length` und `duration` als Teilpruefung fuer Tour-Basisdaten.
- API-Kandidaten aus bereits im Monitor genutzten Prefixes:
  - `details:*` fuer Hotel- und Event-Beschreibung, Typ-Test noch offen.
  - `attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)` fuer Event-Lizenz,
    Typ-Test noch offen.
- Die Hilfeseite zeigt API-Kandidaten im fachlichen Kriterienmodell an. Aktive
  Regeln bleiben getrennt davon erkennbar.
- Umgesetzt wurden inzwischen die belastbaren OR-Listen fuer POI/Gastro bei
  Zahlungsarten, Fremdsprachen, Parkmerkmalen, POI-Eignung und
  Gastro-Kuechenarten. Fehlende Werte nutzen serverseitig jetzt `all:all` als
  Missing-Anker.

Naechste technische Verifikation:

- Fuer jeden `apiCandidate` in echten Daten einmal `positiveQuery` und
  `missingQuery` ueber den Proxy testen.
- Konkrete Testanfragen und Nachweisfelder stehen in
  `docs/Codex/Datenqualitaetsmonitor_API_Pruefliste.md`.
- Nur wenn Count, Fehlerliste und Detailbewertung denselben fachlichen Befund
  liefern, darf der Kandidat in `qualityCriteria` aktiviert werden.
- Kandidaten mit Teilpruefung (`geo_missing`, `touristtrip_incomplete`) nicht
  direkt als vollstaendige Pflegeaufgabe aktivieren; hier muss zuerst geklaert
  werden, ob die API alle Pflichtbestandteile abbilden kann.

## 5. Sonderfaelle aus Pflegeaufgaben ausschliessen

Ziel: Objekte, die fachlich nicht pflegbar sind, duerfen keine falschen
Pflegeaufgaben erzeugen.

Konkreter Fall:

- Oeffnungszeiten von beispelsweise Bergen koennen nicht gepflegt werden. Solche Objekte
  duerfen nicht als `opening_hours_missing`-Pflegeaufgabe erscheinen.

Arbeitsanweisung fuer Umsetzung:
- Entlang der Category_POI Kategorieliste Kategorien filtern, für die normalerweise keine öffnungszeiten hinterlegt werden können. Die Lise liegt im ordner testdata als treepoi.xml.

- Pruefen, ob sie ueber Kategorie, Keywords, Typ, Source oder ein anderes Feld
  sicher identifizierbar sind.
- Danach eine Ausschlussregel im Kriterienmodell ergaenzen, nicht nur im UI
  ausblenden. Das kann z.b. über eine negierung in der API-Abfrage erfolgen.
- Count, Fehlerliste und Detailseite muessen denselben Ausschluss verwenden.
- Falls der API-Count den Ausschluss nicht sauber abbilden kann, das Kriterium
  fuer diese Kombination als Server-Scan oder nicht vollstaendig kennzeichnen.

## 6. Hilfe, Erklaerungen und Rechtliches

Ziel: Nutzer sollen verstehen, was die Ansichten bedeuten, ohne dass jede Seite
mit Erklaertext ueberladen wird.

Konkrete Schritte:

- Hilfeseite anlegen oder vorhandenen Hilfe-Einstieg entfernen.
- Kurze Erklaerung erstellen: Welche Seite ist wofuer gut?
  Uebersicht, Pflegeaufgaben, Datensaetze, Open-Data-Statistik.
- Matrixberechnungsgrundlagen dokumentieren, falls Matrix/Statusverteilung
  wieder sichtbar oder fachlich relevant wird.
- Cookie-Banner bzw. Datenschutz-Hinweis pruefen, falls Tracking,
  externe Dienste, n8n/KI oder persistente Cookies eingesetzt werden.
- wir können consentmanager einsetzen, bitte bereite alles für die integration des codes vor.
Arbeitsanweisung fuer Umsetzung:

- Hilfetexte kurz und handlungsorientiert halten.
- Technische API-Details nicht in Nutzerdokumentation ausbreiten.
- Datenschutz/Cookie-Hinweis erst konkret bauen, wenn klar ist, welche
  Speicherungen und externen Dienste produktiv aktiv sind.

Aktueller Umsetzungsstand:

- `Statistik/help.html` ist angelegt und in der Hauptnavigation verlinkt.
- Die Hilfeseite erklaert Score-Berechnung, Statusgrenzen, automatisch
  gepruefte Kriterien und das fachliche Kriterienmodell.
- Die Kriterienmatrix wird aus `qualityCriteria` und `domainQualityModel`
  gerendert, damit keine zweite Kriterienliste gepflegt werden muss.
- Rechtliches, Datenschutz und Consentmanager bleiben offen.

## 7. API und Performance

Ziel: Die Anwendung bleibt schnell, obwohl Listen und Kriterien fachlich
vollstaendiger werden.

Konkrete Schritte:

- `/api/quality/scan` fuer grosse Fehlerlisten paginierbar in der UI machen,
  falls mehr als die aktuell geladenen Treffer bearbeitet werden muessen.
- Timeouts und Scan-Budgets fuer regionale Qualitaetsscans mit echten
  Gebietsdaten dimensionieren.
- Wirkung des `media:*`-Prefilters fuer `image_author_missing` messen:
  Quellmenge vorher/nachher, Laufzeit und Trefferquote.
- Optionalen Batch-Endpunkt fuer mehrere Count-Jobs pruefen, falls
  Pflegeaufgaben oder Statistik zu viele Einzelrequests ausloesen.
- Fuer sehr grosse CSV-Exporte spaeter Batch-/Job-Endpunkt pruefen.

Arbeitsanweisung fuer Umsetzung:

- Keine automatische Vollabfrage beim Seitenstart.
- Grosse Listen nur nach konkreter Nutzeraktion laden.
- Laufzeit, Trefferzahl, Truncation und Datenbasis pro Scan intern erfassen.
- UI darf Vollstaendigkeit nur behaupten, wenn der Scan fachlich und technisch
  vollstaendig war.
  - Wenn ein Arbeitskontext abgerufen wird, soll im Git ein Snapshot der abgerufenen daten abgespeichert werden. das dient als vorübergehender cache der erweitert werden kann. der soll nach spätestens 2h überschrieben werden - wenn das geht.

## 8. Spaeter / optional

- Cache-/Snapshot-Pfad erst aktivieren, wenn Render Key Value oder eine andere
  Speicherloesung bewusst eingefuehrt wird.
- Historie, Trends und Nachtlaeufe erst planen, wenn eine produktive
  Speicherbasis entschieden ist.
- Vercel-Migration separat behandeln; aktuell bleibt Render der Proxy.
- n8n produktiv absichern: CORS, Auth, Rate-Limit, Payload-Limits,
  Antwortformat.

## Standardchecks

- Immer: `git diff --check`.
- Wenn Node verfuegbar ist: `npm run check` und
  `npm run diagnose:quality-examples`.
- Wenn Node nicht verfuegbar ist, im Arbeitsstand dokumentieren und keine
  erfolgreiche Node-Pruefung behaupten.
