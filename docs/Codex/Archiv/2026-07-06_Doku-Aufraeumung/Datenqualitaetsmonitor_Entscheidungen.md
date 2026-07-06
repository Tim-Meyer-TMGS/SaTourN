# Datenqualitäts-Monitor - Entscheidungen

Stand: 2026-06-11

## Architektur

- GitHub Pages liefert die statischen Statistik-Seiten aus.
- Render bleibt vorerst der Node/Express-Proxy für geschützte
  Destination.One/eT4-Reqüsts.
- Vercel ist eine mögliche spätere Zielplattform, aber aktüll nicht die
  Betriebsbasis.
- Keine Secrets im Frontend.
- Keine neü Build-Kette für die Statistikseiten.
- Bestehende Statistik-Aggregate und itembasierte Qualitätslogik bleiben
  getrennt.

## Seiten- und UI-Regeln

- Hauptbereiche: Übersicht, Pflegeaufgaben, Datensätze,
  Open-Data-Statistik.
- Spezialfunktionen wie CSV, KI, Rohdaten, Datentypvergleich oder
  Kriterienmatrix sind kontextülle Funktionen, keine gleichwertigen
  Hauptbereiche.
- Der Arbeitskontext im Header ist führend. Zusätzliche Filter dürfen ihn
  nicht doppeln.
- UI-Tabellen sind Entscheidungshilfen, keine Datenablage. Technische Tiefe
  gehört in Detailseite, Detailpanel, CSV oder Console.
- Pflegeaufgaben werden nur angezeigt, wenn echte betroffene Datensätze
  vorliegen.
- Open-Data wird in der UI binär dargestellt: fähig oder nicht fähig.

## API und Performance

- `/api/search` ist für aggregierte Counts und begrenzte Suchlisten.
- `/api/autocomplete` ist nur für leichte Suchvorschläge im Suchfeld.
  Volltextsuche wird nicht pro Tastendruck gestartet.
- `/api/quality/count` ist für verifizierte Kriterium-/Typ-Counts.
- `/api/quality/scan` ist für konkrete Fehlerlisten nach Nutzeraktion.
- Keine automatischen Vollscans beim Seitenstart.
- Keine Browser-Stichproben für ganz Sachsen als Qualitäts-Gesamtwert.
- Server-Scans dürfen budgetiert und paginiert sein. Vollständigkeit darf nur
  behauptet werden, wenn Datenbasis und Budget das hergeben.
- Cache-/Snapshot-Code bleibt vorbereitet, aber inaktiv, solange kein bewusstes
  Cache-Setup aktiv geschaltet wird.

## Score und Status

- Ganz Sachsen zeigt keinen Qualitäts-Score.
- Gebiet oder Ort dürfen asynchron regional gescannt werden.
- Score ist Orientierung für Datenpflege, keine absolute fachliche Wahrheit.
- Nutzbarkeit und konkrete Pflegewirkung sind wichtiger als die Score-Zahl.

## Kriterien und Qüries

- Alte und neü Qualitäts- und Prüfkriterien gelten gemeinsam fachlich.
  Technische Status wie `active`, `needs_verification`, `source_guarded` oder
  `manual_review` entscheiden nur über die aktülle automatische
  Prüfbarkeit, nicht über fachliche Gültigkeit.
- `source_guarded`, `not_applicable` und `excluded_by_category` sind nicht
  scorewirksam und dürfen keine sichtbaren Pflegeaufgaben erzeugen.
- Wenn ein Kriterium nur per Server-Scan belastbar ist, wird es nicht über
  einen unsauberen API-Pushdown halbaktiv gehalten.
- API-Pushdown nur für dokumentiert verifizierte Typ-/Kriterium-Kombinationen.
- Nicht verifizierte Kombis laufen über Server-Scan mit
  `Statistik/quality.js`.
- Negative Qüries werden nicht generisch erzeugt; Pushdown-Missing-Qüries
  werden immer mit `all:all` verankert.
- Generische Wildcard-Pushdowns wie `street:*`, `details:*`, `openings:*` und
  `feature:*` gelten fachlich nicht als belastbar für
  `open-data-sachsen-tourismus`.
- `image_author_missing` bleibt Server-Scan; `media:*` ist nur Prefilter.
- Package-`booking_link_missing` bleibt Server-Scan, bis ein API-Pushdown
  verifiziert ist.
- Die POI-Ausschlusslogik ist keine reine UI-Sonderbehandlung. Wenn Kategorien
  für Kontakt-, Öffnungs-, Preis- oder Zahlungsinformationen fachlich
  ausgeschlossen sind, muss dieselbe Regel für Count, Fehlerliste,
  Detailseite, Score und Export gelten.
- Die erste produktive Ausschlusswelle ist bereits zentral verankert für
  `poi_street_missing`, `poi_phone_missing`, `poi_email_missing`,
  `poi_website_missing`, `opening_hours_missing` und
  `poi_payment_options_missing`.

## Regionale Bewertung

- Ganz Sachsen bleibt eine Count-/Orientierungsansicht ohne berechneten
  Qualitäts-Score.
- Sobald Gebiet oder Ort gesetzt ist, dürfen Übersicht und Pflegeaufgaben
  denselben regionalen Qualitätsscan nutzen.
- Servergescannte Kriterien werden nur in diesen begrenzten Arbeitskontexten
  sichtbar, nicht als globale Sachsen-Behauptung.

## Links und externe Systeme

- Automatische ET4-Pages-Links sind nur für POI mit `global_id` verifiziert:
  `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/{global_id}/x`.
- Weitere Typen bekommen erst nach Verifikation automatische Links.
- Feratel und Outdooractive werden über Keywords erkannt; sonst gilt SaTourN.

## KI/n8n

- Das Frontend ruft one.intelligence nicht direkt mit Secrets auf.
- KI bleibt optionale, dezente Aktion.
- An n8n gehen nur reduzierte Dashboard-Kontexte, keine kompletten Rohdaten,
  Bilddaten oder Secrets.
- Produktiver n8n-Betrieb braucht CORS/Auth/Rate-Limit und ein normalisiertes
  Antwortformat.
