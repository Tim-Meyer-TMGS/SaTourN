# API-Konsolidierung

Stand: 2026-09-02

## Produktive Entry-Points

Die operative Vercel-API verwendet drei fachliche Entry-Points:

| Entry-Point | Aktionen |
| --- | --- |
| `/api/data` | `search`, `records-by-ids`, `quality-count`, `quality-scan`, `quality-list`, `quality-summary` |
| `/api/system` | `health`, `admin-overview`, `ai-search`, `mail-draft` |
| `/api/cron/sync` | geplanter destination.one-Import nach Neon |

Die fünf bestehenden Auth-Endpunkte bleiben bis zur separaten Auth-Migration
erhalten. Insgesamt entstehen damit acht Serverless Functions. Alte fachliche
URLs sind ausschließlich Vercel-Rewrites und keine zusätzlichen Functions.

## Datenquellen

- Das Frontend liest Datensätze und Qualitätskennzahlen ausschließlich aus Neon.
- destination.one wird ausschließlich vom serverseitigen Import angesprochen.
- Die frühere zweite Experience `open-data-sachsen-tourismus` wird nicht mehr geladen.
- Der konkrete Lizenztyp wird in `et4_records.license_type` gespeichert.
- `has_license` ist nur für `CC0`, `CC-BY`, `CC-BY-SA` und `PD` wahr.
- Nicht offene Typen wie `CC-BY-NC`, `CC-BY-NC-SA`, `CC-BY-ND` oder
  `CC-BY-NC-ND` bleiben auswertbar, werden aber nicht als Open Data gezählt.

## Trennung

Die Dateien unter `/api` enthalten nur die Vercel-Entry-Points. Datenbank-,
Mandanten-, Quality-, Import- und Integrationslogik liegt unter `/lib`.

Entfernt wurden der Express-Server, die Route-Registrierungen, der Render-
Warmup, In-Memory-/Redis-Snapshot-Code, die Open-Data-Membership-Synchronisation
und die dazugehörigen Skripte und Workflows.
