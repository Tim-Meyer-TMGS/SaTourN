# Datenqualitaets-Monitor - Entscheidungen

Stand: 2026-06-04

## Architektur

- Das Statistik-Frontend bleibt statisches HTML/CSS/JavaScript auf GitHub Pages.
- Node/Express bleibt Proxy fuer API-Key-geschuetzte Destination.One/eT4-Requests.
- Python wird nicht als GitHub-Pages-Laufzeit eingesetzt. Sinnvolle Python-Pfade
  sind GitHub-Actions-Snapshots, Vollscan-/Export-Jobs oder lokale Analyse.
- Bestehende Statistik-Aggregate und itembasierte Qualitaetsdaten bleiben
  getrennt.

## Datenbasis und Limits

- `/api/search` liefert schnelle Statistik-Counts und begrenzte Item-Samples.
- Browser-Schutz: `SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY`,
  `SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS`, `qualityDataMeta.truncated`.
- `/api/quality/scan` scannt ein konkretes Kriterium fuer einen konkreten Typ
  budgetiert und paginiert.
- Vollstaendigkeit darf nur behauptet werden, wenn Datenbasis und Scan-Budget das
  hergeben. Samples muessen als Samples behandelt werden.

## Kriterien und Queries

- API-Pushdown nur fuer explizit verifizierte Kriterium-/Typ-Kombinationen.
- Nicht verifizierte Kriterien laufen als Server-Scan mit derselben
  `Statistik/quality.js`-Logik.
- Negative Queries duerfen nicht generisch erzeugt werden; Beispiel:
  Hotel-Buchungslink nutzt `*:* NOT booking:*`, nicht `*:* -booking:*`.
- `image_author_missing` bleibt Server-Scan, weil kein verifizierter API-Pushdown
  fuer fehlende `media_objects[].copyrightText` vorliegt.

## Reale Feldmappings

- Lizenz: `attributes[].key = license` mit `CC0`, `CC-BY`, `CC-BY-SA`, `PD`.
- Beschreibung: `texts[].rel = details`, Teaser allein zaehlt nicht.
- Oeffnungszeiten: `texts[].rel = openings`, `timeIntervals[]`, `alwaysOpen`.
- Bild: pruefbare `media_objects[]`, nicht `booking`, `canonical`, `logo`,
  `socialmedia`.
- Bildurheber: pruefbare Medien ohne `copyrightText`.
- OePNV: `features[].value` oder `features_old[]` enthaelt
  `Mit OePNV erreichbar`.
- Hotel-Buchungslink: `media_objects[].rel = booking` mit nicht-leerer `url`.
- Gebiet/Kategorie: `areas[]`/`areas_old[]` und
  `categories[]`/`categories_old[]`.

## KI/n8n

- Das Frontend ruft one.intelligence nicht direkt mit Secrets auf.
- Browser sendet nur reduzierten Dashboard-Kontext an n8n.
- Keine kompletten Rohdaten, Bilddaten oder unnoetigen personenbezogenen Daten in
  den KI-Kontext.
- `buildAiContext()` begrenzt sichtbare Items standardmaessig auf 50 reduzierte
  Datensaetze.
- n8n muss Payload validieren, Kontextgroesse pruefen, CORS/Auth/Rate-Limit
  absichern und Antwort auf `{ answer, suggestions, warnings }` normalisieren.
