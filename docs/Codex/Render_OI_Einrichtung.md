# Render-Einrichtung für one.intelligence

Stand: 2026-06-15

Diese Datei beschreibt nur die produktive OI-Anbindung. Die bestehende
Meta-/Search-/Qualitätskonfiguration bleibt unverändert.

## Neue Environment-Variablen in Render

Im laufenden SaTourN-Proxy-Service zusätzlich hinterlegen:

- `OI_API_KEY`
- `OI_API_BASE=https://oi.destination.one/api`
- `OI_MODEL_MAIL`
- `OI_MODEL_SEARCH`
- `OI_MAIL_CC` optional
- `OI_MAIL_BCC` optional

Wichtig:

- bestehende Variablen für Meta/Search nicht ändern
- bestehenden `LICENSEKEY` nicht ersetzen
- nur die neuen `OI_*`-Variablen ergänzen

## Technischer Zielzustand

Die Anwendung spricht one.intelligence serverseitig über:

- `POST /chat/completions`

an. Deshalb müssen beide verwendeten OI-Modelle mit diesem API-Weg sauber
funktionieren.

## Modell 1: Mailentwurf

In Render als `OI_MODEL_MAIL`.

Anforderungen:

- Chat-Modell
- stabile JSON-Ausgabe
- kurze, sachliche deutsche Texte
- keine HTML-Ausgabe
- keine erfundenen Namen oder Fakten

Empfohlener Systemprompt:

```text
Du erstellst kurze, sachliche und freundliche E-Mail-Entwürfe auf Deutsch.
Du erfindest keine Fakten, Namen oder Felder, die nicht im Input stehen.
Du verwendest keine HTML-Ausgabe, keine Markdown-Ausgabe und keine
technischen Systembegriffe.
Antworte ausschließlich als JSON im Format
{"subject":"...","body":"..."}.
Der Betreff soll kurz und eindeutig sein. Der Text soll für Dateninhaber
verständlich und handlungsorientiert sein.
```

## Modell 2: KI-Suche

In Render als `OI_MODEL_SEARCH`.

Anforderungen:

- Chat-Modell
- sehr stabile JSON-Ausgabe
- direkte Tool-Nutzung für Open Data Sachsen Tourismus
- keine vorgeschaltete Skill-Orchestrierung, die den Tool-Call verdeckt

Wichtige Produktregel:

- Im Suchmodell darf kein vorgeschalteter Skill aktiv sein, der statt des
  Open-Data-Tools aufgerufen wird.
- Produktiv funktioniert die Suche nur sauber, wenn das Modell direkt mit dem
  Tool `server:meta-open-data-sachsen-tourismus` arbeitet.

Empfohlener Systemprompt:

```text
Du analysierst Suchanfragen für touristische Datensätze.
Antworte ausschließlich als JSON im Format
{"ids":["100272502","100261315"]}.
Gib keine Erklärung, kein Markdown und keine weiteren Felder aus.
Liefere nur plausible Datensatz-IDs.
Wenn du unsicher bist, liefere lieber weniger IDs als erfundene IDs.
```

## Werkzeugkonfiguration im OI-Suchmodell

Aktiv lassen:

- `Destination.Meta: Open-Data-Sachsen-Tourismus (OpenAPI)`

Nicht für den produktiven Suchpfad verwenden:

- vorgeschaltete Skills, die im API-Call nur als `tool_calls` auftauchen,
  aber keine finalen IDs zurückliefern

## Deployment in Render

1. Render öffnen
2. den laufenden SaTourN-Proxy-Service auswählen
3. `Environment` öffnen
4. `OI_*`-Variablen ergänzen
5. speichern
6. neuen Deploy starten

## Produktive Testendpunkte

- OI-Status:
  `https://satourn.onrender.com/api/oi/status`
- OI-Werkzeuge:
  `https://satourn.onrender.com/api/oi/tools`
- KI-Suche:
  `https://satourn.onrender.com/api/oi/search-records`
- Mailentwurf:
  `https://satourn.onrender.com/api/oi/mail-draft`

## Funktionsprüfung

### KI-Suche

Erwartung:

- Response enthält `ids`
- keine Debugstruktur nötig
- IDs lassen sich anschließend über `records.html` sauber auflösen

### Mailentwurf

Erwartung:

- Response enthält `to`, optional `cc`/`bcc`, `subject`, `body`
- Frontend erzeugt daraus einen `mailto:`-Link
- lokales Mailprogramm öffnet mit vorausgefüllten Inhalten
