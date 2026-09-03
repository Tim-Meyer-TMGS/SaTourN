# SaTourN

SaTourN ist ein React-basierter Datenqualitätsmonitor. Vercel liefert das
Frontend und die Serverless API aus; Neon ist die operative Datenquelle.

## Laufzeitarchitektur

- `frontend/`: produktive React-/Vite-Anwendung
- `api/data.js`: Datensuche, Details und Qualitätsauswertungen
- `api/system.js`: Health, Admin-Metriken und KI-Funktionen
- `api/cron/sync.js`: geplanter Import aus destination.one
- `api/auth/*.js`: fünf Same-Origin-Endpunkte für Neon Auth
- `lib/`: Fachlogik, Datenbankzugriff, Auth und Integrationen
- `db/migrations/`: idempotente Neon-Migrationen
- `scripts/`: Migration, Import, Diagnose und Verifikation

Damit entstehen acht Vercel Serverless Functions. Kompatibilitäts-URLs in
`vercel.json` sind Rewrites auf die konsolidierten Entry-Points und erzeugen
keine weiteren Functions.

## Datenfluss

Das Frontend liest operative ET4-Daten ausschließlich aus Neon. destination.one
wird nur serverseitig durch den Import angesprochen. Der Import speichert den
konkreten Lizenztyp. `has_license` ist nur für `CC0`, `CC-BY`, `CC-BY-SA`
und `PD` wahr; beispielsweise bleibt `CC-BY-NC` gespeichert, zählt aber
nicht als Open Data.

Outdooractive-Zugänge werden je Nutzergruppe verschlüsselt gespeichert. Der
Browser erhält nur einen maskierten Status; Outdooractive-Aufrufe laufen über
die Serverless API.

## Konfiguration

Erforderlich beziehungsweise funktionsabhängig:

```text
DATABASE_URL
CRON_SECRET
DESTINATION_ONE_API_KEY
DESTINATION_ONE_BASE_URL                 optional
DESTINATION_ONE_EXPERIENCE               optional, Standard: statistik_sachsen
DESTINATION_ONE_DATABASE_TEMPLATE        optional, Standard: ET2022A.json
DESTINATION_ONE_FULL_SYNC                 optional, true aktiviert Vollabgleich
NEON_AUTH_BASE_URL                        alternativ DATABASE_NEON_AUTH_BASE_URL
OI_API_KEY                                für KI-Funktionen
OI_API_BASE                               optional
OI_MODEL_MAIL
OI_MODEL_SEARCH
OI_MAIL_CC                                optional
OI_MAIL_BCC                               optional
TENANT_INTEGRATION_SECRET                mindestens 32 Zeichen, für Integration-Keys
```

## Entwicklung und Prüfung

```bash
npm install
npm install --prefix frontend
npm run db:migrate
npm run check
npm run --prefix frontend build
```

Ein manueller Import läuft mit `npm run db:sync`. Details zu Architektur,
Daten- und Qualitätsmodell stehen unter [`docs/architecture`](docs/architecture).
