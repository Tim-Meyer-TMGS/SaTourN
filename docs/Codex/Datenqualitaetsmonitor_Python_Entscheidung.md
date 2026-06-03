# Datenqualitaets-Monitor - Python-Auslagerung fuer Statistiklogik

Stand: 2026-06-03

Quellenhinweis: Die GitHub-Pages-Dokumentation beschreibt GitHub Pages als statisches Hosting und weist darauf hin, dass serverseitige Sprachen wie PHP, Ruby oder Python nicht unterstuetzt werden: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Kurzentscheidung

Python ist fuer grosse Datenmengen grundsaetzlich gut geeignet, aber nicht als direkte Laufzeit der bestehenden Statistikseite auf GitHub Pages.

Die aktuelle Statistikseite wird als statisches HTML/CSS/JavaScript ausgeliefert. GitHub Pages fuehrt keine serverseitigen Sprachen wie Python aus. Python-Code im Repository kann deshalb nicht bei einem Seitenaufruf die Statistik berechnen.

Deshalb wurden keine produktiven Statistik-JavaScript-Dateien durch Python ersetzt.

## Warum keine direkte Umstellung auf Python?

Die Statistikseite muss im Browser funktionieren:

- `Statistik/index.html`
- `Statistik/main.js`
- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/style.css`

Diese Dateien werden ueber GitHub Pages statisch ausgeliefert. Bei einem Nutzeraufruf gibt es auf GitHub Pages keinen Python-Prozess, der Requests verarbeiten, Daten paginieren oder Qualitaetschecks ausfuehren koennte.

Eine direkte Ersetzung von `Statistik/scripts.js` oder `Statistik/quality.js` durch `.py`-Dateien wuerde die ausgelieferte Statistikseite daher brechen.

## Geeignete Einsatzorte fuer Python

Python ist sinnvoll, wenn die Berechnung nicht live in GitHub Pages stattfinden muss.

### 1. GitHub Actions / Build-Zeit

Python kann in einem GitHub-Actions-Workflow laufen und vor dem Pages-Deployment statische JSON-Dateien erzeugen.

Geeignet fuer:

- regelmaessige Snapshots
- voraggregierte Statistikdaten
- voraggregierte Qualitaets-KPIs
- Problemcluster fuer bekannte Standardfilter
- Datentyp-Uebersichten
- Kriterien-Matrix

Nicht geeignet fuer:

- Live-Filter auf beliebige Nutzerkombinationen
- geheime API-Keys im ausgelieferten Frontend
- spontane Vollscans pro Nutzerklick

Voraussetzung:

- API-Zugriff muss im Workflow ueber GitHub-Secrets abgesichert werden.
- Die erzeugten JSON-Dateien duerfen keine Secrets oder vollstaendigen Rohdaten enthalten.
- Der Build darf die API nicht unkontrolliert belasten.

### 2. Separater Backend-/Job-Dienst

Python kann als eigener Dienst oder Worker laufen, z. B. fuer grosse Scans und CSV-Exporte.

Geeignet fuer:

- vollstaendige Fehlerlisten
- grosse CSV-Exporte
- serverseitige Pagination
- laengere Jobs mit Fortschritt
- Caching
- robuste Retry-/Timeout-Logik

Nicht direkt durch GitHub Pages abgedeckt.

### 3. Lokale Redaktionstools

Python kann lokal oder in geplanten Jobs fuer redaktionelle Analyse genutzt werden.

Geeignet fuer:

- Ad-hoc-Auswertungen
- Datenqualitaetsberichte
- Plausibilitaetspruefungen
- einmalige Exporte

## Nicht empfohlene Variante: Python im Browser

Python im Browser waere theoretisch ueber Pyodide oder PyScript moeglich. Das wird fuer dieses Dashboard nicht empfohlen:

- grosse zusaetzliche Ladepakete
- weiter clientseitige Verarbeitung grosser Datenmengen
- keine Loesung fuer API-Secrets
- keine Entlastung des Browsers bei 30.000 Items
- zusaetzliche Komplexitaet gegenueber JavaScript

## Bewertung der bestehenden Statistiklogik

### Im Browser belassen

Diese Logik sollte vorerst in JavaScript bleiben:

- UI-State
- Filter-Interaktion
- Dropdowns
- Charts
- Tabellenrendering
- Klickverhalten fuer Pflegebedarfe
- aktive Fehlerlisten-Ansicht

Begruendung:

- muss live auf Nutzerinteraktion reagieren.
- laeuft bereits in der statischen GitHub-Pages-Oberflaeche.
- hat direkten DOM-Zugriff.

### In JavaScript-Proxy belassen

Diese Logik sollte vorerst im bestehenden Node/Express-Proxy bleiben:

- `/api/search`
- `/api/quality/scan`
- API-Key-gesicherte Destination.One-Aufrufe
- budgetierte serverseitige Scans

Begruendung:

- Proxy existiert bereits.
- `routes/quality.js` nutzt dieselbe `Statistik/quality.js`-Kriterienlogik wie das Frontend.
- keine doppelte Kriterienimplementierung in Python.

### Spaeter optional in Python auslagern

Diese Logik ist fuer Python geeignet, wenn ein Build- oder Job-Pfad eingefuehrt wird:

- Vollscan grosser Datenmengen
- Snapshot-Erzeugung
- grosse Aggregationen ueber alle Items
- CSV-Erzeugung fuer grosse Fehlerlisten
- Vorberechnung von Matrix und Datentyp-Uebersicht

## Empfohlene Zielarchitektur

Kurzfristig:

1. Bestehende JavaScript-UI behalten.
2. Bestehenden Node-Proxy fuer Live-Requests behalten.
3. `/api/quality/scan` fuer budgetierte Fehlerlisten weiter ausbauen.
4. In der UI klar anzeigen, wenn Daten nur Stichproben sind.

Mittelfristig:

1. Optionalen Python-Snapshot-Job in GitHub Actions einfuehren.
2. Snapshot-Dateien nach `Statistik/data/` schreiben.
3. Dashboard laedt bei Bedarf diese statischen JSON-Dateien.
4. Live-Scan bleibt fuer aktuelle oder eng gefilterte Fehlerlisten beim Proxy.

Langfristig:

1. Fuer vollstaendige Fehlerlisten und CSV-Exporte einen eigenen Job-Dienst nutzen.
2. Dieser Dienst kann Python oder Node verwenden.
3. Entscheidend ist weniger die Sprache als:
   - Pagination
   - Timeouts
   - Abbruch
   - Caching
   - Secret-Schutz
   - reduzierte Rueckgabe an den Browser

## Warum aktuell keine Dateien ersetzt wurden

Eine Ersetzung von Statistik-JavaScript durch Python waere fuer GitHub Pages nicht lauffaehig. Sie wuerde das aktuelle Dashboard nicht beschleunigen, sondern unbenutzbaren Code erzeugen.

Stattdessen wurde die Architekturentscheidung dokumentiert:

- Python ja fuer Vorberechnung, Jobs und optionale Snapshots.
- Python nein fuer direkte GitHub-Pages-Live-Statistik.
- JavaScript bleibt fuer Browser-UI und aktuelle Interaktion.
- Node/Express bleibt fuer API-Proxy und budgetierte Live-Scans.

## Konsequenz fuer kommende Abschnitte

Bei den naechsten Abschnitten sollte weiter in JavaScript umgesetzt werden, solange es um UI, Filter, Tabellen und Interaktion geht.

Wenn spaeter vollstaendige grosse Fehlerlisten benoetigt werden, sollte zuerst entschieden werden:

1. Reicht ein statischer Snapshot aus GitHub Actions?
2. Oder braucht es einen echten Backend-/Job-Dienst?

Erst danach sollte Python-Code hinzugefuegt werden, damit keine doppelte und auseinanderlaufende Qualitaetslogik entsteht.
