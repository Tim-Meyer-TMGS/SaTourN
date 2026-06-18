# Datenqualitätsmonitor – Architektur und Zielbild

Stand: 2026-06-18

## Zweck dieses Dokuments

Dieses Dokument beschreibt:

- die aktuelle Systemarchitektur
- die fachliche und technische Verantwortlichkeit der Hauptteile
- das Zielbild für eine spätere Übergabe an externe Entwickler
- das Hosting-Ziel für einen späteren Betrieb auf eigenem Server

Es ist kein API-Referenzdokument. Es dient als Architektur- und
Übergabekontext.

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
- zentrales Styling über `Statistik/style.css`
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
- `Statistik/task-logic.js`
- `Statistik/task-families.js`
- `Statistik/records-search.js`
- `Statistik/record-communication.js`
- `Statistik/record-mail.js`
- `Statistik/api-config.js`
- `Statistik/app-constants.js`

### 3. Backend-Proxy

Das Backend läuft als Node-Service mit Express-artigen Routen.

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

Das Frontend übernimmt aktuell:

- Navigation zwischen Ansichten
- Arbeitskontext
- Filterzustände
- Tabellen und Detailansichten
- Laden von Statistik- und Qualitätsdaten
- AI-Suche im UI
- Öffnen von Mailentwürfen über `mailto:`

#### Backend

Das Backend übernimmt aktuell:

- Proxy-Zugriffe auf Destination.One / Meta
- serverseitige Qualitätszählungen und Scans
- serverseitige one.intelligence-Aufrufe
- Schutz der API-Keys
- optionale Cache-Zwischenschichten

### 5. Aktuelle Betriebsgrenzen

Frontend:

- statisch ausgeliefert
- keine Secrets im Browser

Backend:

- produktiv auf Render
- hält Secrets und Integrationslogik

Externe Systeme:

- Destination.One / Meta
- one.intelligence

## Aktuelle Verantwortlichkeiten

### Frontend-Verantwortung

Das Frontend ist für folgende Aufgaben zuständig:

- Anzeige der Seiten
- Interaktionen des Nutzers
- clientseitige Filterung bereits geladener Datensätze
- Pflege des Arbeitskontexts
- Darstellung von Lade-, Fehler- und Leerzuständen

Das Frontend darf nicht zuständig sein für:

- API-Keys
- direkte OI-Authentifizierung
- serverseitige Quality-Scans
- Integrationsgeheimnisse

### Backend-Verantwortung

Das Backend ist für folgende Aufgaben zuständig:

- geschützte Kommunikation mit externen APIs
- Quality-Endpunkte
- OI-Endpunkte
- ID-Auflösung und Such-Proxy
- Rate-Limits für KI-Funktionen
- serverseitige Konfiguration

## Aktuelle Schwächen

Die aktuelle Architektur ist funktional, aber noch nicht optimal für
Übergabe und Wartung.

Wesentliche Schwächen:

- `Statistik/scripts.js` ist zu groß und bündelt zu viele Verantwortungen
- State, Rendering, Event-Handling und API-Zugriffe liegen zu eng zusammen
- die Frontend-Seiten sind fachlich getrennt, technisch aber noch nicht
  ausreichend modularisiert
- Teile der Qualitätslogik sind fachlich stark, aber technisch noch zu wenig
  in kleinere Module aufgeteilt
- die Betriebsdokumentation ist noch nicht vollständig genug für eine
  externe Übergabe

## Zielbild für die nächste Architekturstufe

### 1. Grundsatz

Das Ziel ist keine reine kosmetische Modernisierung, sondern eine
übergabefähige Struktur.

Das Zielbild trennt:

- Frontend-Anwendung
- Backend-Proxy
- Dokumentation
- später optional Infrastrukturdefinition

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

optional später:
infra/
```

### 3. Frontend-Zielbild

Empfohlener Stack:

- `Vue 3`
- `Vite`
- `Vue Router`
- `Pinia`

Ziel des Frontends:

- komponentisierte Oberflächen
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

## Zielbild für Eigenhosting

### 1. Betriebsmodell

Für den späteren Betrieb auf eigenem Server ist folgende Trennung sinnvoll:

- Frontend als statische Build-Artefakte
- Backend als Node-Prozess
- Reverse Proxy davor, zum Beispiel Nginx

### 2. Empfohlene Serverrollen

#### Frontend-Auslieferung

- liefert gebaute statische Dateien aus
- kennt keine Secrets

#### Backend-Service

- läuft als eigener Node-Dienst
- hält alle `LICENSEKEY`- und `OI_*`-Variablen
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
- Health-Check für Backend separat vorsehen
- Logging ohne Secret-Leaks

## Übergaberelevante Leitlinien

Ein externer Entwickler muss ohne mündliches Zusatzwissen verstehen können:

- welche Teile statisch sind
- welche Teile serverseitig laufen
- welche Endpunkte intern stabil sind
- wo Qualitätslogik lebt
- wo KI-Logik lebt
- welche Grenzen fachlich bewusst gelten

Deshalb gilt für die nächste Ausbaustufe:

- Frontend und Backend nicht weiter vermischen
- `scripts.js` schrittweise zerlegen
- Fachmodell und UI-Text nicht in einem Monolith pflegen
- neue Funktionen nur mit klarer Zuordnung zu Frontend oder Backend einbauen

## Nächste konkrete Folgeschritte

Aus diesem Architekturstand folgen als nächste sinnvolle Schritte:

1. Frontend weiter entkoppeln, bevor ein Framework eingeführt wird
2. gemeinsame Zustände und Seitengrenzen als Zielmodule festziehen
3. Entwicklerdokumentation und Betriebsdokumentation ergänzen
4. danach Framework-Migration geplant und seitenweise umsetzen
