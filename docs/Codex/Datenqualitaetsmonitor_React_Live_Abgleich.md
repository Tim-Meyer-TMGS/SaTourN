# Datenqualitätsmonitor – React-Preview gegen Live-Seite abgleichen

Stand: 2026-06-26

## Ziel

Diese Checkliste steuert den Übergang vom produktiven Bestandsfrontend unter
`Statistik/` zur React-Preview unter `frontend/`.

Die Live-Seite bleibt führend, bis jede Hauptseite fachlich gleichwertig ist.
Abweichungen werden zuerst nach Funktion und Datenlogik bewertet, erst danach
nach Optik.

## Prüfregel

Jede Seite wird in dieser Reihenfolge geprüft:

1. Arbeitskontext identisch setzen
2. API-Abrufe im Network-Tab vergleichen
3. sichtbare Kennzahlen und Trefferlisten vergleichen
4. leere Zustände, Ladezustände und Fehlerzustände prüfen
5. UI-Abstände, Karten, Tabellen und mobile Darstellung angleichen

## Seiten

### 1. Übersicht

Prüfen:

- Gesamt-Datensätze stimmen mit Live-Seite überein
- Open-Data-Quote stimmt mit Live-Seite überein
- für ganz Sachsen wird kein Qualitätsscore berechnet
- für Gebiet oder Ort wird `/api/quality/summary` genutzt
- `Mit Pflegebedarf`, `Gute Datensätze` und `Kritische Datensätze` stammen aus deduplizierter Bewertung
- wichtigste Pflegeaufgaben zeigen keine Einträge mit `0` Treffern
- Klick auf eine Pflegeaufgabe öffnet die Datensatzliste mit genau diesem Fehler

Kritische Abweichungen:

- Pflegebedarf darf nicht durch Summieren einzelner Fehlercounts entstehen
- gleiche Datensätze mit mehreren Fehlern dürfen nur einmal in Summen zählen

### 2. Pflegeaufgaben

Prüfen:

- Aufgaben werden nach fachlich gleichen Kriterien gruppiert
- Typfilter verändert Counts und Detailspalte korrekt
- Aufgaben mit mehreren Typen zeigen alle betroffenen Typen
- Klick auf Aufgabe oder Typ öffnet die Datensatzliste mit passendem `criterionId` und `type`
- Open-Data-relevante Aufgaben sind korrekt markiert

Kritische Abweichungen:

- Aufgaben dürfen nicht nur in der UI zusammengefasst werden, wenn die Datensatzliste danach andere Logik nutzt

### 3. Datensätze

Prüfen:

- normale Suche gegen `/api/search`
- ID- und `global_id`-Suche
- KI-Suche gegen `/api/oi/search-records`
- KI-Ergebnisse werden anschließend durch die Qualitätskriterien bewertet
- Pflegeaufgabenfilter lädt Treffer über `/api/quality/scan`
- lokale Filter für Kategorie und Problem arbeiten auf der geladenen Trefferliste
- CSV-Export enthält die aktuell gefilterte Liste
- Mailaktion nutzt `/api/oi/mail-draft`
- Detailnavigation speichert den aktuellen Listenstand

Kritische Abweichungen:

- AI-Suche darf keine ungeprüften Treffer anzeigen
- Pflegeaufgabenfilter darf keine leere Liste zeigen, wenn der Count Treffer ausweist

Umgesetzt im React-Preview:

- Datensatzliste und Detailseite nutzen dieselbe Shared-Funktion für die Bewertungsbasis:
  `buildQualityEvaluationInput`
- Suchtreffer, KI-Treffer und Detaildatensätze werden damit vor der Qualitätsbewertung einheitlich normalisiert
- URL-Parameter für Pflegeaufgabenfilter werden stabil aus primitiven Query-Strings abgeleitet, damit das Öffnen einer Aufgabe keinen unnötigen Reload des Loaders auslöst
- Fehlerlisten zeigen jetzt eine echte Fehlermeldung, wenn alle `/api/quality/scan`-Requests scheitern; Teiltreffer bleiben weiterhin nutzbar

### 4. Datensatz-Detail

Prüfen:

- Auflösung per `id`
- Auflösung per `global_id`
- Qualitätsstatus und Score stimmen mit der Datensatzliste überein
- fehlende, erfüllte, vorbereitete und ausgenommene Kriterien werden getrennt dargestellt
- Pflegesystem-Logo stimmt mit `keywords_old` und Importquelle überein
- Medien, Bildurheber und Lizenzangaben werden sauber angezeigt
- Vorher/Nächster nutzt den gespeicherten Listenstand
- Zurücklink führt in den vorherigen Listenmodus zurück

Kritische Abweichungen:

- Detailseite darf keinen anderen Qualitätsstatus berechnen als die Liste
- fehlende Felder dürfen die Seite nicht abbrechen lassen

Umgesetzt im React-Preview:

- Detailseite verwendet dieselbe Bewertungsbasis wie die Datensatzliste
- Zurück aus der Detailseite erhält den ursprünglichen Listenpfad inklusive Pflegeaufgaben-Query, statt pauschal auf `/records` zurückzuspringen

### 5. Open-Data-Statistik

Prüfen:

- Gesamtbestand, Open-Data-fähig und nicht Open-Data-fähig stimmen mit Live-Seite überein
- Datentypverteilung nutzt dieselben Counts wie die Übersicht
- Quote nach Datentyp ist korrekt
- Lizenz-Pflegehinweis führt in die Datensatzliste zur Lizenzaufgabe
- kein doppelter Arbeitskontext auf der Seite

Kritische Abweichungen:

- Open-Data-Status kennt nur Open-Data-fähig oder nicht Open-Data-fähig
- kein zusätzlicher Status `Nicht bewertbar`

### 6. Hilfe

Prüfen:

- Score-Erklärung ist nutzerverständlich
- drei Fehler-Ebenen sind klar getrennt vom Gesamtstatus eines Datensatzes
- Mindestanforderungen je Datentyp kommen aus dem aktuellen Qualitätsmodell
- vorbereitete Kriterien werden nicht als aktive Score-Regeln behauptet
- keine technischen API- oder Pushdown-Begriffe in Nutzertexten

Kritische Abweichungen:

- Hilfe darf keine falsche Gewichtung behaupten, solange die finale Gewichtung noch offen ist

## Abnahmekriterien

Eine Seite gilt als abnahmefähig, wenn:

- API-Abrufe zur fachlichen Aussage passen
- der initiale `/health`-Warmup-Call den Seitenstart nicht blockiert
- Counts, Listen und Detailansichten konsistent sind
- bekannte Sonderfälle sauber abgebildet werden
- mobile Darstellung keine Überlagerungen erzeugt
- Light Mode und Dark Mode lesbar bleiben
- keine Mojibake-Texte sichtbar sind
- keine Console-Fehler aus dem Anwendungscode auftreten

## Aktueller nächster Schritt

Mit `Datensätze` und `Datensatz-Detail` beginnen, weil dort Suche,
Pflegeaufgabenfilter, KI-Suche, Qualitätsbewertung und Navigation
zusammenlaufen.
