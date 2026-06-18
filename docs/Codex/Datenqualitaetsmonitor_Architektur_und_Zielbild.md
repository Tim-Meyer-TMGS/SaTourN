# DatenqualitÃ¤tsmonitor â€“ Architektur und Zielbild

Stand: 2026-06-18

## Zweck dieses Dokuments

Dieses Dokument beschreibt:

- die aktuelle Systemarchitektur
- die fachliche und technische Verantwortlichkeit der Hauptteile
- das Zielbild fÃ¼r eine spÃ¤tere Ãœbergabe an externe Entwickler
- das Hosting-Ziel fÃ¼r einen spÃ¤teren Betrieb auf eigenem Server

Es ist kein API-Referenzdokument. Es dient als Architektur- und
Ãœbergabekontext.

## Aktuelle Architektur

### 1. Laufende Systemteile

Das System besteht aktuell aus zwei klar getrennten Laufzeitbereichen:

1. Frontend
2. Backend-Proxy

### 2. Frontend

Das Frontend liegt unter `Statistik/` und wird derzeit als statische Anwendung
ausgeliefert.

Wichtige Eigenschaften:

- mehrere HTML-Seiten statt Single-Page-App
- Vanilla JavaScript
- zentrales Styling Ã¼ber `Statistik/style.css`
- Hauptlogik derzeit noch stark in `Statistik/scripts.js`
- kleinere Hilfsmodule bereits ausgelagert

Aktive Seiten:

- `Statistik/index.html`
- `Statistik/tasks.html`
- `Statistik/records.html`
- `Statistik/record-detail.html`
- `Statistik/stats.html`
- `Statistik/help.html`

Wichtige Frontend-Dateien:

- `Statistik/scripts.js`
- `Statistik/quality.js`
- `Statistik/tasks/task-logic.js`
- `Statistik/tasks/task-families.js`
- `Statistik/records/records-search.js`
- `Statistik/records/record-communication.js`
- `Statistik/records/record-mail.js`
- `Statistik/core/api-config.js`
- `Statistik/core/app-constants.js`

### 3. Backend-Proxy

Das Backend lÃ¤uft als Node-Service mit Express-artigen Routen.

Einstieg:

- `index.js`

Wichtige Routen:

- `routes/search.js`
- `routes/records.js`
- `routes/quality.js`
- `routes/oi.js`

Wichtige Backend-Helfer:

- `lib/config.js`
- `lib/oi-config.js`
- `lib/cache.js`
- `lib/kv-store.js`
- `lib/quality-cache.js`
- `lib/search-utils.js`

### 4. Aktueller Datenfluss

#### Frontend

Das Frontend Ã¼bernimmt aktuell:

- Navigation zwischen Ansichten
- Arbeitskontext
- FilterzustÃ¤nde
- Tabellen und Detailansichten
- Laden von Statistik- und QualitÃ¤tsdaten
- AI-Suche im UI
- Ã–ffnen von MailentwÃ¼rfen Ã¼ber `mailto:`

#### Backend

Das Backend Ã¼bernimmt aktuell:

- Proxy-Zugriffe auf Destination.One / Meta
- serverseitige QualitÃ¤tszÃ¤hlungen und Scans
- serverseitige one.intelligence-Aufrufe
- Schutz der API-Keys
- optionale Cache-Zwischenschichten

### 5. Aktuelle Betriebsgrenzen

Frontend:

- statisch ausgeliefert
- keine Secrets im Browser

Backend:

- produktiv auf Render
- hÃ¤lt Secrets und Integrationslogik

Externe Systeme:

- Destination.One / Meta
- one.intelligence

## Aktuelle Verantwortlichkeiten

### Frontend-Verantwortung

Das Frontend ist fÃ¼r folgende Aufgaben zustÃ¤ndig:

- Anzeige der Seiten
- Interaktionen des Nutzers
- clientseitige Filterung bereits geladener DatensÃ¤tze
- Pflege des Arbeitskontexts
- Darstellung von Lade-, Fehler- und LeerzustÃ¤nden

Das Frontend darf nicht zustÃ¤ndig sein fÃ¼r:

- API-Keys
- direkte OI-Authentifizierung
- serverseitige Quality-Scans
- Integrationsgeheimnisse

### Backend-Verantwortung

Das Backend ist fÃ¼r folgende Aufgaben zustÃ¤ndig:

- geschÃ¼tzte Kommunikation mit externen APIs
- Quality-Endpunkte
- OI-Endpunkte
- ID-AuflÃ¶sung und Such-Proxy
- Rate-Limits fÃ¼r KI-Funktionen
- serverseitige Konfiguration

## Aktuelle SchwÃ¤chen

Die aktuelle Architektur ist funktional, aber noch nicht optimal fÃ¼r
Ãœbergabe und Wartung.

Wesentliche SchwÃ¤chen:

- `Statistik/scripts.js` ist zu groÃŸ und bÃ¼ndelt zu viele Verantwortungen
- State, Rendering, Event-Handling und API-Zugriffe liegen zu eng zusammen
- die Frontend-Seiten sind fachlich getrennt, technisch aber noch nicht
  ausreichend modularisiert
- Teile der QualitÃ¤tslogik sind fachlich stark, aber technisch noch zu wenig
  in kleinere Module aufgeteilt
- die Betriebsdokumentation ist noch nicht vollstÃ¤ndig genug fÃ¼r eine
  externe Ãœbergabe

## Zielbild fÃ¼r die nÃ¤chste Architekturstufe

### 1. Grundsatz

Das Ziel ist keine reine kosmetische Modernisierung, sondern eine
Ã¼bergabefÃ¤hige Struktur.

Das Zielbild trennt:

- Frontend-Anwendung
- Backend-Proxy
- Dokumentation
- spÃ¤ter optional Infrastrukturdefinition

### 2. Zielstruktur

Empfohlene Zielstruktur:

```text
frontend/
  src/
    app/
    pages/
    components/
    stores/
    services/
    content/
    utils/
  public/

backend/
  routes/
  services/
  clients/
  config/
  utils/

docs/
  Codex/

optional spÃ¤ter:
infra/
```

### 3. Frontend-Zielbild

Empfohlener Stack:

- `Vue 3`
- `Vite`
- `Vue Router`
- `Pinia`

Ziel des Frontends:

- komponentisierte OberflÃ¤chen
- klarer gemeinsamer State
- URL- und Routing-Logik zentral
- Services statt direkter `fetch`-Aufrufe in UI-Komponenten
- wiederverwendbare UI-Bausteine

### 4. Backend-Zielbild

Das Backend bleibt ein eigener Service.

Ziel:

- alle Secrets bleiben serverseitig
- externe Integrationen bleiben im Backend
- Frontend spricht nur mit stabilen internen API-Endpunkten
- Search-, Quality- und OI-Logik bleiben getrennt kapselbar

### 5. Verantwortlichkeit im Zielbild

#### Frontend

- Routing
- UI-Komponenten
- State
- Darstellung
- Nutzerinteraktion
- lokale Validierung

#### Backend

- API-Proxy
- OI-Proxy
- Rate-Limiting
- Quality-Berechnung und Quality-Scans
- Konfiguration
- optionale Cache-Layer

## Zielbild fÃ¼r Eigenhosting

### 1. Betriebsmodell

FÃ¼r den spÃ¤teren Betrieb auf eigenem Server ist folgende Trennung sinnvoll:

- Frontend als statische Build-Artefakte
- Backend als Node-Prozess
- Reverse Proxy davor, zum Beispiel Nginx

### 2. Empfohlene Serverrollen

#### Frontend-Auslieferung

- liefert gebaute statische Dateien aus
- kennt keine Secrets

#### Backend-Service

- lÃ¤uft als eigener Node-Dienst
- hÃ¤lt alle `LICENSEKEY`- und `OI_*`-Variablen
- stellt interne API-Endpunkte bereit

#### Reverse Proxy

- TLS
- Routing
- Weiterleitung von `/api/*` an das Backend
- Auslieferung des Frontends

### 3. Zielhafte URL-Struktur

Beispiel:

- `/` Frontend
- `/tasks` Frontend-Route
- `/records` Frontend-Route
- `/api/search` Backend
- `/api/quality/*` Backend
- `/api/oi/*` Backend

### 4. Wichtige Betriebsregeln

- keine API-Keys im Frontend
- keine OI-Keys in HTML, JavaScript-Bundles oder Runtime-Markup
- Umgebungsvariablen nur serverseitig
- Health-Check fÃ¼r Backend separat vorsehen
- Logging ohne Secret-Leaks

## Ãœbergaberelevante Leitlinien

Ein externer Entwickler muss ohne mÃ¼ndliches Zusatzwissen verstehen kÃ¶nnen:

- welche Teile statisch sind
- welche Teile serverseitig laufen
- welche Endpunkte intern stabil sind
- wo QualitÃ¤tslogik lebt
- wo KI-Logik lebt
- welche Grenzen fachlich bewusst gelten

Deshalb gilt fÃ¼r die nÃ¤chste Ausbaustufe:

- Frontend und Backend nicht weiter vermischen
- `scripts.js` schrittweise zerlegen
- Fachmodell und UI-Text nicht in einem Monolith pflegen
- neue Funktionen nur mit klarer Zuordnung zu Frontend oder Backend einbauen

## NÃ¤chste konkrete Folgeschritte

Aus diesem Architekturstand folgen als nÃ¤chste sinnvolle Schritte:

1. Frontend weiter entkoppeln, bevor ein Framework eingefÃ¼hrt wird
2. gemeinsame ZustÃ¤nde und Seitengrenzen als Zielmodule festziehen
3. Entwicklerdokumentation und Betriebsdokumentation ergÃ¤nzen
4. danach Framework-Migration geplant und seitenweise umsetzen
