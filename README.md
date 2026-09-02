# SaTourN

SaTourN ist ein React-basierter Datenqualitätsmonitor. Vercel liefert das
Frontend und die Serverless API aus; Neon ist die operative Datenquelle.

## API

Die fachliche API besteht aus drei Entry-Points:

- `GET|POST /api/data?action=...` für Datensuche, Detailauflösung und Qualitätsauswertungen
- `GET|POST /api/system?action=...` für Health, Admin-Metriken und KI-Funktionen
- `GET /api/cron/sync` für den geplanten destination.one-Import

Die fünf Auth-Endpunkte unter `/api/auth/` bilden eine Same-Origin-Brücke zu
Neon Auth. Rollen, Mandanten und die Freigabe einzelner Konten bleiben in den
SaTourN-Anwendungstabellen. Damit erzeugt das Repository insgesamt acht Vercel
Serverless Functions und bleibt unter dem Hobby-Limit.

Alte API-URLs werden in `vercel.json` auf die konsolidierten Entry-Points
umgeschrieben und erzeugen keine zusätzlichen Functions.

## Datenfluss

Das React-Frontend liest operative Daten ausschließlich aus Neon. Der
destination.one-Zugang wird nur vom nächtlichen Import verwendet. Der Import
speichert den konkreten Lizenztyp; `has_license` markiert ausschließlich die
offenen Lizenztypen `CC0`, `CC-BY`, `CC-BY-SA` und `PD`. Andere Werte wie
`CC-BY-NC` bleiben als Lizenztyp erhalten, gelten aber nicht als Open Data.

## Wichtige Umgebungsvariablen

```text
DATABASE_URL
CRON_SECRET
DESTINATION_ONE_API_KEY
DESTINATION_ONE_BASE_URL       optional
DESTINATION_ONE_EXPERIENCE     optional, Standard: statistik_sachsen
DESTINATION_ONE_DATABASE_TEMPLATE optional, Standard: ET2022A.json
DESTINATION_ONE_FULL_SYNC      optional, true aktiviert Abgleich und Löschung fehlender IDs
NEON_AUTH_BASE_URL             oder DATABASE_NEON_AUTH_BASE_URL bei Custom Prefix DATABASE
VITE_NEON_AUTH_URL             oder DATABASE_VITE_NEON_AUTH_URL bei Custom Prefix DATABASE
OI_API_KEY
OI_MODEL_MAIL
OI_MODEL_SEARCH
```

## Entwicklung und Prüfung

```bash
npm install
npm run db:migrate
npm run check
npm run --prefix frontend build
```

Der manuelle Import läuft mit `npm run db:sync`; ein vollständiger Abgleich
kann mit `--full` am Skript ausgeführt werden. Der Vercel-Cron wird über
`DESTINATION_ONE_FULL_SYNC=true` auf einen vollständigen Abgleich gestellt.
