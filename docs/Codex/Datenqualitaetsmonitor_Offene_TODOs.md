# Datenqualitaets-Monitor - Offene TODOs

Stand: 2026-06-03

Diese Datei ist die kompakte TODO-Liste fuer die weitere Arbeit. Sie buendelt offene fachliche, technische und Architekturpunkte aus den bisherigen Abschnittsdokumenten.

## Naechster Schritt

- Manuelle Browser-/UI-Pruefung mit echten destination.one-Daten durchfuehren.
- Danach entscheiden, ob ein weiterer technischer Abschnitt fuer Vollscan-/Export-Anbindung geplant wird.

## Hohe Prioritaet

- UI klar kennzeichnen, wenn Qualitaetsdaten nur stichprobenbasiert sind (`qualityDataMeta.truncated === true`).
- Filterkonsistenz manuell mit echten Daten testen:
  - Statistik-KPIs mit aggregierten Zeilen.
  - Qualitaetsbereiche mit Item-Sample.
  - CSV-Export bei aktiven Zusatzfiltern.
  - KI-Kontext bei aktiven Zusatzfiltern.
  - Detailansicht nach Filterwechsel.
- Empty States visuell mit echten Daten pruefen:
  - noch keine Abfrage.
  - Daten werden geladen.
  - keine Ergebnisse.
  - Fehlerliste ohne Treffer.
  - nicht automatisch pruefbares Kriterium.
  - CSV ohne Daten.
  - KI ohne Daten.
- Grosse Fehlerlisten nicht aus Browser-Samples als vollstaendig darstellen.
- Vollstaendige grosse Fehlerlisten spaeter ueber `/api/quality/scan` oder Job-/Export-Endpunkt anbinden.

## Datenbasis, Pagination und Vollstaendigkeit

- `/api/quality/scan` weiter an UI anbinden, damit Fehlerlisten bei Bedarf kontrolliert paginiert nachgeladen werden koennen.
- Entscheiden, ob fuer vollstaendige Datenqualitaetsauswertungen ein statischer Snapshot, ein Proxy-Scan oder ein eigener Job-Dienst genutzt wird.
- Optionalen Python-Snapshot- oder Job-Pfad erst einfuehren, wenn klar ist:
  - reichen Build-Zeit-Snapshots aus?
  - braucht es einen echten Backend-/Job-Dienst?
- API-Pushdown nur aktivieren, wenn ein destination.one/eT4-Prefix explizit verifiziert wurde.
- Wiederholte Seiten, Timeouts und Scan-Budgets weiter robust behandeln.
- UI und CSV muessen klar unterscheiden zwischen:
  - Statistik-Counts aus `overallcount`.
  - stichprobenbasierten Qualitaetsdaten.
  - vollstaendig gescannten Qualitaetslisten.

## CSV und Exporte

- Matrix-CSV optional ergaenzen.
- Fehlerlisten-CSV spaeter an `/api/quality/scan` oder Job-/Export-Endpunkt anbinden, wenn vollstaendige grosse Fehlerlisten exportiert werden muessen.
- Exportkontext deutlicher markieren, wenn `qualityDataMeta.truncated === true`.
- Optional Copy-/Export-Aktion fuer einzelne Datensatzdetails ergaenzen.
- Erledigt mit Abschnitt 13: alter, nicht mehr verdrahteter Statistik-Exportblock `downloadStatsCsv()` wurde entfernt.

## KI-Chatbot und n8n

- Chatbot produktlogisch als Sparringspartner fuer Datenqualitaet schaerfen, nicht als Daten-Orakel oder vollstaendige Statistik-Engine.
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
- In n8n Payload validieren und Kontextgroesse erneut pruefen.
- one.intelligence-Anbindung in n8n implementieren.
- Antwortformat in n8n auf `{ answer, suggestions, warnings }` normalisieren.
- Production-Webhook verwenden, nicht Test-Webhook.
- Keine n8n-Credentials oder one.intelligence-Keys ins Repository.

## Detailansicht

- Detailpanel spaeter visuell und inhaltlich mit finalen echten destination.one/eT4-Feldnamen schaerfen.
- Feldwert-Ermittlung fuer komplexe verschachtelte eT4-Strukturen erweitern, sobald reale Beispiel-Rohdaten systematisch ausgewertet sind.
- Direkte Detailansicht fuer Ergebnislisten-Aggregate fachlich klaeren:
  - Beispiel-Datensatz.
  - Liste der Sample-Datensaetze.
  - separate Detailauswahl.
- Optional URL im Detailpanel als klickbaren Button statt Text darstellen.
- Optional Fokus-Ruecksprung nach Schliessen praeziser auf ausloesende Tabellenzeile setzen.

## Qualitaetskriterien

- destination.one/eT4-Feldnamen anhand echter Rohdaten validieren.
- Kriterien-Feldlisten bei Bedarf an reale Datenstruktur anpassen.
- `manual_image_quality` redaktionell schaerfen.
- Fuer jedes Kriterium pruefen, ob es spaeter einen verifizierten API-Pushdown geben kann.
- Kriteriengewichte und Schwellenwerte fachlich validieren.

## Frontend-Robustheit und manuelle Pruefung

- Such-/Textfilter final mit realen Daten pruefen.
- Qualitaetsstatus-, Prioritaets- und Pruefbarkeitsfilter final mit realen Daten pruefen.
- Aktive Filter sichtbar und konsistent beschreiben.
- Leere Tabellen und leere Matrix-/Typ-Auswertungen einheitlich behandeln.
- Lange Texte, lange URLs und grosse Rohdaten auf Mobile pruefen.
- Tastaturbedienung fuer neue Panels und Tabellenaktionen weiter pruefen.
- Keine sichtbaren UI-Ueberlagerungen zwischen Chatbot-Panel und Detailpanel zulassen oder Prioritaet bewusst definieren.

## Proxy und API

- `/api/quality/scan` mit realen destination.one-Daten testen.
- Pagination mit `offset` gegen echte API-Antworten validieren.
- Scan-Abbruchgruende in UI nutzbar machen.
- Eventuell Job-Endpunkt fuer lange Scans entwerfen:
  - Start.
  - Status.
  - Ergebnis.
  - Export.
- Caching fuer wiederholte Scans pruefen.

## Dokumentation

- Erledigt mit Abschnitt 13: kompakte Projektstanddatei aktualisiert.
- Erledigt mit Abschnitt 13: kompakte TODO-Datei aktualisiert.
- Lange Zwischenstandsdateien koennen als Historie liegen bleiben, fuer neue Codex-Kontexte bevorzugt diese Dateien laden:
  - `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
  - `docs/Codex/Datenqualitaetsmonitor_Offene_TODOs.md`
  - `docs/Codex/SaTourN_Codex_Prompt_Datenqualitaetsmonitor.md`

## Bekannte Risiken

- Clientseitige Qualitaets-KPIs sind aktuell stichprobenbasiert, wenn nicht alle Items geladen wurden.
- destination.one/eT4 unterstuetzt nicht automatisch Filter fuer fehlende JSON-Felder.
- API-Pushdown darf nur nach expliziter Prefix-Verifikation aktiviert werden.
- Grosse Fehlerlisten und CSV-Exporte brauchen einen kontrollierten, paginierten oder jobbasierten Datenpfad.
- Python ist nicht als direkte GitHub-Pages-Laufzeit geeignet.
- Ohne Node in der lokalen Umgebung koennen aktuell keine JS-Syntaxchecks per `node` ausgefuehrt werden.
