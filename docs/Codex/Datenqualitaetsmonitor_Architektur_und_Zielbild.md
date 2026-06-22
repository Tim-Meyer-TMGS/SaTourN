# Datenqualitätsmonitor – Architektur und Zielbild

Stand: 2026-06-22

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

### 3. Backend-Proxy

Das Backend läuft als Node-Service mit Express-artigen Routen.

Einstieg:

- `index.js`

Wichtige Routen:

- `routes/search.js`
- `routes/records.js`
- `routes/quality.js`
- `routes/oi.js`

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

Das Frontend ist zuständig für:

- Anzeige der Seiten
- Interaktionen des Nutzers
- clientseitige Filterung bereits geladener Datensätze
- Pflege des Arbeitskontexts
- Darstellung von Lade-, Fehler- und Leerzuständen

Das Frontend ist nicht zuständig für:

- API-Keys
- direkte OI-Authentifizierung
- serverseitige Quality-Scans
- Integrationsgeheimnisse

### Backend-Verantwortung

Das Backend ist zuständig für:

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

Das Ziel ist keine kosmetische Modernisierung, sondern eine
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
    features/
    shared/
    styles/
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

- `React`
- `Vite`
- `TypeScript`
- `React Router`
- `Zustand`

Begründung:

- hohe Entwicklerverfügbarkeit
- gute Übergabefähigkeit
- klarer Komponenten- und Hook-Schnitt
- einfacher Parallelbetrieb neben dem bestehenden Frontend
- später problemlos auf eigenem Server betreibbar

### 4. Backend-Zielbild

Das Backend bleibt zunächst ein eigenständiger Proxy-Service.

Es soll mittelfristig klarer getrennt werden in:

- `routes/`
- `clients/`
- `services/`
- `config/`
- `utils/`

Das Backend bleibt verantwortlich für:

- Secrets
- API-Auth
- OI-Zugriffe
- Qualitätsabfragen
- serverseitige Schutzmechanismen

## Ziel für die Übergabe an externe Entwickler

Ein externer Entwickler soll das Projekt verstehen können, ohne die Historie
der Codex-Sitzungen zu kennen.

Dafür braucht das Projekt:

- klare Frontend-Ordnerstruktur
- saubere Seiten- und Feature-Grenzen
- dokumentierte Umgebungsvariablen
- dokumentierte API-Endpunkte
- nachvollziehbare Qualitätslogik
- dokumentiertes Hosting- und Startverfahren

## Ziel für späteres Eigenhosting

Der Datenqualitätsmonitor soll perspektivisch auf einem eigenen Server
betrieben werden können.

Dafür bleibt wichtig:

- Frontend und Backend getrennt deploybar
- Secrets nur serverseitig
- kein direkter OI- oder Meta-Key im Browser
- klarer Build- und Startprozess
- Reverse-Proxy-fähige Struktur

## Konkrete nächste Architekturschritte

1. bestehenden Vanilla-Bestand weiter entkoppeln
2. `scripts.js` weiter auf Seiten-Bootstrap reduzieren
3. neues `frontend/`-Grundgerüst mit `React + Vite + TypeScript` parallel anlegen
4. `Datensätze` als erste Pilotseite im neuen Frontend aufbauen
5. danach weitere Seiten kontrolliert migrieren

## Verbindliche Arbeitsannahme

Für die weitere Planung gilt:

- das Backend auf Render bleibt vorerst stabil
- das Frontend-Ziel ist `React + Vite + TypeScript`
- die Qualitätslogik bleibt fachlich führend
- die Migration erfolgt schrittweise im Parallelbetrieb
