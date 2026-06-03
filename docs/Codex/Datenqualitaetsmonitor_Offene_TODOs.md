# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-03

Diese Datei ist die kompakte TODO-Liste fuer die weitere Arbeit. Der
Kriterienumbau auf die verifizierten Annahmen ist umgesetzt; offen sind vor
allem Verifikation, UI-Anbindung grosser Fehlerlisten und robuste Vollscan-Pfade.

## Erledigt am 2026-06-03

- `Statistik/quality.js` auf verifizierte Kriterienmatrix umgebaut.
- `geo_missing`, `touristtrip_incomplete` und automatische `manual_image_quality` aus aktiven Kriterien entfernt.
- Datentypen je Kriterium korrigiert.
- Reale Helper fuer `texts[]`, `attributes[]`, `features[]`, `features_old[]`, `media_objects[]`, `areas[]` und `categories[]` ergaenzt.
- Lizenzpruefung inklusive `PD` umgesetzt.
- Bildurheberpruefung auf `media_objects[].copyrightText` umgestellt.
- Hotel-Buchungslink ueber `media_objects[rel=booking].url` umgesetzt.
- Verifizierte Query-Konfiguration mit `method`, `positiveQuery`, `missingQuery`, `verifiedForTypes`, `apiByType` und Warnungen ergaenzt.
- `/api/quality/scan` leitet Methode und Query aus `criterionId` + `type` ab.
- Scan-Antwort um Diagnoseinformationen erweitert.
- Beispiel-Diagnose `scripts/diagnose-quality-examples.mjs` ergaenzt.
- npm-Script `diagnose:quality-examples` ergaenzt.

## Naechster Implementierungsschritt

- Frontend-Fehlerlisten an `/api/quality/scan` anbinden, sobald Datentyp und Kriterium eindeutig gewaehlt sind.
- In der Fehlerlisten-UI Methode, Query, Verifikation, Vollstaendigkeit, `overallcount`, Budget und Warnungen anzeigen.
- Browser-Stichprobe und serverseitige Fehlerliste klar voneinander trennen.

## Tests und Diagnose

- Lokal oder in GitHub Actions `npm run check` ausfuehren.
- Lokal oder in GitHub Actions `npm run diagnose:quality-examples` ausfuehren.
- Diagnose-Skript ausbauen:
  - Beispiel-IDs je fehlendem Kriterium ausgeben.
  - Warnungen und offene Verifikationen prominenter ausgeben.
  - optional JSON-Ausgabe fuer spaetere CI-Auswertung.
- Query-Diagnose-Skript gegen destination.one ergaenzen, z. B. `scripts/test-et4-quality-filters.mjs`.
- Plausibilitaet zwischen API-Pushdown und lokalen Helpern stichprobenartig pruefen.

## Offene fachliche Verifikationen

- Package-Buchungslink testen:
  - `type=Package&q=booking:*`
  - `type=Package&q=*:* NOT booking:*`
  - `type=Package&q=*:* -booking:*`
- Package-Beispieldaten nachreichen oder ueber API bereitstellen.
- Hotel `image_missing` fachlich entscheiden und testen:
  - `type=Hotel&q=media:*`
  - `type=Hotel&q=*:* -media:*`
- Hotel `description_missing` fachlich entscheiden und testen:
  - `type=Hotel&q=details:*`
  - `type=Hotel&q=*:* -details:*`
- Event-Beispieldaten optional nachreichen.
- Event-spezifische Kriterien nur nach realer Feld- und Query-Verifikation ergaenzen.
- Logo als Bildpflicht fachlich klaeren; aktuell zaehlen Logos nicht als pruefbare Medien.

## API und grosse Datenmengen

- Fehlerlisten erst nach Datentyp + Kriterium laden.
- Initial Load maximal 1 bis 2 kleine Requests.
- Statistikbereich soll nur Statistik-Counts laden, keine itembasierten Qualitaetsscans.
- Matrix soll zunaechst Struktur zeigen, Counts erst auf Klick oder explizite Aktualisierung.
- Ergebnisse pro Typ/Kriterium cachen oder TTL-Strategie planen.
- Fuer sehr grosse Fehlerlisten spaeter Job-/Snapshot-Endpunkt planen.
- CSV fuer grosse Fehlerlisten an vollstaendige Scan-/Job-Daten anbinden.
- 50-Item-Grenze des aktuellen API-/Proxy-Pfads als eigenes Architekturthema behandeln.

## UI und Export

- Fehlerlisten-UI auf serverseitig paginierte Ergebnisse umstellen.
- Bestehende clientseitige Fehlerliste als Stichprobe kennzeichnen, wenn kein Server-Scan aktiv ist.
- Matrix-CSV optional ergaenzen.
- Exportkontext deutlicher markieren, wenn Daten nur stichprobenbasiert sind.
- Optional Copy-/Export-Aktion fuer einzelne Datensatzdetails ergaenzen.
- Such-/Textfilter nach Server-Scan-Anbindung erneut mit realen Daten pruefen.
- Qualitaetsstatus-, Prioritaets- und Pruefbarkeitsfilter nach Kriterienumbau erneut pruefen.
- Lange Texte, lange URLs und grosse Rohdaten auf Mobile pruefen.

## KI-Chatbot und n8n

- Chatbot weiterhin als Sparringspartner fuer Datenqualitaet schaerfen.
- Systemprompt fuer n8n/one.intelligence anpassen:
  - dialogorientiert.
  - handlungsnah.
  - transparent bei Stichproben.
  - klar bei Aussagen, die einen vollstaendigen Scan erfordern.
- KI-Kontext fuer grosse Datenmengen fachlich klaeren:
  - aktuelles `visibleItemsSample` ist auf 50 reduzierte Datensaetze begrenzt.
  - geeignet fuer Beispiele, nicht fuer vollstaendige Fehlerlisten-Auswertungen.
- Separaten KI-Analysepfad fuer grosse Mengen pruefen:
  - serverseitige/paginierte Voraggregation.
  - Snapshot.
  - Job-Endpunkt.
  - n8n-Workflow, der komplette Fehlerlisten kontrolliert nachlaedt und aggregiert.
- Produktive n8n-Webhook-URL ausserhalb des Repositorys konfigurieren.
- `AI_CHAT_CONFIG.mockMode` fuer echte Tests bewusst auf `false` setzen.
- n8n-CORS auf GitHub-Pages-Domain beschraenken.
- n8n-Webhook mit Authentifizierung, Rate-Limit oder anderer Schutzlogik absichern.
- Keine n8n-Credentials oder one.intelligence-Keys ins Repository.

## Dokumentation

- Nach Server-Scan-UI-Anbindung Projektstand aktualisieren.
- Nach Query-Diagnose Ergebnisse in `Datenqualitaetsmonitor_Verifizierte_Annahmen.md` nachtragen.
- `docs/Codex/Datenqualitaetsmonitor_Verifizierte_Annahmen.md` als verbindliche fachliche Arbeitsgrundlage behandeln.

## Bekannte Risiken

- Clientseitige Qualitaets-KPIs sind stichprobenbasiert, wenn nicht alle Items geladen wurden.
- destination.one/eT4 unterstuetzt nicht automatisch Filter fuer fehlende JSON-Felder.
- Kombinierte Queries aus Nutzerfilter und Missing-Query muessen mit echten API-Requests plausibilisiert werden.
- Grosse Fehlerlisten und CSV-Exporte brauchen einen kontrollierten, paginierten oder jobbasierten Datenpfad.
- Python ist nicht als direkte GitHub-Pages-Laufzeit geeignet.
- Ohne Node in der lokalen Umgebung koennen aktuell keine JS-Syntaxchecks per `node` ausgefuehrt werden.
