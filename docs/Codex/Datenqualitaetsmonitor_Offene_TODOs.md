# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-03

Diese Datei ist die kompakte TODO-Liste fuer die weitere Arbeit. Der
Kriterienumbau, die reale Helper-Diagnose, die erste serverseitige
Fehlerlisten-Anbindung und die seitliche UI-Struktur sind umgesetzt; offen
sind vor allem Live-Verifikation, Export und robuste Vollscan-Pfade.

## Erledigt am 2026-06-03

- `Statistik/quality.js` auf verifizierte Kriterienmatrix umgebaut.
- `geo_missing`, `touristtrip_incomplete` und automatische `manual_image_quality` aus aktiven Kriterien entfernt.
- Datentypen je Kriterium korrigiert.
- Reale Helper fuer `texts[]`, `attributes[]`, `features[]`, `features_old[]`, `media_objects[]`, `areas[]` und `categories[]` ergaenzt.
- Schritt C umgesetzt: Dashboard-Normalisierung, Detailanzeige und Proxy-Fehlerlisten nutzen die realen Feldmappings.
- Lizenzpruefung inklusive `PD` umgesetzt.
- Bildurheberpruefung auf `media_objects[].copyrightText` umgestellt.
- Hotel-Buchungslink ueber `media_objects[rel=booking].url` umgesetzt.
- Verifizierte Query-Konfiguration mit `method`, `positiveQuery`, `missingQuery`, `verifiedForTypes`, `apiByType` und Warnungen ergaenzt.
- `/api/quality/scan` leitet Methode und Query aus `criterionId` + `type` ab.
- Scan-Antwort um Diagnoseinformationen erweitert.
- Schritt E umgesetzt: Fehlerlisten laden bei eindeutigem Typ/Kriterium serverseitig ueber `/api/quality/scan`.
- Fehlerlisten-UI zeigt Quelle, Methode, Query, Verifikation, Vollstaendigkeit, `overallcount`, gescannte Items/Seiten und Warnungen.
- Schritt D umgesetzt: alle D-Helper sind in `Statistik/quality.js` verfuegbar.
- Beispiel-Diagnose `scripts/diagnose-quality-examples.mjs` ergaenzt und auf Helper-Zaehler, Beispiel-IDs, Kriterienergebnisse, Query-Infos und Warnungen erweitert.
- npm-Scripts `diagnose:quality-examples` und `diagnose:quality-examples:json` ergaenzt.
- Shortcut-Risiko entfernt: Beschreibung, Bild und Booking werden in `Statistik/quality.js` nicht mehr ueber synthetische Flags wie `descriptionAvailable`, `imageCount` oder `bookingLinkAvailable` als erfuellt markiert.
- Doppelte Medienlogik reduziert: `/api/quality/scan` nutzt fuer pruefbare Medien denselben Helper wie die zentrale Qualitaetslogik.
- Schritt F umgesetzt: seitliche Arbeitsbereich-Navigation ergaenzt und bestehende Bereiche in Views fuer Uebersicht, Statistik, Datenqualitaet, Fehlerlisten, Datentypen, Kriterien, Ergebnisse und KI getrennt.
- Fehlerlisten-Klicks wechseln automatisch in die Fehlerlisten-Ansicht.
- Aktiver Server-Scan uebernimmt geaenderte Typfilter in den API-Kontext.

## Naechster Implementierungsschritt

- Kombinierte destination.one-Queries live verifizieren.
- Danach entscheiden, ob die generische Query-Kombination stabil bleibt oder pro Kriterium/Typ explizit konfiguriert werden muss.
- Separaten Diagnose-/Einstellungsbereich planen, falls Live-Query-Tests direkt im Dashboard sichtbar werden sollen.
- Fehlerlisten-CSV perspektivisch an serverseitige Treffer anbinden.

## Tests und Diagnose

- Lokal oder in GitHub Actions `npm run check` ausfuehren.
- Lokal oder in GitHub Actions `npm run diagnose:quality-examples` ausfuehren.
- Optional maschinenlesbar ausfuehren: `npm run diagnose:quality-examples:json`.
- Kombinierte destination.one-Queries live testen, weil Basisfilter und Missing-Query aktuell serverseitig mit `AND` kombiniert werden:
  - `area:"Sachsen" AND (*:* NOT booking:*)` bzw. die vom Proxy erzeugte Variante fuer Hotel.
  - `area:"Sachsen" AND (*:* -openings:*)` fuer POI/Gastro.
  - `category:"..." AND (*:* -details:*)` fuer POI/Gastro/Tour.
  - `category:"..." AND (*:* -media:*)` fuer POI/Gastro/Tour.
  - `area:"Sachsen" AND (*:* -feature:"Mit OePNV erreichbar")` fuer die OePNV-Pruefung.
- Falls kombinierte Negativqueries bei destination.one nicht stabil funktionieren, Query-Komposition pro Kriterium/Typ explizit konfigurieren statt generisch zu kombinieren.
- Diagnose-Skript bei Bedarf weiter ausbauen:
  - feste Erwartungswerte je Beispiel-Datei definieren, sobald fachlich gewuenschte Zielquoten bekannt sind.
  - API-Abgleich gegen Live-Queries integrieren, sobald Query-Diagnose stabil ist.
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

- Fehlerlisten laden serverseitig erst nach Datentyp + Kriterium; fuer uneindeutige Problemcluster bleibt die Browser-Stichprobe aktiv.
- Initial Load maximal 1 bis 2 kleine Requests.
- Statistikbereich soll nur Statistik-Counts laden, keine itembasierten Qualitaetsscans.
- Matrix soll zunaechst Struktur zeigen, Counts erst auf Klick oder explizite Aktualisierung.
- Ergebnisse pro Typ/Kriterium cachen oder TTL-Strategie planen.
- Fuer sehr grosse Fehlerlisten spaeter Job-/Snapshot-Endpunkt planen.
- CSV fuer grosse Fehlerlisten an vollstaendige Scan-/Job-Daten anbinden.
- 50-Item-Grenze des aktuellen API-/Proxy-Pfads als eigenes Architekturthema behandeln.

## UI und Export

- Server-Fehlerlisten mit echten Daten manuell im Browser pruefen.
- Seitliche Navigation auf Desktop, Tablet und Mobile visuell pruefen.
- Bestehende clientseitige Fehlerliste bleibt Fallback/Stichprobe, wenn kein eindeutiger Datentyp vorliegt.
- Matrix-CSV optional ergaenzen.
- Exportkontext deutlicher markieren, wenn Daten nur stichprobenbasiert sind.
- Optional Copy-/Export-Aktion fuer einzelne Datensatzdetails ergaenzen.
- Such-/Textfilter nach Server-Scan-Anbindung erneut mit realen Daten pruefen.
- Qualitaetsstatus-, Prioritaets- und Pruefbarkeitsfilter nach Kriterienumbau erneut pruefen.
- Lange Texte, lange URLs und grosse Rohdaten auf Mobile pruefen.
- Eigenen Diagnose-/Einstellungsbereich ergaenzen, wenn API-Diagnosen, Limits oder Scan-Parameter im UI steuerbar werden sollen.

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
