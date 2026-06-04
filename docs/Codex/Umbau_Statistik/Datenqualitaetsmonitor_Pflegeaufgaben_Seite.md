# Codex-Arbeitsdatei: Pflegeaufgaben-Seite im SaTourN Datenqualitäts-Monitor

## 1. Ziel der Seite

Erstelle bzw. überarbeite die Seite **„Pflegeaufgaben“** als ruhige, handlungsorientierte Arbeitsseite für Datenpflege.

Die Seite soll nicht wie ein Mockup wirken, sondern mit echten Daten, echten Zahlen und funktionierenden API-Abfragen arbeiten.

Ziel der Seite:

- Datenanalysten sollen schnell erkennen, welche Pflegeaufgaben aktuell relevant sind.
- Jede Zahl muss aus der echten Datenbasis oder einem transparent gekennzeichneten Sample stammen.
- Jede Aufgabe soll zu konkreten Datensätzen führen.
- Die Seite soll API-schonend funktionieren.
- Die Oberfläche soll dem hellen, ruhigen Design der neuen Startseite folgen.
- Keine fiktiven Verantwortlichkeiten, Fälligkeitsdaten oder Bearbeitungszeiten anzeigen.

---

## 2. Visuelle Orientierung

Nutze das helle, reduzierte Design der neuen Startseite als verbindliche Designrichtung.

Gestaltungsprinzipien:

- heller Hintergrund
- linke, ruhige Seitenleiste
- oben ein klarer Header mit Arbeitskontext
- weiße Karten mit feinen Rahmen
- dezente Schatten
- klare Typografie
- wenige Farben
- keine dunkle Dashboard-Optik
- keine überladenen Tabellen
- keine unnötigen Status-Badges
- kritische Farben sparsam einsetzen

Die Seite soll optisch wie ein natürlicher Teil der neuen Startseite wirken.

---

## 3. Hauptnavigation

Die Hauptnavigation bleibt reduziert:

- Übersicht
- Pflegeaufgaben
- Datensätze
- Statistik

**„Pflegeaufgaben“** ist auf dieser Seite aktiv markiert.

Nicht als eigene Hauptnavigation anzeigen:

- Kriterien-Matrix
- Ergebnisse
- KI-Analyse
- Export
- Einstellungen
- Datentypen

Diese Funktionen dürfen nur kontextuell erscheinen, wenn sie wirklich benötigt werden.

---

## 4. Header und Arbeitskontext

Oben im Header anzeigen:

- SaTourN Datenqualitäts-Monitor
- Arbeitskontext
- Button **„Ändern“**
- letzte Aktualisierung
- dezenter Aktualisieren-Button

Beispiel:

```text
Arbeitskontext: Dresden Elbland · Alle Orte · Alle Datentypen
```

Der Arbeitskontext darf lokal gespeichert werden, aber nur mit kleinen UI-Werten:

- Gebiet / Destination
- Ort
- Datentyp

Nicht lokal speichern:

- API-Antworten
- vollständige Fehlerlisten
- Rohdaten
- KI-Kontexte
- Secrets

---

## 5. Keine Mockdaten

Auf der Pflegeaufgaben-Seite dürfen keine Mockdaten, statischen Beispielzahlen oder hart codierten Aufgaben erscheinen.

Alle sichtbaren Werte müssen aus einer der folgenden Quellen stammen:

- bestehende Statistik-Requests über `/api/search`
- normalisierte Items aus dem bestehenden Datenfluss
- Qualitätsaggregationen aus `quality.js`
- budgetierte, paginierte Server-Scans über `/api/quality/scan`
- klar gekennzeichnete Samples, falls keine vollständige Datenbasis vorliegt

Wenn keine Daten geladen wurden, zeige einen ruhigen Empty State.

Beispiel:

```text
Noch keine Pflegeaufgaben geladen.
Wähle einen Arbeitskontext und starte die Abfrage.
```

Keine Beispielaufgaben als Platzhalter anzeigen.

---

## 6. API-schonende Datenlogik

Die Seite darf nicht automatisch alle Qualitätsdaten vollständig laden.

Grundregeln:

- Beim Seitenaufruf nur den aktuellen Arbeitskontext lesen.
- Keine Vollscans im Hintergrund starten.
- Pflegeaufgaben zunächst aus vorhandenen Aggregationen und begrenzten Samples ableiten.
- Nur wenn Nutzer eine konkrete Aufgabe öffnet und Typ + Kriterium eindeutig sind, `/api/quality/scan` verwenden.
- Große Fehlerlisten paginiert laden.
- Keine generischen Negativqueries erzeugen.
- API-Pushdown nur für verifizierte Kriterium-/Typ-Kombinationen nutzen.
- Nicht verifizierte Kriterien mit Server-Scan und bestehender `quality.js`-Logik prüfen.
- Vollständigkeit nur behaupten, wenn Scan-Budget und Datenbasis das erlauben.
- Samples immer sichtbar kennzeichnen.

Hinweistext bei Sample-Basis:

```text
Die Anzahl betroffener Datensätze basiert auf der aktuellen Auswahl und einer begrenzten Stichprobe.
```

Wenn ein Server-Scan vollständiger oder belastbarer ist, soll die UI das entsprechend zurückhaltend ausdrücken, z. B.:

```text
Fehlerliste über Server-Scan geladen.
```

Keine absolute Vollständigkeit behaupten, wenn das technisch nicht gesichert ist.

---

## 7. Obere KPI-Zeile

Die Pflegeaufgaben-Seite bekommt eine reduzierte KPI-Zeile.

Nur Kennzahlen anzeigen, die für diesen Arbeitsschritt relevant sind.

Empfohlene KPIs:

1. Offene Pflegeaufgaben
2. Hohe Priorität
3. Betroffene Datensätze
4. Open-Data-Relevanz
5. Größtes Potenzial

Nicht anzeigen:

- Bearbeitungszeit
- überfällige Aufgaben
- Fälligkeitsdaten
- Verantwortlichkeiten
- SLA-Informationen
- personenbezogene Bearbeiterdaten

Begründung: Diese Daten existieren aktuell nicht belastbar im Datenmodell und würden Aufgabenmanagement vortäuschen. Die Seite ist ein Datenqualitätsmonitor, kein Ticketsystem.

---

## 8. Definition der KPIs

### Offene Pflegeaufgaben

Zeigt die Anzahl der aktuell offenen Pflegeaufgabentypen sowie die Anzahl der davon betroffenen Datensätze.

Die Anzahl der betroffenen Datensätze darf nicht geschätzt oder statisch hinterlegt werden. Sie ist über die vorhandenen dokumentierten API-Endpunkte und Qualitätsaggregationen zu ermitteln.

Wenn die Datenbasis vollständig vorliegt, die tatsächliche Anzahl anzeigen.

Wenn die Anzahl auf einer Stichprobe basiert, dies transparent kennzeichnen.

Beispiel:

```text
28
Offene Pflegeaufgaben

16.892
Betroffene Datensätze
```

Die Anzahl der Pflegeaufgaben und die Anzahl der betroffenen Datensätze sind getrennte Kennzahlen und dürfen nicht miteinander verwechselt werden.

---

### Hohe Priorität

Anzahl der Pflegeaufgaben mit Priorität **„hoch“**, nicht Anzahl der Datensätze.

Grundlage:

- `qualityCriteria.priority`
- aggregierte Aufgabenliste

---

### Betroffene Datensätze

Summe oder bereinigte Anzahl betroffener Datensätze aus der aktuellen Aufgabenbasis.

Wenn Mehrfachzählungen möglich sind, transparent formulieren:

```text
16.892
Treffer in Pflegeaufgaben
```

Oder:

```text
16.892
Betroffene Datensätze
```

Nur **„Datensätze“** verwenden, wenn dedupliziert wurde.

---

### Open-Data-Relevanz

Anteil oder Anzahl der Pflegeaufgaben bzw. Datensätze, deren Problem Open-Data-Fähigkeit beeinflusst.

Dazu zählen insbesondere:

- Lizenzangabe fehlt
- Bildurheber fehlt
- ggf. weitere rechtlich relevante Kriterien

Nicht mit allgemeiner Open-Data-Quote verwechseln.

---

### Größtes Potenzial

Kein frei erfundener Wert.

Der Wert wird aus den vorhandenen Aufgaben abgeleitet, z. B.:

- sehr hoch
- hoch
- mittel
- niedrig

Mögliche Regel:

- **sehr hoch**, wenn mindestens eine hoch priorisierte Aufgabe viele betroffene Datensätze hat und Open-Data-relevant ist
- **hoch**, wenn hoch priorisierte Aufgaben vorhanden sind
- **mittel**, wenn hauptsächlich mittlere Prioritäten vorhanden sind
- **niedrig**, wenn nur geringe oder wenige Aufgaben vorhanden sind

Die Bewertungslogik muss im Code nachvollziehbar sein.

---

## 9. Filterleiste

Die Filterleiste soll ruhig und kurz sein.

Standardfilter:

- Suche in Aufgaben
- Priorität
- Datentyp
- Prüfbarkeit
- Auswirkung
- Filter zurücksetzen

Nicht in der ersten Ebene anzeigen:

- Fälligkeitszeitraum
- Verantwortliche Person
- Bearbeitungsstatus als Ticketsystem
- komplexe technische Kriterienfilter
- rohe Query-Eingabe

Die Filter wirken nur auf die Aufgabenübersicht, nicht automatisch auf vollständige Server-Scans.

Wenn ein Filter einen Server-Scan nötig machen würde, erst bei Öffnen der konkreten Aufgabe nachladen.

---

## 10. Aufgabenliste

Die Aufgabenliste ist die zentrale Komponente.

Sie zeigt Pflegeaufgaben, keine einzelnen Datensätze.

Empfohlene Spalten:

- Pflegeaufgabe
- Betroffene Datensätze
- Priorität
- Betroffene Typen
- Prüfbarkeit
- Auswirkung
- Aktion

Nicht anzeigen:

- Fälligkeitsdatum
- Verantwortlich
- Bearbeitungszeit
- einzelne IDs
- einzelne Datensatzlinks
- lange URLs
- Lizenzwert als eigene Spalte
- technische Query
- interne Diagnosewerte

Jede Zeile ist klickbar und öffnet rechts oder darunter eine Detailkarte zur Aufgabe.

Beispielzeilen:

- Lizenzangabe fehlt
- Bildurheber fehlt
- Beschreibung fehlt
- Öffnungszeiten fehlen
- ÖPNV-Anreise fehlt
- Buchungslink fehlt
- Bild fehlt

Die Aufgaben entstehen aus `qualityCriteria` und den aktuellen Qualitätsaggregationen.

Keine Aufgabe anzeigen, wenn sie in der aktuellen Datenbasis keine betroffenen Datensätze hat.

---

## 11. Aufgaben-Detailkarte

Rechts neben der Aufgabenliste oder unterhalb der Liste eine Detailkarte anzeigen.

Die Detailkarte zeigt die aktuell gewählte Pflegeaufgabe.

Inhalte:

- Name der Aufgabe
- kurze Problembeschreibung
- praktische Auswirkung
- empfohlene Aktion
- betroffene Datentypen
- Prüfbarkeit
- Datenbasis-Hinweis
- Button **„Datensätze anzeigen“**

Nicht anzeigen:

- fiktive Verantwortliche
- Fälligkeitsdaten
- Bearbeitungszeiten
- interne API-Fehlerdetails
- Stacktraces
- lange technische Querys

Beispiel:

```text
Lizenzangabe fehlt

Problem:
Für diese Datensätze ist keine gültige Lizenzangabe hinterlegt.

Auswirkung:
Ohne Lizenz sind die Daten nicht Open-Data-fähig und können nur eingeschränkt weiterverwendet werden.

Empfohlene Aktion:
Lizenzangabe prüfen und ergänzen, z. B. CC0, CC-BY, CC-BY-SA oder PD.

[Datensätze anzeigen]
```

---

## 12. Primärsysteme nur funktional anzeigen

Der Bereich **„Datenpflege in anderen Systemen“** darf nur angezeigt werden, wenn für die aktuelle Aufgabe und die betroffenen Datentypen echte, nutzbare Informationen vorhanden sind.

Nicht als statische Karte anzeigen.

Keine dekorativen Hinweise ohne funktionierende Datenbasis.

### Outdooractive

Outdooractive nur anzeigen, wenn:

- betroffene Datensätze vom Typ Tour oder Outdoor-Angebot betroffen sind,
- ein Feld `source_id` oder ein vergleichbares vorhandenes Source-ID-Merkmal existiert,
- dieses Feld tatsächlich eine Outdooractive-ID enthält,
- daraus eine sinnvolle Pflegeinformation oder Aktion abgeleitet werden kann.

Möglicher Hinweis:

```text
Ein Teil der betroffenen Touren wird in Outdooractive gepflegt.
Outdooractive-ID vorhanden über source_id.
```

Wenn eine direkte URL-Struktur nicht sicher verifiziert ist, keinen geratenen Link erzeugen.

Stattdessen nur anzeigen:

- System: outdooractive
- ID vorhanden
- ID kopieren

Nur dann einen Button **„In Outdooractive öffnen“** anzeigen, wenn die URL-Struktur verifiziert ist.

---

### Feratel Deskline

Feratel Deskline nur anzeigen, wenn:

- betroffene Datensätze vom Typ Hotel / Unterkunft betroffen sind,
- fachlich klar ist, dass diese Daten in Feratel Deskline gepflegt werden,
- die Anzeige dem Nutzer hilft.

Da aktuell keine externe ID vorhanden ist, keinen direkten Öffnen-Link anzeigen.

Stattdessen:

```text
Unterkünfte werden in Feratel Deskline gepflegt.
Für diese Datensätze liegt aktuell keine externe ID im Datenbestand vor.
```

Mögliche Aktion:

- **Datensätze filtern**
- **Liste exportieren**
- **ID aus SaTourN kopieren**

Keinen Button **„In Feratel öffnen“** anzeigen, solange keine ID oder verifizierte Linklogik existiert.

---

### Sichtbarkeitsregel für Primärsystem-Box

Die Box **„Datenpflege in anderen Systemen“** wird nur gerendert, wenn mindestens ein funktionaler Hinweis vorhanden ist.

Funktional bedeutet:

- es gibt betroffene Datensätze für dieses System,
- die Systemzuordnung ist fachlich oder datenbasiert belastbar,
- es gibt mindestens eine konkrete Aktion:
  - ID kopieren
  - Datensätze filtern
  - Liste exportieren
  - verifizierten Link öffnen

Wenn keine funktionalen Hinweise vorhanden sind, die gesamte Box ausblenden.

---

## 13. Datentyp-Legende

Unten kann eine kleine Datentyp-Legende stehen, wenn sie wirklich hilft.

Beispiele:

- POI
- Hotel
- Gastro
- Tour
- Event
- Package

Die Legende soll nicht dominant sein.

Wenn die Icons oder Farben nicht selbsterklärend sind, lieber kurze Textlabels verwenden.

Keine zusätzlichen technischen Erklärungen in der Legende.

---

## 14. Hinweisbox

Eine dezente Hinweisbox darf angezeigt werden, wenn die Datenbasis eingeschränkt ist.

Beispiele:

```text
Die Anzahl betroffener Datensätze basiert auf den aktuellen Filtern und einer Stichprobe.
```

Oder:

```text
Für vollständige Fehlerlisten wird beim Öffnen einer konkreten Aufgabe ein Server-Scan verwendet.
```

Nicht anzeigen:

- technische API-Details
- Request-URLs
- Stacktraces
- interne Diagnosewerte

Technische Details gehören in die Browser-Console.

---

## 15. Technische Fehler und Statusmeldungen

Technische Statusmeldungen nicht dauerhaft im UI anzeigen.

In die Console verschieben:

- vollständige URLs
- HTTP-Details
- Stacktraces
- Query-Diagnosen
- Debug-Warnings
- interne Statuswechsel
- erfolgreiche technische Operationen

Im UI bleiben nur kurze nutzerrelevante Meldungen:

```text
Die Pflegeaufgaben konnten nicht geladen werden.
```

```text
Für diese Auswahl wurden keine Pflegeaufgaben gefunden.
```

```text
Für vollständige Datensätze bitte eine Aufgabe öffnen.
```

Erfolgreiche Requests brauchen keine grüne Erfolgsmeldung.

Der Erfolg ist sichtbar, wenn die Daten aktualisiert wurden.

---

## 16. Ladezustände

Ladezustände komponentennah integrieren.

Keine große globale Ladeanimation für kleine Teilbereiche.

Beispiele:

- KPI-Zeile lädt → dezente Skeleton-Karten
- Aufgabenliste lädt → Ladezeile in der Liste
- Detailkarte lädt → Inline-Hinweis in der Karte
- Server-Scan läuft → Button zeigt **„Datensätze werden geladen …“**

Keine mehreren konkurrierenden Ladeanzeigen.

Keine technischen Fortschrittsdetails anzeigen, außer sie helfen fachlich.

---

## 17. Klickpfad zur Datensatzliste

Jede Aufgabe muss in eine konkrete Datensatzliste führen.

Klickpfad:

1. Nutzer öffnet Pflegeaufgabe.
2. Detailkarte erklärt Problem und Auswirkung.
3. Nutzer klickt **„Datensätze anzeigen“**.
4. Wenn Typ und Kriterium eindeutig sind:
   - `/api/quality/scan` verwenden.
5. Wenn mehrere Typen betroffen sind:
   - Typauswahl anbieten.
   - Erst danach Server-Scan starten.
6. Datensatzliste zeigt nur die für diesen Schritt wichtigen Informationen.

Keine vollständigen Fehlerlisten automatisch beim Laden der Pflegeaufgaben-Seite abrufen.

---

## 18. Datensatzliste nach Aufgabe

Wenn eine Aufgabe geöffnet wurde, soll die Datensatzliste schlank bleiben.

Empfohlene Spalten:

- Titel
- Typ
- Ort / Gebiet
- Problem
- Nächster Schritt
- Aktion

Optional:

- Kategorie, wenn fachlich hilfreich
- ID-Kopieraktion
- externer Systemhinweis, wenn funktional vorhanden

Nicht standardmäßig anzeigen:

- Lizenzwert, wenn die Aufgabe **„Lizenzangabe fehlt“** ist
- Open-Data-Status, wenn die Aufgabe bereits Open-Data-bezogen ist
- Qualitäts-Score
- `global_id` als eigene Spalte
- lange URLs
- Rohdaten
- technische Fehlercodes

Technische Details gehören ins Detailpanel.

---

## 19. Primärsystem-Logik in Datensatzlisten

Wenn ein Datensatz in einem externen Primärsystem gepflegt wird, soll die Liste dies knapp und funktional zeigen.

Beispiele:

### Outdooractive

Nur bei vorhandener Source-ID:

```text
Outdooractive · ID kopieren
```

Falls verifizierter Link vorhanden:

```text
Outdooractive · Öffnen
```

### Feratel Deskline

Bei Unterkünften:

```text
Feratel Deskline · keine externe ID
```

Keine nicht funktionierenden Links anzeigen.

Keine geratenen URLs erzeugen.

---

## 20. Qualitätskriterien

Nutze nur die aktuell aktiven Kriterien.

Aktiv:

- `opening_hours_missing`
- `license_missing`
- `description_missing`
- `image_missing`
- `image_author_missing`
- `public_transport_missing`
- `booking_link_missing`

Nicht als automatische Aufgabe anzeigen:

- `geo_missing`
- `touristtrip_incomplete`
- `manual_image_quality`

Kriterien, die nicht belastbar geprüft werden können, dürfen nicht als harte Fehlerzahl erscheinen.

---

## 21. Feldlogik für Datenqualität

Verwende die bestehenden Feldmappings.

- Lizenz: `attributes[].key = license` mit gültigen Werten `CC0`, `CC-BY`, `CC-BY-SA`, `PD`
- Beschreibung: `texts[].rel = details`; Teaser allein zählt nicht
- Öffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen`
- Bild: prüfbare `media_objects[]`, nicht `booking`, `canonical`, `logo`, `socialmedia`
- Bildurheber: prüfbare Medien ohne `copyrightText`
- ÖPNV: `features[].value` oder `features_old[]` enthält `Mit ÖPNV erreichbar`
- Hotel-Buchungslink: `media_objects[].rel = booking` mit nicht-leerer `url`
- Gebiet/Kategorie: `areas[]` / `areas_old[]` und `categories[]` / `categories_old[]`

Keine neuen Feldannahmen ohne Prüfung einbauen.

---

## 22. CSV-Export

CSV-Export auf der Pflegeaufgaben-Seite nur dort anbieten, wo exportierbare Daten vorhanden sind.

Mögliche Exporte:

- gefilterte Datensatzliste der aktuell ausgewählten Pflegeaufgabe
- gefilterte Datensatzliste der aktuellen Filterkombination
- gefilterte Datensatzliste

CSV darf technische Felder enthalten, die in der UI bewusst ausgeblendet sind, z. B.:

- ID
- `global_id`
- `source_id`
- Primärsystem
- konkrete Lizenz
- Qualitätsstatus
- Pages-Link, falls verifiziert

In der UI-Tabelle bleiben diese Felder ausgeblendet oder im Detailpanel.

Keine Export-Buttons aktivieren, wenn keine Datenbasis vorhanden ist.

---

## 23. Primärsystem-Erkennung

Implementiere eine kleine, nachvollziehbare Helper-Logik für Primärsystem-Hinweise.

Beispielhafte Funktion:

```js
function getPrimarySystemInfo(item) {
  // Touren oder Outdoor-Angebote mit source_id -> outdooractive
  // Unterkünfte / Hotel -> feratel Deskline, aber ohne externe ID
  // sonst null
}
```

Regeln:

- Outdooractive nur bei vorhandener `source_id`.
- Feratel Deskline nur bei Unterkunfts-/Hotel-Typen.
- Kein Link ohne verifizierte URL-Logik.
- Keine Primärsystem-Box ohne funktionale Aktion.
- Primärsystem-Hinweise müssen aus echten Itemdaten oder klarer Typregel entstehen.

---

## 24. Keine Aufgabenmanagement-Simulation

Die Pflegeaufgaben-Seite ist kein Ticketsystem.

Nicht einbauen:

- Verantwortliche
- Bearbeitungszeit
- Fälligkeitsdatum
- Überfälligkeit
- Erledigt-Status
- Zuweisung
- SLA
- Wochenvergleich ohne echte historische Snapshots

Nur anzeigen, was aus der aktuellen Datenbasis belastbar ableitbar ist.

Wenn später echte Snapshots oder Workflow-Daten vorhanden sind, können diese Funktionen ergänzt werden.

---

## 25. Accessibility

Beachte Barrierefreiheit.

- Klickbare Zeilen als Buttons oder Links umsetzen.
- Fokuszustände sichtbar halten.
- `aria-current="page"` für aktive Navigation.
- Ladezustände mit `aria-live` sparsam einsetzen.
- Tabellen mit sinnvollen Überschriften.
- Icons nicht als alleinige Information nutzen.
- Farben nicht als einzige Statusinformation verwenden.

---

## 26. Erste Umsetzungsschritte

Arbeite in kleinen Schritten.

### Schritt 1: Seite vorbereiten

- `tasks.html` oder entsprechende statische Route vorbereiten.
- Layout und Navigation an Startseiten-Design angleichen.
- Keine Mockdaten einbauen.

### Schritt 2: echte Aufgabenaggregationen anbinden

- Aufgaben aus `qualityCriteria` und `qualityAggregations.issueSummary` erzeugen.
- Nur Aufgaben mit betroffenen Datensätzen anzeigen.
- Sample-Hinweis anzeigen, wenn relevant.

### Schritt 3: KPI-Zeile berechnen

- KPIs aus echten Aggregationen ableiten.
- Keine fiktiven Bearbeitungs- oder Fälligkeitswerte anzeigen.

### Schritt 4: Detailkarte bauen

- Klick auf Aufgabe zeigt Problembeschreibung, Auswirkung und empfohlene Aktion.
- Button **„Datensätze anzeigen“** öffnet konkrete Fehlerliste.

### Schritt 5: Primärsystem-Hinweise funktional machen

- Outdooractive nur bei vorhandener `source_id`.
- Feratel Deskline nur für Unterkunfts-/Hotel-Datensätze.
- Keine Links ohne verifizierte URL.
- Box ausblenden, wenn keine funktionale Information vorhanden ist.

### Schritt 6: Server-Scan erst bei konkreter Aufgabe

- Bei eindeutigem Typ und Kriterium `/api/quality/scan` nutzen.
- Bei mehreren Typen erst Typauswahl anzeigen.
- Pagination erhalten.

### Schritt 7: Export und Detailpanel

- Export nur aktivieren, wenn Daten vorhanden sind.
- Technische Felder in Export und Detailpanel, nicht in Haupttabelle.

---

## 27. Tests und Checks

Vor Abschluss ausführen:

```bash
git diff --check
```

Wenn Node verfügbar ist:

```bash
npm run check
npm run diagnose:quality-examples
```

Wenn Node nicht verfügbar ist, dokumentieren:

```text
Node-Checks konnten nicht ausgeführt werden.
```

Zusätzlich manuell prüfen:

- Seite lädt ohne Build-Schritt.
- Keine Mockdaten sichtbar.
- Keine hart codierten Zahlen sichtbar.
- Pflegeaufgaben erscheinen nur nach Datenbasis.
- Empty State erscheint vor erster Abfrage.
- Sample-Hinweis erscheint bei begrenzter Datenbasis.
- Klick auf Aufgabe öffnet Detailkarte.
- Klick auf **„Datensätze anzeigen“** lädt echte Datensätze.
- `/api/quality/scan` wird nur bei konkretem Typ und Kriterium genutzt.
- Primärsystem-Box erscheint nur bei funktionalen Hinweisen.
- Outdooractive wird nur mit vorhandener `source_id` angezeigt.
- Feratel Deskline zeigt keinen nicht funktionierenden Link.
- CSV-Export ist nur aktiv, wenn exportierbare Daten vorhanden sind.
- Technische Fehlerdetails stehen in der Console, nicht im UI.

---

## 28. Akzeptanzkriterien

Die Pflegeaufgaben-Seite ist korrekt umgesetzt, wenn:

- sie visuell zur hellen Startseite passt,
- sie keine Mockdaten enthält,
- alle sichtbaren Zahlen aus echten Daten oder transparenten Samples stammen,
- keine fiktiven Fälligkeitsdaten, Verantwortlichkeiten oder Bearbeitungszeiten angezeigt werden,
- Aufgaben aus der echten Qualitätslogik entstehen,
- die Seite API-schonend lädt,
- Server-Scans erst bei konkreter Aufgabe gestartet werden,
- jede Aufgabe zu konkreten Datensätzen führen kann,
- Tabellen schlank bleiben,
- Primärsysteme nur bei funktionalen Informationen erscheinen,
- Outdooractive nur mit echter `source_id` auftaucht,
- Feratel Deskline nur ohne geratenen Link erscheint,
- Export und Detailinformationen funktionieren,
- Stichproben klar gekennzeichnet werden,
- technische Details nicht das UI belasten.

---

## 29. Nicht tun

Nicht:

- Mockdaten einbauen.
- Statische Beispielzahlen hart codieren.
- Aufgaben anzeigen, die keine Datenbasis haben.
- Primärsystem-Karten immer anzeigen.
- Outdooractive-Links raten.
- Feratel-Links ohne ID erzeugen.
- Fälligkeitsdaten oder Verantwortlichkeiten simulieren.
- Bearbeitungszeiten anzeigen, solange keine echte Datenbasis existiert.
- Vollständigkeit behaupten, wenn nur Samples vorliegen.
- Beim Seitenaufruf vollständige Fehlerlisten laden.
- Technische API-Details im UI anzeigen.
- Tabellen mit unnötigen Spalten überladen.

---

## 30. Leitgedanke

Die Pflegeaufgaben-Seite soll wie eine ruhige Arbeitsliste wirken:

- Was ist zu tun?
- Wie wichtig ist es?
- Welche Datentypen betrifft es?
- Warum ist es relevant?
- Welche konkreten Datensätze muss ich öffnen?

Alles andere gehört in Detailpanel, Export, Console oder spätere Ausbaustufen.
