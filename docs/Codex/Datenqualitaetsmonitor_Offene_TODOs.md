# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-04

Diese Datei enthaelt nur offene, umsetzungsrelevante Punkte. Erledigte
Abschnittshistorie liegt im Archiv.

## Prioritaet 1: UI mit echten Daten pruefen

- Arbeitsbereiche im Browser mit realen Destination.One-Daten testen:
  Ueberblick, Statistik, Datenqualitaet, Fehlerlisten, Datentypen, Kriterien,
  Ergebnisse, KI-Analyse.
- Mobile Darstellung der Seitenleiste auf Tablet und Smartphone pruefen.
- Empty States je Arbeitsbereich nachschaerfen, besonders vor der ersten Abfrage.
- Lange Texte, URLs, grosse Tabellen und Rohdaten im Detailpanel pruefen.

## Prioritaet 2: ET4-Pages-Links erweitern

- Pages-Pfade fuer Hotel, Gastro, Tour, Event und Package mit echten
  `global_id`-Werten verifizieren.
- Erst danach Typen in `VERIFIED_ET4_PAGE_TYPES` in Frontend und Proxy aufnehmen.
- Sicherstellen, dass Items ohne `global_id` keinen geratenen Pages-Link
  erhalten.
- Optional Copy-Aktion fuer Pages-Link und Global-ID in der Detailansicht planen.

## Prioritaet 3: KI/n8n produktiv absichern

- n8n-Webhook mit realer Browser-Anfrage testen.
- CORS auf die produktive GitHub-Pages-Domain begrenzen.
- Authentifizierung, Rate-Limit oder andere Schutzlogik in n8n festlegen.
- Pruefen, ob der sichtbare Header `satourn: satourn` ersetzt werden muss.
- Systemprompt weiter schaerfen: dialogorientiert, handlungsnah, transparent bei
  Stichproben, klar bei Aussagen mit Vollscan-Bedarf.

## Prioritaet 4: Query-Verifikation

- Kombinierte destination.one-Queries live testen, weil Basisfilter und
  Missing-Query serverseitig mit `AND` kombiniert werden.
- Kritische Beispiele: Hotel `*:* NOT booking:*`, POI/Gastro `*:* -openings:*`,
  Beschreibung `*:* -details:*`, Bild `*:* -media:*`, OePNV-Feature.
- Falls kombinierte Negativqueries instabil sind, Query-Komposition pro
  Kriterium/Typ explizit konfigurieren.
- Optional Skript `scripts/test-et4-quality-filters.mjs` ergaenzen.

## Prioritaet 5: Grosse Listen und Exporte

- Fehlerlisten-CSV an serverseitige Treffer anbinden, nicht nur an
  Browser-Samples.
- Fuer sehr grosse Fehlerlisten Job-/Snapshot-Endpunkt planen.
- Cache-/TTL-Strategie fuer Typ/Kriterium-Ergebnisse klaeren.
- Python nur fuer GitHub-Actions-Snapshots, Vollscan-/Export-Jobs oder lokale
  Analysewerkzeuge einsetzen.

## Fachlich offen

- Package-Buchungslink: Query und Feldstruktur testen.
- Hotel `image_missing` und `description_missing` fachlich entscheiden und mit
  `media:*` bzw. `details:*` testen.
- Event-Beispieldaten nachreichen, bevor Event-spezifische Kriterien entstehen.
- Klaeren, ob Logo als Bildpflicht zaehlt; aktuell zaehlen Logos nicht als
  pruefbare Medien.
