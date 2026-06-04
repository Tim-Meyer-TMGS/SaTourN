# SaTourN Datenqualitaets-Monitor

## Kompletter Codex-Prompt in Abschnitten

> *Arbeitsdokument fuer die schrittweise Weiterentwicklung des bestehenden SaTourN-Statistik-Dashboards. Jeder Abschnitt ist als einzelner Codex-Auftrag gedacht.*

| Phase | Ziel | Ergebnis |
| --- | --- | --- |
| 1-5 | Grundlage | Analyse, State, Kriterien, Score, Aggregationen |
| 6-9 | Arbeitslisten | KPI-UI, Problemcluster, Fehlerlisten, Matrix, CSV |
| 10 | KI | Chatbot ueber n8n-Webhook mit gefiltertem Kontext |
| 11-13 | Abrundung | Detailansicht, Empty States, Robustheit, finale Pruefung |

# Gesamtkontext fuer alle Abschnitte

```text
Rolle und Gesamtziel:
Du bist Codex und arbeitest als Senior Frontend Engineer am bestehenden SaTourN-Statistik-Dashboard.

Das bestehende Dashboard soll nicht komplett neu gebaut werden. Titel, Branding, Grundlayout, Farbwelt und bestehende Statistiklogik sollen erhalten bleiben. Das Dashboard soll schrittweise zu einem Datenqualitaets-Monitor erweitert werden.

Kernziel:
Das Dashboard soll grosse Mengen touristischer Datensaetze nicht nur statistisch darstellen, sondern konkrete Datenqualitaetsprobleme sichtbar, filterbar, pruefbar und exportierbar machen.

Wichtigster Use Case:
Wenn ein Nutzer auf ein Qualitaetsproblem klickt, z. B. "Oeffnungszeiten fehlen", sollen sofort die betroffenen Datensaetze angezeigt werden - unter Beruecksichtigung der aktuell gesetzten Filter wie Gebiet, Ort, Typ und Kategorie. Diese gefilterte Fehlerliste muss als CSV exportierbar sein.

Zusaetzlicher KI-Use Case:
Ein Chatbot soll die jeweils aktuell gefilterte Dashboard-Ansicht analysieren koennen. Da das Dashboard auf GitHub Pages gehostet wird und keine eigene Serverinfrastruktur vorhanden ist, darf one.intelligence nicht direkt aus dem Browser mit Secrets angesprochen werden. Stattdessen wird ein n8n-Webhook als Middleware vorbereitet.

Arbeite abschnittsweise. Jeder Abschnitt ist ein eigener Codex-Auftrag. Erst fortfahren, wenn der vorherige Abschnitt stabil funktioniert.
```

# Abschnitt 1 - Projektanalyse und Plan

```text
Du bist Codex und arbeitest als Senior Frontend Engineer.

Aufgabe:
Analysiere zunaechst das bestehende SaTourN-Statistik-Dashboard.

Wichtig:
Noch keine grossen Aenderungen umsetzen. Erst verstehen und dokumentieren.

Bitte pruefe:
- Projektstruktur
- relevante HTML-Dateien
- relevante CSS-Dateien
- relevante JavaScript-Dateien
- bestehende Datenlade-Logik
- bestehende Filterlogik
- bestehende KPI-Berechnung
- bestehende Diagramm-/Tabellenlogik
- bestehenden CSV-Export

Kontext:
Das bestehende Dashboard zeigt bereits:
- Filter fuer Gebiet, Ort, Typ, Kategorie und Sortierung
- Buttons fuer "Alle Gebiete abfragen", "Ergebnisse suchen", "Abbrechen", "CSV Export"
- Fortschrittsanzeige
- KPI-Karten fuer SaTourN, Open-Data, Quote und Fehler
- Diagramme fuer Open-Data-Anteil und Quote nach Typ
- Ergebnistabelle

Ziel der spaeteren Weiterentwicklung:
Das Dashboard soll zu einem Datenqualitaets-Monitor erweitert werden. Es soll spaeter klickbare Qualitaetsprobleme wie "Oeffnungszeiten fehlen" anzeigen und daraus gefilterte Fehlerlisten mit CSV-Export erzeugen.

Bitte liefere am Ende:
- kurze Zusammenfassung der bestehenden Struktur
- Liste der relevanten Dateien
- Einschaetzung, wo Datennormalisierung ergaenzt werden sollte
- Einschaetzung, wo Qualitaetsauswertung ergaenzt werden sollte
- Einschaetzung, wo CSV-Export erweitert werden sollte
- Vorschlag fuer die naechste sinnvolle Aenderung

Noch nicht implementieren:
- keine neue UI
- keine Qualitaetskriterien
- keine neuen Exporte
- keine grossen Refactorings
```

# Abschnitt 2 - Zentrales Datenmodell und State ergaenzen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze eine zentrale Datenstruktur fuer den spaeteren Datenqualitaets-Monitor, ohne die bestehende Statistikfunktion zu beschaedigen.

Ziel:
Alle spaeteren Qualitaetsauswertungen sollen auf normalisierten Datensaetzen und einem zentralen Dashboard-State basieren.

Bitte ergaenze einen zentralen State, z. B.:

const dashboardState = {
  allItems: [],
  normalizedItems: [],
  filteredItems: [],
  activeFilters: {
    region: null,
    city: null,
    type: null,
    category: null,
    qualityStatus: null,
    criterionId: null,
    priority: null,
    autoCheck: null,
    search: ""
  },
  activeIssue: null,
  activeView: "overview",
  sortBy: "default",
  sortDirection: "asc"
};

Falls das Projekt bereits eine aehnliche Struktur hat, erweitere diese statt eine zweite parallele Struktur aufzubauen.

Erstelle ausserdem ein normalisiertes Datenmodell fuer einzelne Datensaetze:

{
  id: string | null,
  title: string,
  type: string,
  category: string | null,
  region: string | null,
  city: string | null,
  isOpenData: boolean | null,
  license: string | null,
  hasErrors: boolean,
  errors: string[],
  missingCriteria: string[],
  qualityScore: number | null,
  qualityStatus: "gut" | "pruefen" | "kritisch" | "nicht berechenbar",
  recommendations: string[],
  coordinates: { lat: number, lon: number } | null,
  imageCount: number | null,
  descriptionAvailable: boolean | null,
  openingHoursAvailable: boolean | null,
  bookingLinkAvailable: boolean | null,
  updatedAt: string | null,
  sourceUrl: string | null,
  raw: object
}

Implementiere oder ergaenze:
- normalizeItems(rawResponses)
- normalizeItem(rawItem, context)
- normalizeType(value)
- normalizeString(value)
- safeArray(value)

Wichtig:
- Fehlende Felder duerfen keine Fehler werfen.
- Leere JSON-Antworten muessen sauber verarbeitet werden.
- Originaldaten sollen unter raw erhalten bleiben.
- Bestehende Anzeige darf danach weiterhin funktionieren.
- Keine neue UI bauen.
- Keine Qualitaetskriterien implementieren.
- Noch keinen Score berechnen.

Akzeptanzkriterien:
- bestehendes Dashboard funktioniert weiterhin
- normalisierte Datensaetze werden erzeugt, wenn Daten vorhanden sind
- leere items-Arrays verursachen keine Fehler
- State enthaelt normalizedItems und filteredItems
- keine JavaScript-Fehler in der Konsole

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Erklaerung der Normalisierung
- Hinweis, wo die naechste Qualitaetslogik ergaenzt werden kann
```

# Abschnitt 3 - Qualitaetskriterien-Konfiguration ergaenzen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze eine zentrale Konfiguration fuer Qualitaetskriterien.

Wichtig:
Die Kriterien sollen nicht hart im HTML verstreut werden. Die spaetere UI soll aus dieser Konfiguration gerendert werden koennen.

Erstelle eine zentrale Struktur, z. B.:

const qualityCriteria = [
  {
    id: "opening_hours_missing",
    label: "Oeffnungszeiten fehlen",
    types: ["POI", "Gastro"],
    priority: "hoch",
    autoCheck: true,
    weight: 10,
    fields: ["openingHours", "opening_hours", "hours", "businessHours", "times"],
    recommendation: "Oeffnungszeiten ergaenzen oder aktualisieren.",
    check: item => !hasOpeningHours(item)
  },
  {
    id: "license_missing",
    label: "Lizenzangabe fehlt",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro", "Package"],
    priority: "hoch",
    autoCheck: true,
    weight: 10,
    fields: ["license", "licenses", "copyright", "openData"],
    recommendation: "Lizenzangabe ergaenzen oder Open-Data-Status pruefen.",
    check: item => !hasAnyValue(item, ["license", "licenses", "copyright", "openData"])
  },
  {
    id: "geo_missing",
    label: "Geokoordinaten fehlen",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro"],
    priority: "hoch",
    autoCheck: true,
    weight: 8,
    fields: ["geo", "coordinates", "location", "lat", "lon", "latitude", "longitude"],
    recommendation: "Geokoordinaten ergaenzen.",
    check: item => !hasGeoCoordinates(item)
  },
  {
    id: "description_missing",
    label: "Beschreibung fehlt",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro", "Package"],
    priority: "hoch",
    autoCheck: true,
    weight: 8,
    fields: ["description", "text", "shortDescription", "longDescription", "teaser"],
    recommendation: "Beschreibung oder Kurzbeschreibung ergaenzen.",
    check: item => !hasDescription(item)
  },
  {
    id: "image_missing",
    label: "Bild fehlt",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro", "Package"],
    priority: "mittel",
    autoCheck: true,
    weight: 6,
    fields: ["images", "media", "photos", "pictures"],
    recommendation: "Bildmaterial ergaenzen.",
    check: item => !hasImages(item)
  },
  {
    id: "image_author_missing",
    label: "Bildurheber fehlt",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro", "Package"],
    priority: "hoch",
    autoCheck: true,
    weight: 8,
    fields: ["images.author", "media.creator", "copyright", "photographer"],
    recommendation: "Fotograf oder Urheberhinweis ergaenzen.",
    check: item => hasImages(item) && !hasImageAuthor(item)
  },
  {
    id: "public_transport_missing",
    label: "OePNV-Anreise fehlt",
    types: ["POI", "Tour", "Event"],
    priority: "mittel",
    autoCheck: true,
    weight: 5,
    fields: ["publicTransport", "arrival", "directions", "mobility"],
    recommendation: "OePNV-Anreiseinformationen ergaenzen.",
    check: item => !hasAnyValue(item, ["publicTransport", "arrival", "directions", "mobility"])
  },
  {
    id: "booking_link_missing",
    label: "Buchungslink fehlt",
    types: ["Hotel", "Package", "Event"],
    priority: "hoch",
    autoCheck: true,
    weight: 8,
    fields: ["bookingUrl", "bookingLink", "reservationUrl", "ticketUrl"],
    recommendation: "Buchungs-, Reservierungs- oder Ticketlink ergaenzen.",
    check: item => !hasAnyValue(item, ["bookingUrl", "bookingLink", "reservationUrl", "ticketUrl"])
  },
  {
    id: "touristtrip_incomplete",
    label: "TouristTrip-Struktur unvollstaendig",
    types: ["Tour"],
    priority: "mittel",
    autoCheck: true,
    weight: 8,
    fields: ["name", "description", "touristType", "distance", "itinerary", "url"],
    recommendation: "Tour fuer schema.org TouristTrip strukturieren.",
    check: item => !isTouristTripReady(item)
  },
  {
    id: "manual_image_quality",
    label: "Bildqualitaet redaktionell pruefen",
    types: ["POI", "Tour", "Hotel", "Event", "Gastro"],
    priority: "mittel",
    autoCheck: false,
    weight: 0,
    fields: [],
    recommendation: "Bildqualitaet manuell pruefen.",
    note: "Dieses Kriterium ist nicht zuverlaessig automatisch aus JSON pruefbar."
  }
];

Passe die Implementierung an den vorhandenen Code-Stil an.

Ergaenze robuste Helper-Funktionen:
- getNestedValue(obj, path)
- hasAnyValue(item, fields)
- hasGeoCoordinates(item)
- hasDescription(item)
- hasImages(item)
- hasImageAuthor(item)
- hasOpeningHours(item)
- hasBookingLink(item)
- hasFutureEventDate(item)
- isTouristTripReady(item)
- getCriteriaForType(type)

Wichtig:
- Fehlende Felder duerfen keine Fehler verursachen.
- check-Funktionen muessen defensiv sein.
- autoCheck: false bedeutet: Kriterium anzeigen, aber nicht automatisch bewerten.
- Noch keine UI bauen.
- Noch keinen CSV-Export aendern.
- Bestehende Funktionen duerfen nicht beschaedigt werden.

Akzeptanzkriterien:
- qualityCriteria ist zentral verfuegbar
- Kriterien koennen nach Datentyp gefiltert werden
- Helper-Funktionen laufen ohne Fehler auf leeren Objekten
- bestehendes Dashboard funktioniert weiterhin

Am Ende bitte liefern:
- geaenderte Dateien
- Liste der angelegten Kriterien
- Hinweis, welche Kriterien automatisch pruefbar sind
- Hinweis, welche Kriterien nur manuell pruefbar sind
```

# Abschnitt 4 - Qualitaetsbewertung und Score berechnen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Implementiere die automatische Qualitaetsbewertung pro normalisiertem Datensatz auf Basis der bestehenden qualityCriteria-Konfiguration.

Voraussetzung:
Es gibt bereits:
- normalisierte Datensaetze
- dashboardState
- qualityCriteria
- Helper-Funktionen fuer Feldpruefungen

Implementiere:
- evaluateQualityForItem(item)
- evaluateAllItems(items)
- calculateQualityScore(item, criteriaResults)
- getQualityStatus(score)
- getMissingCriteria(item)
- getRecommendationsForItem(item)

Logik:
1. Ermittle relevante Kriterien anhand des Datentyps.
2. Fuehre nur Kriterien mit autoCheck: true automatisch aus.
3. Sammle fehlende Kriterien.
4. Sammle Empfehlungen.
5. Berechne einen Qualitaets-Score von 0 bis 100.
6. Weise einen Qualitaetsstatus zu.

Qualitaetsstatus:
- 80 bis 100: "gut"
- 60 bis 79: "pruefen"
- 0 bis 59: "kritisch"
- null: "nicht berechenbar"

Wichtig:
Nicht automatisch pruefbare Kriterien:
- nicht negativ in den Score einrechnen
- separat als manualCriteria oder nonAutoCriteria verfuegbar machen
- spaeter in der Detailansicht und Matrix darstellbar machen

Score-Logik:
- Nutze die Gewichte aus qualityCriteria.
- Nur automatisch pruefbare Kriterien mit Gewicht > 0 beruecksichtigen.
- Wenn keine relevanten automatisch pruefbaren Kriterien vorhanden sind, Score = null.
- Fehlende Pflicht-/Hoch-Prioritaet-Kriterien sollen staerker ins Gewicht fallen, wenn bereits ueber weight abgebildet.

Erweitere das normalisierte Item um:
- missingCriteria
- fulfilledCriteria
- manualCriteria
- qualityScore
- qualityStatus
- recommendations

Wichtig:
- Leere Daten duerfen keine Fehler verursachen.
- Bestehende Statistikwerte duerfen nicht kaputtgehen.
- Keine neue UI bauen.
- Noch keinen CSV-Export aendern.

Akzeptanzkriterien:
- jeder normalisierte Datensatz erhaelt qualityScore oder null
- jeder Datensatz erhaelt qualityStatus
- fehlende Kriterien werden als IDs gespeichert
- Empfehlungen werden aus den fehlenden Kriterien abgeleitet
- autoCheck:false-Kriterien werden separat gefuehrt
- keine JavaScript-Fehler bei leeren oder unvollstaendigen Daten

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Erklaerung der Score-Berechnung
- Beispiel, wie ein bewertetes Item intern aussieht
```

# Abschnitt 5 - Aggregationen fuer Qualitaetsuebersicht

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze Aggregationsfunktionen fuer den Datenqualitaets-Monitor.

Voraussetzung:
Es gibt bereits:
- normalisierte Datensaetze
- Qualitaetsbewertung pro Datensatz
- missingCriteria
- qualityScore
- qualityStatus
- qualityCriteria

Implementiere Aggregationsfunktionen:

1. Qualitaets-KPIs
- getAverageQualityScore(items)
- getQualityStatusCounts(items)
- getMostCommonMissingCriterion(items)
- getOpenDataCapableCount(items)
- getAutoCheckCriteriaCount()
- getManualCriteriaCount()

2. Problemcluster
- getIssueSummary(items)

Die Funktion soll je fehlendem Kriterium liefern:
{
  criterionId,
  label,
  affectedCount,
  affectedTypes,
  priority,
  autoCheck,
  recommendation
}

Sortierung:
- absteigend nach affectedCount
- bei Gleichstand Prioritaet hoch vor mittel vor niedrig

3. Kriterien-Matrix
- getCriteriaMatrix(items)

Je Zeile:
{
  type,
  criterionId,
  label,
  priority,
  autoCheck,
  fulfilledCount,
  missingCount,
  totalRelevantCount,
  quote,
  status,
  fields,
  recommendation,
  note
}

4. Datentyp-Uebersicht
- getTypeSummary(items)

Je Typ:
{
  type,
  totalCount,
  openDataCount,
  openDataRate,
  averageQualityScore,
  goodCount,
  checkCount,
  criticalCount,
  mostCommonMissingCriterion,
  nextRecommendedAction
}

Wichtig:
Alle Aggregationen muessen mit aktiven Filtern funktionieren. Sie sollen auf dashboardState.filteredItems oder einer uebergebenen Item-Liste basieren.

Statuslogik fuer Kriterien-Matrix:
- Quote >= 80 Prozent: "gut"
- Quote >= 60 Prozent: "pruefen"
- Quote < 60 Prozent: "kritisch"
- nicht berechenbar: "nicht verfuegbar"

Wichtig:
- Leere Arrays sauber behandeln.
- Division durch 0 vermeiden.
- Fehlende Kriterien-IDs sauber aufloesen.
- Nicht automatisch pruefbare Kriterien in Matrix auffuehren, aber als nicht automatisch pruefbar kennzeichnen.

Noch keine grosse UI bauen.
Falls noetig, nur kleine interne Testausgabe oder vorhandene Debug-Ausgabe verwenden, aber keine dauerhaften console.log-Ausgaben im finalen Zustand.

Akzeptanzkriterien:
- Qualitaets-KPIs koennen berechnet werden
- haeufigste Pflegebedarfe koennen berechnet werden
- Kriterien-Matrix kann berechnet werden
- Datentyp-Uebersicht kann berechnet werden
- alle Funktionen laufen mit leeren Daten ohne Fehler

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Erklaerung der Aggregationsfunktionen
- Hinweis, welche Funktion spaeter welche UI-Sektion speist
```

# Abschnitt 6 - Qualitaets-KPIs und Problemcluster in UI anzeigen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze die UI um Qualitaets-KPIs und eine klickbare Problemcluster-Sektion.

Bestehendes Dashboard:
Die bestehende Filter-, KPI-, Chart- und Tabellenstruktur soll erhalten bleiben.

Neu ergaenzen:

1. Qualitaets-KPI-Zeile
Direkt unter oder neben der bestehenden KPI-Zeile ergaenzen:
- Durchschnittlicher Qualitaets-Score
- Gut
- Pruefen
- Kritisch
- Nicht berechenbar
- haeufigstes fehlendes Kriterium

Darstellung:
- kompakte Karten wie bestehende KPI-Karten
- Status immer mit Textlabel, nicht nur Farbe
- leere Werte als "keine Daten" oder "-" darstellen

2. Sektion "Haeufigste Pflegebedarfe"
Erstelle eine Rangliste oder kompakte Tabelle mit:
- Kriterium
- Anzahl betroffener Datensaetze
- betroffene Datentypen
- Prioritaet
- empfohlene Aktion

Die Zeilen muessen klickbar sein.

Klickverhalten:
Wenn ein Nutzer auf ein Problem klickt:
- dashboardState.activeIssue auf criterionId setzen
- dashboardState.activeFilters.criterionId setzen
- aktive Filter fuer Gebiet, Ort, Typ und Kategorie beibehalten
- Fehlerlisten-Ansicht rendern oder vorbereiten
- angeklicktes Problem visuell markieren
- Statusmeldung aktualisieren

Beispiel:
Klick auf "Oeffnungszeiten fehlen" zeigt spaeter die Liste aller aktuell gefilterten Datensaetze, bei denen opening_hours_missing zutrifft.

Wichtig:
- Noch muss die Fehlerlisten-Tabelle nur vorbereitet oder einfach angezeigt werden.
- CSV-Export wird in einem spaeteren Schritt ergaenzt.
- Bestehende Ergebnisliste darf nicht beschaedigt werden.
- Bei leeren Daten soll die Sektion einen Empty State anzeigen.

Empty State:
"Fuer die aktuelle Auswahl wurden keine Qualitaetsprobleme gefunden."

Barrierefreiheit:
- klickbare Problemzeilen als button oder mit Tastaturbedienbarkeit
- sichtbarer Fokuszustand
- aria-live fuer Statusmeldung, falls vorhanden

Akzeptanzkriterien:
- Qualitaets-KPI-Zeile wird angezeigt
- haeufigste Pflegebedarfe werden angezeigt
- Klick auf ein Problem setzt activeIssue
- bestehende Filter bleiben aktiv
- leere Daten verursachen keine Fehler
- bestehende Statistikansicht funktioniert weiterhin

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der neuen UI
- Hinweis, wie ein Klick auf ein Qualitaetsproblem intern verarbeitet wird
```

# Abschnitt 7 - Fehlerlisten-Ansicht implementieren

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Implementiere die Fehlerlisten-Ansicht fuer angeklickte Qualitaetsprobleme.

Use Case:
Wenn der Nutzer auf ein Qualitaetsproblem klickt, z. B. "Oeffnungszeiten fehlen", sollen die konkret betroffenen Datensaetze angezeigt werden.

Beispiel:
Aktive Filter:
- Gebiet: Sachsen
- Ort: Dresden
- Typ: POI
- Kategorie: Museum

Nutzer klickt:
"Oeffnungszeiten fehlen"

Dann soll die Fehlerliste nur Datensaetze zeigen, die:
- Gebiet Sachsen erfuellen
- Ort Dresden erfuellen
- Typ POI erfuellen
- Kategorie Museum erfuellen
- und das Kriterium opening_hours_missing in missingCriteria enthalten

Implementiere:
- getItemsByMissingCriterion(items, criterionId)
- renderIssueList()
- clearActiveIssue()
- updateIssueListHeader()

Fehlerlisten-Tabelle:
Spalten:
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
- Link / URL, falls vorhanden

Darstellung:
- leere Werte als "-"
- Qualitaetsstatus immer als Textlabel anzeigen
- Open-Data als "Ja", "Nein" oder "Unbekannt"
- bei vielen Datensaetzen zumindest einfache Pagination oder Begrenzung mit Hinweis
- vorhandene Such- und Sortierlogik moeglichst wiederverwenden

Ueberschrift:
"Fehlerliste: {Kriterium}"

Unterzeile:
"{Anzahl} betroffene Datensaetze in der aktuellen Auswahl"

Wenn Filter aktiv sind, ergaenze sinngemaess:
"Filter: Gebiet Sachsen, Ort Dresden, Typ POI, Kategorie Museum"

Fuege eine Moeglichkeit hinzu, die aktive Fehlerliste zu schliessen oder zurueck zur Uebersicht zu gehen.

Wichtig:
- Bestehende Ergebnisliste darf weiterhin funktionieren.
- Die Fehlerliste soll zusaetzlich oder alternativ zur Ergebnisliste angezeigt werden, ohne den Rest des Dashboards zu beschaedigen.
- Aktive Filter muessen immer beruecksichtigt werden.
- Wenn Filter geaendert werden, muss die Fehlerliste neu berechnet werden.

Empty State:
Wenn keine betroffenen Datensaetze gefunden werden:
"Fuer das Kriterium '{Kriterium}' wurden in der aktuellen Auswahl keine betroffenen Datensaetze gefunden."

Akzeptanzkriterien:
- Klick auf Problem zeigt passende Fehlerliste
- Gebiet-/Ort-/Typ-/Kategorie-Filter werden beruecksichtigt
- Anzahl betroffener Datensaetze stimmt zur aktuellen Auswahl
- Fehlerliste kann geschlossen werden
- leere Treffer werden sauber angezeigt
- keine JavaScript-Fehler

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der Fehlerlistenlogik
- Beispiel, wie "Oeffnungszeiten fehlen" gefiltert wird
```

# Abschnitt 8 - Kriterien-Matrix und Datentyp-Uebersicht anzeigen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze zwei aggregierte Auswertungssektionen:
1. Datentyp-Uebersicht
2. Qualitaetskriterien-Matrix

Diese Ansichten sollen grosse Datenmengen verdichten und nicht jeden Datensatz einzeln anzeigen.

1. Datentyp-Uebersicht
Zeige eine Tabelle mit:
- Typ
- Datensaetze gesamt
- Open-Data-Anzahl
- Open-Data-Quote
- Durchschnittlicher Qualitaets-Score
- Gut
- Pruefen
- Kritisch
- haeufigstes fehlendes Kriterium
- naechste empfohlene Massnahme

Klickverhalten:
Wenn der Nutzer auf das haeufigste fehlende Kriterium klickt:
- aktives Kriterium setzen
- aktuelle Filter beibehalten
- Fehlerlisten-Ansicht oeffnen
- falls der Klick in einer Typ-Zeile erfolgt, zusaetzlich den Typ-Kontext beruecksichtigen

2. Qualitaetskriterien-Matrix
Zeige eine Matrix mit:
- Datentyp
- Kriterium
- Prioritaet
- automatisch pruefbar
- erfuellte Datensaetze
- nicht erfuellte Datensaetze
- Quote
- Status
- moegliche Datenfelder
- Hinweis
- empfohlene Aktion

Klickverhalten:
Wenn der Nutzer auf eine Matrix-Zeile klickt:
- oeffne die Fehlerliste fuer genau dieses Kriterium
- beruecksichtige den Datentyp der Matrix-Zeile
- beruecksichtige zusaetzlich alle aktiven Filter wie Gebiet, Ort und Kategorie

Beispiel:
Klick auf:
POI | Oeffnungszeiten fehlen

Dann zeigt die Fehlerliste:
- nur POI
- mit fehlenden Oeffnungszeiten
- zusaetzlich eingeschraenkt durch aktive Gebiet-/Ort-/Kategorie-Filter

Filter:
Die Matrix soll spaeter nach Datentyp, Prioritaet, Status und Pruefbarkeit filterbar sein. Falls zu aufwendig, implementiere zunaechst die Datenstruktur und eine einfache Darstellung.

Wichtig:
- Nicht automatisch pruefbare Kriterien ebenfalls anzeigen.
- Diese erhalten Status "nicht automatisch pruefbar" oder "nicht verfuegbar".
- Keine riesigen DOM-Strukturen erzeugen.
- Bei leeren Daten trotzdem Kriterienrahmen anzeigen, wenn qualityCriteria vorhanden ist.

Akzeptanzkriterien:
- Datentyp-Uebersicht wird angezeigt
- Kriterien-Matrix wird angezeigt
- Klick auf Matrix-Zeile oeffnet passende Fehlerliste
- aktive Filter bleiben wirksam
- leere Daten verursachen keine Fehler

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der Datentyp-Uebersicht
- kurze Beschreibung der Kriterien-Matrix
- Hinweis, wie Matrix-Klicks in Fehlerlisten uebergehen
```

# Abschnitt 9 - Kontextsensitiven CSV-Export ergaenzen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Erweitere den bestehenden CSV-Export kontextsensitiv.

Ziel:
Der CSV-Button soll immer die aktuell relevante Ansicht exportieren.

Exportlogik:
Wenn keine Fehlerliste aktiv ist:
- Exportiere die normale aktuelle Ergebnisansicht wie bisher.
- Bestehende CSV-Funktionalitaet erhalten.

Wenn eine Fehlerliste aktiv ist:
- Exportiere genau die aktuell gefilterte Fehlerliste.
- Beruecksichtige alle aktiven Filter:
  - Gebiet
  - Ort
  - Typ
  - Kategorie
  - Suchbegriff
  - Sortierung
  - aktives Qualitaetskriterium
- Exportiere nicht alle Daten, sondern nur die sichtbare bzw. aktuell aktive Fehlerliste.

Wenn eine Kriterien-Matrix aktiv ist und kein Issue aktiv ist:
- optional Matrix exportieren
- falls zu aufwendig, normale Ergebnisansicht exportieren und spaeter TODO markieren

Implementiere eine zentrale Funktion:
exportCurrentViewToCSV()

Diese soll intern entscheiden:
- buildCsvRowsForResults(items)
- buildCsvRowsForIssueList(items, criterion)
- buildCsvRowsForCriteriaMatrix(matrixRows), optional
- downloadCsv(filename, rows)

CSV-Spalten fuer Fehlerlisten:
- ID
- Titel
- Typ
- Gebiet
- Ort
- Kategorie
- Fehlendes Kriterium
- Kriterium-ID
- Prioritaet
- Automatisch pruefbar
- Qualitaets-Score
- Qualitaetsstatus
- Open-Data
- Lizenz
- Fehlende Felder
- Empfohlene Aktion
- Letzte Aktualisierung
- URL
- Quelle / Datensatztyp

Dateinamen:
Wenn normale Ansicht:
satourn_export.csv

Wenn Fehlerliste aktiv:
satourn_fehlerliste_{kriterium}.csv

Wenn Filter aktiv, Dateiname ergaenzen:
satourn_fehlerliste_oeffnungszeiten-fehlen_sachsen_poi.csv

Dateinamen muessen sicher sein:
- Kleinbuchstaben
- Umlaute ersetzen
- Leerzeichen durch Bindestriche
- Sonderzeichen entfernen

CSV-Regeln:
- UTF-8
- Semikolon als Trenner
- Werte korrekt escapen
- Anfuehrungszeichen verdoppeln
- Zeilenumbrueche ersetzen
- null/undefined als leeres Feld oder "-"
- Boolean-Werte als "Ja", "Nein" oder "Unbekannt"

Wichtig:
- Bestehenden CSV-Export nicht kaputtmachen.
- Wenn keine exportierbaren Daten vorhanden sind, Hinweis anzeigen oder Button deaktivieren.
- Aktive Fehlerliste muss exakt dem Export entsprechen.

Akzeptanzkriterien:
- normale Ergebnisansicht kann weiterhin exportiert werden
- aktive Fehlerliste kann exportiert werden
- Export enthaelt nur aktuell gefilterte Fehlerlisten-Datensaetze
- CSV enthaelt Kriterium, Empfehlung und relevante Metadaten
- Dateiname enthaelt bei Fehlerlisten das aktive Kriterium
- CSV ist korrekt escaped
- keine JavaScript-Fehler

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der Exportlogik
- Beispiel-Dateiname fuer "Oeffnungszeiten fehlen"
```

# Abschnitt 10 - KI-Chatbot ueber n8n-Webhook

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Integriere einen KI-Chatbot in das Dashboard. Der Chatbot soll die aktuell gefilterte Dashboard-Ansicht analysieren koennen.

Wichtig:
Das Dashboard wird ueber GitHub Pages gehostet. Es gibt keine eigene Serverinfrastruktur. Deshalb darf das Dashboard one.intelligence nicht direkt aus dem Browser aufrufen, wenn dafuer API-Keys, Tokens oder andere Zugangsdaten notwendig sind.

Stattdessen soll ein n8n-Webhook als Middleware verwendet werden.

Zielarchitektur:

GitHub Pages Dashboard
-> sendet gefilterten Analysekontext an n8n Webhook
-> n8n verarbeitet und validiert die Anfrage
-> n8n ruft one.intelligence auf
-> n8n gibt die KI-Antwort an das Dashboard zurueck
-> Dashboard zeigt die Antwort im Chatbot an

Grundsatz:
Keine one.intelligence-Zugangsdaten im Frontend.
Keine API-Keys im JavaScript.
Keine Secrets im Repository.
Keine direkte KI-Anbindung aus GitHub Pages, wenn Authentifizierung erforderlich ist.

Der Browser darf nur den n8n-Webhook aufrufen.

KI-Use Case:
Der Nutzer soll Fragen zur aktuell gefilterten Dashboard-Ansicht stellen koennen.

Beispiele:
- "Fasse die aktuelle Auswahl zusammen."
- "Welche Qualitaetsprobleme treten im aktuellen Filter am haeufigsten auf?"
- "Welche POIs in Dresden haben fehlende Oeffnungszeiten?"
- "Welche Datentypen haben die schlechteste Open-Data-Quote?"
- "Welche Pflegeaufgaben sollte ich zuerst angehen?"
- "Welche Datensaetze sind kritisch und warum?"
- "Welche Kriterien verhindern aktuell Open-Data-Faehigkeit?"
- "Fasse die aktuelle Fehlerliste zusammen."
- "Welche Fehlerliste sollte ich als erstes exportieren?"

Der Chatbot muss immer die aktuelle Dashboard-Situation beruecksichtigen:
- aktive Filter
- aktuell gefilterte Datensaetze
- aktive Fehlerliste, falls vorhanden
- aktuell ausgewaehltes Qualitaetskriterium
- Qualitaets-KPIs
- haeufigste Pflegebedarfe
- Datentyp-Uebersicht
- Kriterien-Matrix, moeglichst zusammengefasst
- aktuell sichtbare Ergebnisliste oder Fehlerliste
- ausgewaehlter Datensatz, falls Detailansicht geoeffnet ist

Wichtig:
Der Chatbot soll nicht alle Rohdaten ungefiltert an n8n senden. Bei grossen Datenmengen muss der Kontext reduziert werden.

Implementiere dafuer eine zentrale Kontext-Funktion:

buildAiContext()

Diese Funktion soll einen kompakten Analysekontext erzeugen.

Der Kontext soll enthalten:
- Dashboard-Name
- aktive Ansicht
- aktive Filter
- aktive Fehlerliste
- aktive Kriterium-ID
- zusammengefasste KPIs
- Qualitaets-KPIs
- Top-Probleme
- Typ-Zusammenfassung
- Matrix-Zusammenfassung
- sichtbare Datensaetze als begrenztes Sample
- Hinweis, ob die Datensatzliste gekuerzt wurde

Beispielstruktur:

{
  dashboard: "SaTourN-Statistik / Datenqualitaets-Monitor",
  activeView: "issueList",
  activeFilters: {
    region: "Sachsen",
    city: "Dresden",
    type: "POI",
    category: "Museum",
    qualityStatus: null,
    criterionId: "opening_hours_missing",
    search: ""
  },
  activeIssue: {
    id: "opening_hours_missing",
    label: "Oeffnungszeiten fehlen",
    priority: "hoch",
    recommendation: "Oeffnungszeiten ergaenzen oder aktualisieren."
  },
  summary: {
    totalItems: 128,
    averageQualityScore: 64,
    openDataRate: 0.236,
    goodCount: 24,
    checkCount: 81,
    criticalCount: 23
  },
  topIssues: [
    {
      criterionId: "opening_hours_missing",
      label: "Oeffnungszeiten fehlen",
      affectedCount: 128,
      priority: "hoch",
      recommendation: "Oeffnungszeiten ergaenzen oder aktualisieren."
    }
  ],
  typeSummary: [
    {
      type: "POI",
      totalCount: 128,
      averageQualityScore: 64,
      mostCommonMissingCriterion: "Oeffnungszeiten fehlen",
      nextRecommendedAction: "Oeffnungszeiten ergaenzen oder aktualisieren."
    }
  ],
  visibleItemsSample: [
    {
      id: "...",
      title: "...",
      type: "POI",
      region: "Sachsen",
      city: "Dresden",
      category: "Museum",
      qualityScore: 58,
      qualityStatus: "kritisch",
      missingCriteria: ["opening_hours_missing", "license_missing"],
      recommendations: [
        "Oeffnungszeiten ergaenzen oder aktualisieren.",
        "Lizenzangabe ergaenzen oder Open-Data-Status pruefen."
      ],
      sourceUrl: "..."
    }
  ],
  dataLimit: {
    totalMatchingItems: 128,
    sampleSize: 50,
    truncated: true
  }
}

Zusaetzliche Helper-Funktionen:
- buildAiContext()
- buildAiSummaryContext()
- buildAiIssueListContext()
- buildAiDetailContext()
- limitItemsForAi(items, maxItems)
- reduceItemForAi(item)
- getActiveFilterDescription()
- getActiveIssueForAi()
- getVisibleItemsForAi()
- askN8nAiWebhook(userMessage, context)

Datenmengenbegrenzung:
- Standardmaessig maximal 50 Datensaetze als Sample senden.
- Keine vollstaendigen raw-Daten senden.
- Keine kompletten JSON-Rohantworten senden.
- Keine Bilddaten oder Binaerdaten senden.
- Keine unnoetigen personenbezogenen Daten senden.
- Wenn mehr Datensaetze betroffen sind, nur Gesamtanzahl, Aggregationen und Beispiel-Datensaetze senden.
- Das Sample soll aus der aktuell gefilterten Ansicht oder aktiven Fehlerliste stammen.

n8n-Webhook:
Implementiere eine zentrale Funktion:

async function askN8nAiWebhook(userMessage, context) {
  // Ruft den konfigurierten n8n-Webhook auf.
}

Die Webhook-URL darf nicht hart im Code verteilt sein.
Lege eine zentrale Konfiguration an, z. B.:

const AI_CHAT_CONFIG = {
  enabled: true,
  webhookUrl: "",
  authHeaderName: "",
  authHeaderValue: "",
  maxItemsForContext: 50,
  timeoutMs: 30000,
  mockMode: true
};

Wichtig:
- webhookUrl darf als Platzhalter leer bleiben.
- Falls keine Webhook-URL konfiguriert ist, muss der Chatbot in den Mock-Modus fallen.
- Keine echten Secrets in AI_CHAT_CONFIG speichern.
- Wenn Authentifizierung noetig ist, nur oeffentliche, unkritische Werte im Frontend verwenden.
- Sensible Authentifizierung soll in n8n oder einem sicheren Backend erfolgen.
- Falls Header-Auth im Frontend genutzt wird, klar als eingeschraenkt sicher markieren, weil sichtbarer Browser-Code.
- Besser: n8n-Webhook mit CORS-Einschraenkung, Rate-Limit und zusaetzlicher serverseitiger Pruefung absichern.

Request an n8n:
Das Dashboard soll an n8n ein JSON senden:

{
  message: "Nutzerfrage",
  context: { ...aktueller Dashboard-Kontext... },
  meta: {
    source: "satourn-dashboard",
    version: "1",
    timestamp: "ISO-Datum",
    pageUrl: "aktuelle URL"
  }
}

n8n soll spaeter daraus one.intelligence aufrufen.

Erwartete Antwort von n8n:
Das Dashboard soll eine strukturierte Antwort erwarten:

{
  answer: "Textantwort der KI",
  suggestions: [
    "Naechste sinnvolle Aktion",
    "Weitere Analysefrage"
  ],
  warnings: [
    "Hinweis, falls Daten gekuerzt wurden"
  ]
}

Falls n8n nur Text zurueckgibt, soll das Dashboard diesen Text ebenfalls anzeigen koennen.

Systemprompt fuer n8n / one.intelligence:
Dokumentiere im Code oder als Kommentar den empfohlenen Systemprompt, der in n8n verwendet werden soll:

"Du bist ein Datenqualitaets-Assistent fuer den SaTourN-Datenqualitaets-Monitor. Analysiere ausschliesslich den bereitgestellten Dashboard-Kontext. Beziehe dich auf die aktuell gefilterte Ansicht, aktive Fehlerlisten und aggregierte Kennzahlen. Erfinde keine Daten, die nicht im Kontext enthalten sind. Wenn Informationen fehlen, sage klar, dass sie in der aktuellen Ansicht oder im bereitgestellten Kontext nicht verfuegbar sind. Gib konkrete, priorisierte Empfehlungen zur Datenpflege. Antworte knapp, fachlich und handlungsorientiert."

Chatbot-UI:
Ergaenze einen Chatbot-Bereich im Dashboard.

Bevorzugte Darstellung:
- Button unten rechts oder im Dashboard-Kopfbereich
- oeffnet ein einklappbares Seitenpanel
- Panel kann geschlossen werden
- Panel bleibt im Dashboard-Kontext

Das Panel enthaelt:
- Hinweis zur aktuellen Datenbasis
- Chatverlauf
- Eingabefeld
- Senden-Button
- Ladezustand
- Fehlerzustand
- Prompt-Chips fuer Schnellfragen

Hinweistext im Chat:
Wenn keine Fehlerliste aktiv ist:
"Die KI analysiert die aktuell gefilterte Dashboard-Ansicht."

Wenn eine Fehlerliste aktiv ist:
"Die KI analysiert aktuell die Fehlerliste: {Kriterium}."

Wenn keine Daten vorhanden sind:
"Fuer die aktuelle Ansicht liegen keine auswertbaren Daten vor."

Prompt-Chips:
Ergaenze klickbare Schnellfragen:
- "Aktuelle Auswahl zusammenfassen"
- "Haeufigste Probleme erklaeren"
- "Prioritaeten fuer Datenpflege vorschlagen"
- "Open-Data-Potenzial bewerten"
- "Fehlerliste zusammenfassen"
- "CSV-Export empfehlen"

Klick auf einen Prompt-Chip:
- uebernimmt die Frage in das Eingabefeld
oder
- sendet sie direkt ab

Mock-Modus:
Wenn keine n8n-Webhook-URL konfiguriert ist, muss der Chatbot trotzdem testbar sein.

Mock-Antwort:
"Mock-Antwort: In der aktuellen Auswahl wurden {n} Datensaetze gefunden. Das haeufigste Qualitaetsproblem ist {x}. Fuer echte KI-Antworten muss der n8n-Webhook konfiguriert werden."

Der Mock-Modus soll:
- aktive Filter beruecksichtigen
- aktive Fehlerliste beruecksichtigen
- Anzahl Datensaetze anzeigen
- haeufigstes Problem nennen, falls vorhanden
- keine externe Anfrage senden

Fehlerbehandlung:
Zeige verstaendliche Fehlermeldungen:
- "Der KI-Dienst ist aktuell nicht erreichbar."
- "Der n8n-Webhook ist noch nicht konfiguriert."
- "Fuer diese Ansicht liegen keine auswertbaren Daten vor."
- "Die Anfrage konnte nicht verarbeitet werden."
- "Zeitueberschreitung bei der KI-Anfrage."

Technische Anforderungen:
- fetch mit Timeout verwenden
- JSON-Request sauber serialisieren
- Response defensiv parsen
- Netzwerkfehler abfangen
- Ladezustand im UI anzeigen
- Senden-Button waehrend Anfrage deaktivieren
- leere Eingaben nicht absenden
- Chatverlauf lokal im State halten
- keine dauerhaften console.log-Ausgaben

Sicherheitsanforderungen:
- Keine one.intelligence-Keys im Frontend.
- Keine n8n-Credentials ins Repository committen.
- Keine vollstaendigen Rohdaten senden.
- Kontext vor dem Senden reduzieren.
- Nur aktuelle, gefilterte Daten senden.
- CORS in n8n auf die GitHub-Pages-Domain beschraenken.
- n8n-Webhook mit Authentifizierung, Rate-Limit oder anderer Schutzlogik absichern.
- Production-Webhook verwenden, nicht Test-Webhook.
- Fehlerdetails nicht ungefiltert im UI anzeigen.

Hinweis fuer n8n-Workflow:
Dokumentiere im Code oder in einer kurzen README/TODO:
Der n8n-Workflow sollte ungefaehr so aufgebaut sein:
1. Webhook Trigger
2. Payload validieren
3. optional Auth pruefen
4. Kontextgroesse pruefen und ggf. kuerzen
5. Systemprompt + Nutzerfrage + Dashboard-Kontext zusammensetzen
6. one.intelligence aufrufen
7. Antwort normalisieren
8. JSON an Dashboard zurueckgeben

Barrierefreiheit:
- Chatbot-Button ist per Tastatur erreichbar
- Panel hat sinnvollen Titel
- Eingabefeld hat Label
- Nachrichtenbereich nutzt aria-live
- Ladezustand ist textlich sichtbar
- Fokus beim Oeffnen ins Panel setzen
- Panel per Button schliessen koennen

Akzeptanzkriterien:
- Chatbot-Panel kann geoeffnet und geschlossen werden.
- Nutzer kann eine Frage eingeben.
- Prompt-Chips funktionieren.
- buildAiContext() beruecksichtigt aktive Filter.
- Aktive Fehlerliste wird im KI-Kontext beruecksichtigt.
- Aggregierte Qualitaetsdaten werden an den Kontext uebergeben.
- Es werden keine vollstaendigen raw-Daten standardmaessig gesendet.
- Mock-Modus funktioniert ohne Webhook-URL.
- Bei konfigurierter Webhook-URL wird n8n per fetch aufgerufen.
- Antwort von n8n wird im Chat angezeigt.
- Fehler werden verstaendlich angezeigt.
- Bestehende Dashboard-Funktionen bleiben erhalten.
- Keine JavaScript-Fehler in der Konsole.

Testanleitung:
1. Dashboard oeffnen.
2. Daten laden.
3. Filter setzen, z. B. Gebiet, Ort, Typ und Kategorie.
4. Auf ein Qualitaetsproblem klicken, z. B. "Oeffnungszeiten fehlen".
5. Chatbot oeffnen.
6. Frage stellen: "Fasse die aktuelle Fehlerliste zusammen."
7. Pruefen, ob die Antwort auf die aktuelle gefilterte Ansicht Bezug nimmt.
8. Webhook-URL leer lassen und Mock-Modus pruefen.
9. Webhook-URL konfigurieren und n8n-Antwort pruefen.
10. CSV-Export und bestehende Dashboard-Funktionen erneut testen.

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der Chatbot-Integration
- Hinweis, ob Mock-Modus oder echter n8n-Webhook aktiv ist
- Beschreibung des gesendeten KI-Kontexts
- Hinweise zur n8n-Konfiguration
- offene TODOs fuer one.intelligence-Anbindung in n8n
```

# Abschnitt 11 - Detailansicht pro Datensatz

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Ergaenze eine Detailansicht pro Datensatz.

Use Case:
Der Nutzer sieht in der Fehlerliste einen betroffenen Datensatz und moechte pruefen, warum dieser Datensatz als fehlerhaft gilt.

Beim Klick auf eine Tabellenzeile in der Ergebnisliste oder Fehlerliste soll eine Detailansicht geoeffnet werden.

Umsetzung:
Bevorzugt:
- Seitenpanel
oder
- aufklappbare Tabellenzeile

Nicht bevorzugt:
- komplette neue Seite

Detailansicht zeigt:
- Titel
- ID
- Typ
- Gebiet
- Ort
- Kategorie
- Open-Data-Status
- Lizenz
- Qualitaets-Score
- Qualitaetsstatus
- erfuellte Kriterien
- fehlende Kriterien
- manuell zu pruefende Kriterien
- empfohlene Massnahmen
- verwendete Datenfelder
- URL / Link zum Datensatz, falls vorhanden
- Rohdaten optional einklappbar

Fuer jedes fehlende Kriterium anzeigen:
- Label
- Prioritaet
- automatisch pruefbar
- vermutete Datenfelder
- Empfehlung

Fuer manuelle Kriterien anzeigen:
- Label
- Prioritaet
- Hinweis, warum nicht automatisch pruefbar
- Empfehlung

Wichtig:
- Rohdaten nicht standardmaessig komplett offen anzeigen.
- Detailansicht muss geschlossen werden koennen.
- Tastaturbedienbarkeit beachten.
- Fehlende Werte als "-" anzeigen.
- Keine JavaScript-Fehler bei fehlenden Feldern.

Akzeptanzkriterien:
- Klick auf Datensatz oeffnet Detailansicht
- fehlende Kriterien werden verstaendlich angezeigt
- Empfehlungen werden angezeigt
- Detailansicht kann geschlossen werden
- aktive Fehlerliste bleibt im Hintergrund erhalten
- bestehende Tabellenfunktion bleibt erhalten

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der Detailansicht
- Hinweis, wie fehlende Kriterien im Detail erklaert werden
```

# Abschnitt 12 - Filter, Empty States und Robustheit

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Verbessere Filterverhalten, Empty States und Robustheit des Datenqualitaets-Monitors.

Filterlogik:
Alle aktiven Filter muessen auf alle Qualitaetsansichten wirken:
- KPIs
- Qualitaets-KPIs
- Problemcluster
- Datentyp-Uebersicht
- Kriterien-Matrix
- Ergebnisliste
- Fehlerliste
- CSV-Export
- KI-Kontext fuer den Chatbot

Aktive Filter:
- Gebiet
- Ort
- Typ
- Kategorie
- Suche
- Sortierung
- Qualitaetsstatus, falls vorhanden
- aktives fehlendes Kriterium
- Prioritaet, falls vorhanden
- Pruefbarkeit, falls vorhanden

Wenn Filter geaendert werden:
- dashboardState.activeFilters aktualisieren
- filteredItems neu berechnen
- Qualitaetsaggregationen neu berechnen
- aktive Fehlerliste aktualisieren, falls activeIssue gesetzt ist
- KI-Kontext spaeter aus der neuen Ansicht bauen
- Empty State anzeigen, falls keine Treffer

Empty States:
Implementiere oder verbessere folgende Zustaende:

1. Noch keine Abfrage gestartet:
"Noch keine Abfrage gestartet."

2. Daten werden geladen:
"Daten werden geladen ..."

3. Keine Ergebnisse:
"Fuer die aktuelle Auswahl wurden keine Datensaetze gefunden."

4. Fehlerliste ohne Treffer:
"Fuer das Kriterium '{Kriterium}' wurden in der aktuellen Auswahl keine betroffenen Datensaetze gefunden."

5. Leere JSON-Antwort:
"Die Abfrage war erfolgreich, enthielt aber keine auswertbaren Datensaetze."

6. Nicht automatisch pruefbares Kriterium:
"Dieses Kriterium kann aus den verfuegbaren JSON-Daten nicht automatisch geprueft werden."

7. CSV ohne Daten:
"Fuer die aktuelle Ansicht liegen keine exportierbaren Daten vor."

8. KI ohne Daten:
"Fuer die aktuelle Ansicht liegen keine auswertbaren Daten fuer die KI-Analyse vor."

Robustheit:
- Fehlende Felder duerfen keine Fehler verursachen.
- Leere Arrays sauber behandeln.
- Division durch 0 vermeiden.
- Unbekannte Typen als "Unbekannt" behandeln.
- Null/undefined sauber darstellen.
- Keine dauerhaften console.log-Ausgaben.

Performance:
- Suchfeld wenn moeglich debouncen.
- Grosse Tabellen paginieren oder begrenzen.
- Rohdaten nur bei Bedarf rendern.
- Aggregationen nicht unnoetig mehrfach berechnen.
- KI-Kontext begrenzen und nicht mit kompletten Rohdaten befuellen.

Akzeptanzkriterien:
- Filter wirken konsistent
- Fehlerliste aktualisiert sich bei Filteraenderungen
- KI-Kontext bezieht sich auf die aktuelle Filteransicht
- Empty States erscheinen korrekt
- leere JSONs verursachen keine Fehler
- CSV ohne Daten wird sauber behandelt
- keine JavaScript-Fehler

Am Ende bitte liefern:
- geaenderte Dateien
- kurze Beschreibung der verbesserten Filterlogik
- Liste der implementierten Empty States
```

# Abschnitt 13 - Finale Pruefung und Aufraeumen

```text
Du bist Codex und arbeitest im bestehenden SaTourN-Statistik-Dashboard.

Aufgabe:
Fuehre eine finale Pruefung und Bereinigung der Datenqualitaets-Monitor-Erweiterung durch.

Bitte pruefe:
- bestehendes Dashboard funktioniert weiterhin
- Filter funktionieren
- Suche funktioniert
- Sortierung funktioniert
- bestehende KPI-Karten funktionieren
- bestehende Diagramme funktionieren
- bestehender CSV-Export funktioniert
- neue Qualitaets-KPIs funktionieren
- haeufigste Pflegebedarfe werden angezeigt
- Klick auf Qualitaetsproblem oeffnet Fehlerliste
- Fehlerliste beruecksichtigt Gebiet/Ort/Typ/Kategorie
- CSV-Export der Fehlerliste funktioniert
- Kriterien-Matrix funktioniert
- Datentyp-Uebersicht funktioniert
- Detailansicht funktioniert
- KI-Chatbot-Panel funktioniert
- Mock-Modus fuer KI funktioniert ohne Webhook-URL
- n8n-Webhook-Aufruf ist vorbereitet
- KI-Kontext beruecksichtigt aktive Filter und aktive Fehlerliste
- Empty States funktionieren
- leere JSON-Antworten verursachen keine Fehler
- keine JavaScript-Fehler in der Konsole
- Layout ist responsive
- Fokuszustaende und Tastaturbedienung sind akzeptabel

Aufraeumen:
- unnoetige console.log-Ausgaben entfernen
- tote Codebloecke entfernen
- doppelte Funktionen vermeiden
- Kommentare nur dort lassen, wo sie helfen
- Dateinamen, Funktionsnamen und State-Namen konsistent halten
- keine Secrets oder Tokens im Code
- keine API-Keys im Repository

Bitte keine grossen neuen Features mehr ergaenzen.
Nur stabilisieren, vereinheitlichen und dokumentieren.

Am Ende bitte liefern:
- Zusammenfassung der Aenderungen
- Liste der geaenderten Dateien
- automatisch pruefbare Kriterien
- manuell/nicht automatisch pruefbare Kriterien
- kurze Testanleitung

Testanleitung soll enthalten:
1. Dashboard oeffnen
2. Abfrage starten
3. Gebiet/Ort/Typ/Kategorie filtern
4. auf "Oeffnungszeiten fehlen" klicken
5. Fehlerliste pruefen
6. CSV exportieren
7. Datensatzdetail oeffnen
8. Chatbot oeffnen
9. Frage stellen: "Fasse die aktuelle Fehlerliste zusammen."
10. pruefen, ob die KI-Antwort die aktive Fehlerliste und Filter beruecksichtigt
11. Filter aendern und pruefen, ob Fehlerliste und KI-Kontext aktualisiert werden
12. leere Datenantwort testen
```

# Empfohlene Reihenfolge

```text
1. Projektanalyse
2. Datenmodell + State
3. Qualitaetskriterien
4. Qualitaetsbewertung
5. Aggregationen
6. Qualitaets-KPIs + Problemcluster
7. Fehlerlisten
8. Matrix + Datentyp-Uebersicht
9. CSV-Export
10. KI-Chatbot ueber n8n-Webhook
11. Detailansicht
12. Empty States + Robustheit
13. Finale Pruefung

Hinweis:
Die wichtigsten Abschnitte fuer den Kern-Use-Case sind Abschnitt 7 und Abschnitt 9: klickbare Fehlerlisten und CSV-Export der aktiven Fehlerliste.

Die wichtigsten Abschnitte fuer den KI-Use-Case sind Abschnitt 10 und Abschnitt 12: kompakter KI-Kontext aus der aktuellen Filteransicht und saubere Aktualisierung bei Filteraenderungen.
```

Quellenhinweis: Die Architekturannahme basiert darauf, dass GitHub Pages statische HTML-, CSS- und JavaScript-Dateien aus einem Repository veroeffentlicht und n8n Webhooks als Workflow-Einstiegspunkt dienen koennen. Details sollten bei der finalen technischen Umsetzung erneut gegen die aktuelle Dokumentation geprueft werden.
