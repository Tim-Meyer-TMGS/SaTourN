# Render-Einrichtung für one.intelligence

Stand: 2026-06-12

Diese Datei beschreibt nur die neün Schritte für die one.intelligence-
Anbindung. Die bestehende Render-Konfiguration für `destination.meta`,
Suche und Qualitätsprüfungen bleibt unverändert.

## Ziel

In Render sollen zusätzlich zur bestehenden Konfiguration neü
Umgebungsvariablen für one.intelligence hinterlegt werden.

Wichtig:

- bestehende Variablen für Meta/Search nicht ändern
- bestehenden `LICENSEKEY` oder andere Search-Keys nicht ersetzen
- nur neü OI-Variablen ergänzen

## Technische Grundregel

Die Anwendung spricht one.intelligence aktüll serverseitig über

- `POST /chat/completions`

an. Deshalb müssen die verwendeten OI-Modelle oder OI-Konfigurationen diese
Art von Chat-Aufruf unterstützen.

Wichtig:

- die App sendet pro Anfrage bereits eigene System- und User-Nachrichten
- falls du in one.intelligence zusätzliche feste Systemprompts hinterlegst,
  dürfen diese die JSON-Ausgabe und die Rollenlogik nicht aufweichen
- keine Konfiguration baün, die Freitext, HTML oder lange Marketingtexte
  erzwingt

## Neü Environment Variables in Render

Diese Variablen im Render-Service des SaTourN-Proxys hinterlegen:

- `OI_API_KEY`
  - dein separater one.intelligence API-Key
- `OI_API_BASE`
  - Wert: `https://oi.destination.one/api`
- `OI_MODEL_MAIL`
  - Modellname für Mail-Entwürfe
- `OI_MODEL_SEARCH`
  - Modellname für AI-Search
- `OI_MAIL_CC`
  - optional, mehrere Adressen mit Komma oder Semikolon trennen
- `OI_MAIL_BCC`
  - optional, mehrere Adressen mit Komma oder Semikolon trennen

## Empfohlene Minimal-Konfiguration

Wenn du erst einmal klein starten willst:

- `OI_API_KEY`
- `OI_API_BASE=https://oi.destination.one/api`
- `OI_MODEL_MAIL=<dein-mail-modell>`
- `OI_MODEL_SEARCH=<dein-search-modell>`

`OI_MAIL_CC` und `OI_MAIL_BCC` können zunächst leer bleiben.

## Wie die beiden Modelle eingerichtet sein sollten

Es gibt fachlich zwei getrennte Anwendungsfälle. Deshalb sollten auch in
one.intelligence zwei getrennte Modellkonfigurationen oder Modellaliases
existieren.

### 1. Modell für Mail-Entwurf

Dieses Modell wird in Render als `OI_MODEL_MAIL` hinterlegt.

Anforderungen:

- Chat-Modell, ansprechbar über `/chat/completions`
- deutschsprachige Ausgabe möglich
- kurze, sachliche Business-Texte
- zuverlässige JSON-Ausgabe
- keine HTML-Erzeugung
- keine sehr kreative oder werbliche Schreibe

Wenn in one.intelligence Parameter konfigurierbar sind:

- Temperatur eher niedrig
- Ausgabe möglichst stabil und knapp

Systemprompt-Ziel:

- eine kurze, freundliche und sachliche E-Mail an Dateninhaber schreiben
- keine unbekannten Fakten erfinden
- keine Anrede mit frei erfundenem Namen
- keine technischen API-Begriffe
- nur JSON mit `subject` und `body`

Empfohlener Systemprompt für one.intelligence:

```text
Du erstellst kurze, sachliche und freundliche E-Mail-Entwürfe auf Deutsch.
Du erfindest keine Fakten, Namen oder Felder, die nicht im Input stehen.
Du verwendest keine HTML-Ausgabe, keine Markdown-Ausgabe und keine
technischen Systembegriffe.
Antworte ausschliesslich als JSON im Format
{"subject":"...","body":"..."}.
Der Betreff soll kurz und eindeutig sein. Der Text soll für Dateninhaber
verständlich und handlungsorientiert sein.
```

### 2. Modell für KI-Suche

Dieses Modell wird in Render als `OI_MODEL_SEARCH` hinterlegt.

Anforderungen:

- Chat-Modell, ansprechbar über `/chat/completions`
- sehr hohe Formatdisziplin
- keine erklärenden Texte
- geeignet, aus einem Suchsatz passende touristische Datensätze abzuleiten
- JSON-Ausgabe mit IDs statt Freitext

Wenn in one.intelligence Parameter konfigurierbar sind:

- Temperatur sehr niedrig
- Fokus auf stabile, reproduzierbare Antworten

Systemprompt-Ziel:

- Suchanfrage interpretieren
- nur passende `global_id`-Werte liefern
- keine Erklärung, kein Markdown, keine Zusatzfelder

Empfohlener Systemprompt für one.intelligence:

```text
Du analysierst Suchanfragen für touristische Datensätze.
Antworte ausschliesslich als JSON im Format
{"globalIds":["type_123","type_456"]}.
Gib keine Erklärung, kein Markdown und keine weiteren Felder aus.
Liefere nur plausible global_id-Werte.
Wenn du unsicher bist, liefere lieber weniger IDs als erfundene IDs.
```

## Wichtiger Hinweis zu den Systemprompts

Die Anwendung sendet bereits pro Reqüst einen eigenen Systemhinweis mit.
Deine in one.intelligence hinterlegten Systemprompts sollten deshalb:

- denselben JSON-Rahmen bestätigen
- nicht im Widerspruch zum Code stehen
- nicht länger oder allgemeiner als nötig sein

Die fachlichen Unterschiede zwischen Mail und Suche sollten über zwei
getrennte Modelle oder zwei getrennte Modellkonfigurationen abgebildet
werden, nicht über ein einziges gemeinsames Allzweck-Modell.

## Wo du das in Render einträgst

1. Render öffnen
2. den laufenden SaTourN-Proxy-Service auswählen
3. `Environment` oder `Environment Variables` öffnen
4. die oben genannten Variablen neu anlegen
5. speichern

## Danach neu deployen

Nach dem Hinterlegen der Variablen:

1. einen neün Deploy starten
2. warten bis der Deploy erfolgreich abgeschlossen ist
3. danach die Funktionen im Frontend testen

## Was du testen sollst

### 1. Mail-Entwurf

In `Statistik/records.html`:

1. Datensatzliste öffnen
2. einen Datensatz mit E-Mail-Adresse und Fehlern wählen
3. in `Aktionen` auf das Mail-Symbol klicken
4. prüfen, ob sich das lokale Mailprogramm mit vorausgefüllter Mail öffnet

Prüfen:

- Empfänger korrekt
- Betreff vorhanden
- Text vorhanden
- CC/BCC korrekt, falls gesetzt

### 2. AI-Search

In `Statistik/records.html`:

1. `AI-Search` klicken
2. Suchsatz eingeben
3. Anfrage absenden
4. prüfen, ob Datensätze geladen werden

Prüfen:

- Datensatzliste wird ersetzt durch KI-Treffer
- Ergebnistext zeigt `KI-Suche`
- Detailseiten der Treffer lassen sich öffnen
- `Filter zurücksetzen` verlässt den KI-Modus

### 3. Regression

Zusatzprüfung:

- normale Datensatzsuche funktioniert weiter
- Pflegeaufgaben funktionieren weiter
- Detailseite funktioniert weiter
- Qualitätsansichten funktionieren weiter

## Typische Fehlerbilder

### Mail-/AI-Search-Buttons reagieren mit Fehler

Mögliche Ursache:

- `OI_API_KEY` fehlt
- `OI_MODEL_MAIL` oder `OI_MODEL_SEARCH` fehlt
- Deploy nach Variablen-Änderung noch nicht neu gestartet

### AI-Search liefert keine Datensätze

Mögliche Ursache:

- Modell liefert keine gültigen `global_id`
- Modellname ungeeignet
- OI-Antwortformat passt nicht
- Systemprompt erlaubt Freitext statt strikt parsebarem JSON

### Modell antwortet, aber Format ist unbrauchbar

Mögliche Ursache:

- Modell ist zu kreativ konfiguriert
- es gibt nur ein allgemeines Modell für beide Fälle
- Systemprompt widerspricht der von der Anwendung erwarteten JSON-Form

### Mail-Button ist deaktiviert

Mögliche Ursache:

- Datensatz hat keine E-Mail-Adresse
- Datensatz hat keine erkannten Pflegeprobleme

## Wichtig für spätere Pflege

Die neün OI-Variablen sind fachlich getrennt von der bestehenden Search-
Konfiguration:

- Meta/Search/Qualität: bestehende Variablen
- one.intelligence: nur `OI_*`

Diese Trennung bitte bei künftigen Änderungen beibehalten.
