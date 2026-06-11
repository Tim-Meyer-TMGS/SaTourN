# Datenqualitaets-Monitor - Entscheidungen

Stand: 2026-06-11

## Architektur

- GitHub Pages liefert die statischen Statistik-Seiten aus.
- Render bleibt vorerst der Node/Express-Proxy fuer geschuetzte
  Destination.One/eT4-Requests.
- Vercel ist eine moegliche spaetere Zielplattform, aber aktuell nicht die
  Betriebsbasis.
- Keine Secrets im Frontend.
- Keine neue Build-Kette fuer die Statistikseiten.
- Bestehende Statistik-Aggregate und itembasierte Qualitaetslogik bleiben
  getrennt.

## Seiten- und UI-Regeln

- Hauptbereiche: Uebersicht, Pflegeaufgaben, Datensaetze,
  Open-Data-Statistik.
- Spezialfunktionen wie CSV, KI, Rohdaten, Datentypvergleich oder
  Kriterienmatrix sind kontextuelle Funktionen, keine gleichwertigen
  Hauptbereiche.
- Der Arbeitskontext im Header ist fuehrend. Zusaetzliche Filter duerfen ihn
  nicht doppeln.
- UI-Tabellen sind Entscheidungshilfen, keine Datenablage. Technische Tiefe
  gehoert in Detailseite, Detailpanel, CSV oder Console.
- Pflegeaufgaben werden nur angezeigt, wenn echte betroffene Datensaetze
  vorliegen.
- Open-Data wird in der UI binaer dargestellt: faehig oder nicht faehig.

## API und Performance

- `/api/search` ist fuer aggregierte Counts und begrenzte Suchlisten.
- `/api/autocomplete` ist nur fuer leichte Suchvorschlaege im Suchfeld.
  Volltextsuche wird nicht pro Tastendruck gestartet.
- `/api/quality/count` ist fuer verifizierte Kriterium-/Typ-Counts.
- `/api/quality/scan` ist fuer konkrete Fehlerlisten nach Nutzeraktion.
- Keine automatischen Vollscans beim Seitenstart.
- Keine Browser-Stichproben fuer ganz Sachsen als Qualitaets-Gesamtwert.
- Server-Scans duerfen budgetiert und paginiert sein. Vollstaendigkeit darf nur
  behauptet werden, wenn Datenbasis und Budget das hergeben.
- Cache-/Snapshot-Code bleibt vorbereitet, aber inaktiv, solange kein bewusstes
  Cache-Setup aktiv geschaltet wird.

## Score und Status

- Ganz Sachsen zeigt keinen Qualitaets-Score.
- Gebiet oder Ort duerfen asynchron regional gescannt werden.
- Score ist Orientierung fuer Datenpflege, keine absolute fachliche Wahrheit.
- Nutzbarkeit und konkrete Pflegewirkung sind wichtiger als die Score-Zahl.

## Kriterien und Queries

- Alte und neue Qualitaets- und Pruefkriterien gelten gemeinsam fachlich.
  Technische Status wie `active`, `needs_verification`, `source_guarded` oder
  `manual_review` entscheiden nur ueber die aktuelle automatische
  Pruefbarkeit, nicht ueber fachliche Gueltigkeit.
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam und duerfen keine sichtbaren Pflegeaufgaben erzeugen.
- Wenn ein Kriterium nur per Server-Scan belastbar ist, wird es nicht ueber
  einen unsauberen API-Pushdown halbaktiv gehalten.
- API-Pushdown nur fuer dokumentiert verifizierte Typ-/Kriterium-Kombinationen.
- Nicht verifizierte Kombis laufen ueber Server-Scan mit
  `Statistik/quality.js`.
- Negative Queries werden nicht generisch erzeugt; Pushdown-Missing-Queries
  werden immer mit `all:all` verankert.
- Generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*` und
  `feature:*` gelten fachlich nicht als belastbar fuer
  `open-data-sachsen-tourismus`.
- `image_author_missing` bleibt Server-Scan; `media:*` ist nur Prefilter.
- Package-`booking_link_missing` bleibt Server-Scan, bis ein API-Pushdown
  verifiziert ist.
- Die POI-Ausschlusslogik ist keine reine UI-Sonderbehandlung. Wenn Kategorien
  fuer Kontakt-, Oeffnungs-, Preis- oder Zahlungsinformationen fachlich
  ausgeschlossen sind, muss dieselbe Regel fuer Count, Fehlerliste,
  Detailseite, Score und Export gelten.
- Die erste produktive Ausschlusswelle ist bereits zentral verankert fuer
  `poi_street_missing`, `poi_phone_missing`, `poi_email_missing`,
  `poi_website_missing`, `opening_hours_missing` und
  `poi_payment_options_missing`.

## Regionale Bewertung

- Ganz Sachsen bleibt eine Count-/Orientierungsansicht ohne berechneten
  Qualitaets-Score.
- Sobald Gebiet oder Ort gesetzt ist, duerfen Uebersicht und Pflegeaufgaben
  denselben regionalen Qualitaetsscan nutzen.
- Servergescannte Kriterien werden nur in diesen begrenzten Arbeitskontexten
  sichtbar, nicht als globale Sachsen-Behauptung.

## Links und externe Systeme

- Automatische ET4-Pages-Links sind nur fuer POI mit `global_id` verifiziert:
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`.
- Weitere Typen bekommen erst nach Verifikation automatische Links.
- Feratel und Outdooractive werden ueber Keywords erkannt; sonst gilt SaTourN.

## KI/n8n

- Das Frontend ruft one.intelligence nicht direkt mit Secrets auf.
- KI bleibt optionale, dezente Aktion.
- An n8n gehen nur reduzierte Dashboard-Kontexte, keine kompletten Rohdaten,
  Bilddaten oder Secrets.
- Produktiver n8n-Betrieb braucht CORS/Auth/Rate-Limit und ein normalisiertes
  Antwortformat.
