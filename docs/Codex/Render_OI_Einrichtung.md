# Render-Einrichtung fuer one.intelligence

Stand: 2026-06-12

Diese Datei beschreibt nur die neuen Schritte fuer die one.intelligence-
Anbindung. Die bestehende Render-Konfiguration fuer `destination.meta`,
Suche und Qualitaetspruefungen bleibt unveraendert.

## Ziel

In Render sollen zusaetzlich zur bestehenden Konfiguration neue
Umgebungsvariablen fuer one.intelligence hinterlegt werden.

Wichtig:

- bestehende Variablen fuer Meta/Search nicht aendern
- bestehenden `LICENSEKEY` oder andere Search-Keys nicht ersetzen
- nur neue OI-Variablen ergaenzen

## Technische Grundregel

Die Anwendung spricht one.intelligence aktuell serverseitig ueber

- `POST /chat/completions`

an. Deshalb muessen die verwendeten OI-Modelle oder OI-Konfigurationen diese
Art von Chat-Aufruf unterstuetzen.

Wichtig:

- die App sendet pro Anfrage bereits eigene System- und User-Nachrichten
- falls du in one.intelligence zusaetzliche feste Systemprompts hinterlegst,
  duerfen diese die JSON-Ausgabe und die Rollenlogik nicht aufweichen
- keine Konfiguration bauen, die Freitext, HTML oder lange Marketingtexte
  erzwingt

## Neue Environment Variables in Render

Diese Variablen im Render-Service des SaTourN-Proxys hinterlegen:

- `OI_API_KEY`
  - dein separater one.intelligence API-Key
- `OI_API_BASE`
  - Wert: `https://oi.destination.one/api`
- `OI_MODEL_MAIL`
  - Modellname fuer Mail-Entwuerfe
- `OI_MODEL_SEARCH`
  - Modellname fuer AI-Search
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

`OI_MAIL_CC` und `OI_MAIL_BCC` koennen zunaechst leer bleiben.

## Wie die beiden Modelle eingerichtet sein sollten

Es gibt fachlich zwei getrennte Anwendungsfaelle. Deshalb sollten auch in
one.intelligence zwei getrennte Modellkonfigurationen oder Modellaliases
existieren.

### 1. Modell fuer Mail-Entwurf

Dieses Modell wird in Render als `OI_MODEL_MAIL` hinterlegt.

Anforderungen:

- Chat-Modell, ansprechbar ueber `/chat/completions`
- deutschsprachige Ausgabe moeglich
- kurze, sachliche Business-Texte
- zuverlaessige JSON-Ausgabe
- keine HTML-Erzeugung
- keine sehr kreative oder werbliche Schreibe

Wenn in one.intelligence Parameter konfigurierbar sind:

- Temperatur eher niedrig
- Ausgabe moeglichst stabil und knapp

Systemprompt-Ziel:

- eine kurze, freundliche und sachliche E-Mail an Dateninhaber schreiben
- keine unbekannten Fakten erfinden
- keine Anrede mit frei erfundenem Namen
- keine technischen API-Begriffe
- nur JSON mit `subject` und `body`

Empfohlener Systemprompt fuer one.intelligence:

```text
Du erstellst kurze, sachliche und freundliche E-Mail-Entwuerfe auf Deutsch.
Du erfindest keine Fakten, Namen oder Felder, die nicht im Input stehen.
Du verwendest keine HTML-Ausgabe, keine Markdown-Ausgabe und keine
technischen Systembegriffe.
Antworte ausschliesslich als JSON im Format
{"subject":"...","body":"..."}.
Der Betreff soll kurz und eindeutig sein. Der Text soll fuer Dateninhaber
verstaendlich und handlungsorientiert sein.
```

### 2. Modell fuer KI-Suche

Dieses Modell wird in Render als `OI_MODEL_SEARCH` hinterlegt.

Anforderungen:

- Chat-Modell, ansprechbar ueber `/chat/completions`
- sehr hohe Formatdisziplin
- keine erklaerenden Texte
- geeignet, aus einem Suchsatz passende touristische Datensaetze abzuleiten
- JSON-Ausgabe mit IDs statt Freitext

Wenn in one.intelligence Parameter konfigurierbar sind:

- Temperatur sehr niedrig
- Fokus auf stabile, reproduzierbare Antworten

Systemprompt-Ziel:

- Suchanfrage interpretieren
- nur passende `global_id`-Werte liefern
- keine Erklaerung, kein Markdown, keine Zusatzfelder

Empfohlener Systemprompt fuer one.intelligence:

```text
Du analysierst Suchanfragen fuer touristische Datensaetze.
Antworte ausschliesslich als JSON im Format
{"globalIds":["type_123","type_456"]}.
Gib keine Erklaerung, kein Markdown und keine weiteren Felder aus.
Liefere nur plausible global_id-Werte.
Wenn du unsicher bist, liefere lieber weniger IDs als erfundene IDs.
```

## Wichtiger Hinweis zu den Systemprompts

Die Anwendung sendet bereits pro Request einen eigenen Systemhinweis mit.
Deine in one.intelligence hinterlegten Systemprompts sollten deshalb:

- denselben JSON-Rahmen bestaetigen
- nicht im Widerspruch zum Code stehen
- nicht laenger oder allgemeiner als noetig sein

Die fachlichen Unterschiede zwischen Mail und Suche sollten ueber zwei
getrennte Modelle oder zwei getrennte Modellkonfigurationen abgebildet
werden, nicht ueber ein einziges gemeinsames Allzweck-Modell.

## Wo du das in Render eintraegst

1. Render oeffnen
2. den laufenden SaTourN-Proxy-Service auswaehlen
3. `Environment` oder `Environment Variables` oeffnen
4. die oben genannten Variablen neu anlegen
5. speichern

## Danach neu deployen

Nach dem Hinterlegen der Variablen:

1. einen neuen Deploy starten
2. warten bis der Deploy erfolgreich abgeschlossen ist
3. danach die Funktionen im Frontend testen

## Was du testen sollst

### 1. Mail-Entwurf

In `Statistik/records.html`:

1. Datensatzliste oeffnen
2. einen Datensatz mit E-Mail-Adresse und Fehlern waehlen
3. in `Aktionen` auf das Mail-Symbol klicken
4. pruefen, ob sich das lokale Mailprogramm mit vorausgefuellter Mail oeffnet

Pruefen:

- Empfaenger korrekt
- Betreff vorhanden
- Text vorhanden
- CC/BCC korrekt, falls gesetzt

### 2. AI-Search

In `Statistik/records.html`:

1. `AI-Search` klicken
2. Suchsatz eingeben
3. Anfrage absenden
4. pruefen, ob Datensaetze geladen werden

Pruefen:

- Datensatzliste wird ersetzt durch KI-Treffer
- Ergebnistext zeigt `KI-Suche`
- Detailseiten der Treffer lassen sich oeffnen
- `Filter zuruecksetzen` verlaesst den KI-Modus

### 3. Regression

Zusatzpruefung:

- normale Datensatzsuche funktioniert weiter
- Pflegeaufgaben funktionieren weiter
- Detailseite funktioniert weiter
- Qualitaetsansichten funktionieren weiter

## Typische Fehlerbilder

### Mail-/AI-Search-Buttons reagieren mit Fehler

Moegliche Ursache:

- `OI_API_KEY` fehlt
- `OI_MODEL_MAIL` oder `OI_MODEL_SEARCH` fehlt
- Deploy nach Variablen-Aenderung noch nicht neu gestartet

### AI-Search liefert keine Datensaetze

Moegliche Ursache:

- Modell liefert keine gueltigen `global_id`
- Modellname ungeeignet
- OI-Antwortformat passt nicht
- Systemprompt erlaubt Freitext statt strikt parsebarem JSON

### Modell antwortet, aber Format ist unbrauchbar

Moegliche Ursache:

- Modell ist zu kreativ konfiguriert
- es gibt nur ein allgemeines Modell fuer beide Faelle
- Systemprompt widerspricht der von der Anwendung erwarteten JSON-Form

### Mail-Button ist deaktiviert

Moegliche Ursache:

- Datensatz hat keine E-Mail-Adresse
- Datensatz hat keine erkannten Pflegeprobleme

## Wichtig fuer spaetere Pflege

Die neuen OI-Variablen sind fachlich getrennt von der bestehenden Search-
Konfiguration:

- Meta/Search/Qualitaet: bestehende Variablen
- one.intelligence: nur `OI_*`

Diese Trennung bitte bei kuenftigen Aenderungen beibehalten.
