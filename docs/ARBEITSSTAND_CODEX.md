# Arbeitsstand Codex

Stand: 3. September 2026

## Umgesetzt

### Datensatzliste

- Direkter Aufruf lädt sofort die serverseitig auf den angemeldeten Nutzer
  begrenzten Datensätze.
- Suche, Datentyp, Kategorie, Autorschaft, Qualitätskriterium, Seite und
  Seitengröße werden in der URL geführt.
- Filter werden vor der Pagination in PostgreSQL angewendet.
- Die API liefert exakte Werte für `totalItems` und `totalPages`.
- Pflegeaufgabenparameter bleiben erhalten und werden serverseitig ausgewertet.
- Filteroptionen werden innerhalb des erlaubten Gebietsbereichs vom Server
  geladen.
- Die Rücknavigation aus dem Detail nutzt die vollständige Listen-URL.

### Datensatzdetail

- Kompakte Übersicht mit Hauptbild, Titel, Typ, Ort/Gebiet, Kategorie,
  Beschreibung, Teaser, Gesamt-DQ, offenem Prüfpunkt und Pflegesystem.
- Zentrale View-Model-Zuordnung für zehn Prüfgruppen.
- Gruppen-DQ wird ausschließlich aus den bestehenden erfüllten und fehlenden
  Qualitätskriterien abgeleitet. Manuelle und nicht bewertbare Kriterien
  mindern den Wert nicht.
- Wiederverwendbares, per Tastatur bedienbares Accordion mit
  `aria-expanded` und `aria-controls`.
- Technische Daten sind für normale Nutzer ausgeblendet und standardmäßig
  geschlossen.
- Der bisherige große Outdooractive-Block und der Browser-Zugangsspeicher sind
  entfernt. Ein sekundärer Abruf liegt in der Quellengruppe.

### Outdooractive

- Migration für generische `tenant_integrations`.
- AES-256-GCM-Verschlüsselung über `TENANT_INTEGRATION_SECRET`.
- API Keys werden niemals unmaskiert zurückgegeben oder im Browser gespeichert.
- `GROUP_ADMIN` verwaltet ausschließlich die eigene Nutzergruppe;
  `SUPER_ADMIN` darf alle Nutzergruppen verwalten.
- Änderungen werden ohne Secret im Audit-Log protokolliert.
- Outdooractive-Abrufe laufen serverseitig und prüfen vorher, ob der Datensatz
  im erlaubten Gebietsbereich liegt.
- Administrationsoberfläche für die eigene sowie, im Nutzergruppen-Editor, für
  ausgewählte Nutzergruppen.

### Kategorien

- Migration für `categories` und `record_categories` mit Foreign Keys,
  Unique Constraints und Indizes.
- Bestehende Kategorieangaben werden in der Migration nachgezogen.
- Der Import liest den offiziellen destination.one-Categories-Endpunkt,
  speichert den Baum und aktualisiert Datensatzrelationen idempotent.
- Der Endpunkt liefert keine stabilen Kategorie-IDs. Deshalb werden interne,
  deterministische IDs aus Experience, Datentyp und Name gebildet.
- Serverseitiger Filter über `categoryId`/`categoryIds`.
- Die KI-Suche kann Kategorien in einen strukturierten Suchplan überführen;
  die Treffer werden anschließend in PostgreSQL ermittelt.

### Oberfläche

- Zentrale Tokens für 4-/8-Pixel-Abstände, Radien und Control-Höhen.
- Detailansicht für einspaltige Darstellung auf kleinen Bildschirmen.
- Mobile Navigation als Drawer mit Overlay, Escape-Taste und Fokus-Rückgabe.
- Zentrale sichtbare Texte in den bearbeiteten Ansichten sachlicher und kürzer
  formuliert.

## Datenbank

- Neue Migration: `db/migrations/011_create_integrations_and_categories.sql`
- Neue Tabellen: `tenant_integrations`, `categories`, `record_categories`
- Die Migration wurde nicht gegen eine Live-Datenbank ausgeführt.

## Neue und geänderte API-Verträge

- `GET /api/data?action=search`: exakte `pagination` und serverseitige
  Listenfilter.
- `GET /api/data?action=record-filter-options`: erlaubte Filterwerte.
- `GET /api/data?action=outdooractive-detail&id=...`: geschützter,
  tenantbezogener Serverabruf.
- `GET|POST /api/system?action=admin-tenant-integration`: maskierte Abfrage und
  verschlüsseltes Speichern der Tenant-Integration.

## Prüfungen

Erfolgreich ausgeführt:

- Syntaxprüfung aller JavaScript- und MJS-Dateien
- `scripts/test-auth-domain-rules.mjs`
- `scripts/test-compact-et4-records.mjs`
- `scripts/test-record-query-and-integrations.mjs`
- `scripts/test-api-entrypoints.mjs`
- TypeScript-Projektbuild (`tsc -b frontend`)
- Vite-Produktionsbuild

`npm` ist in der aktuellen Shell nicht im `PATH`. Die in `npm run check`
enthaltenen Prüfungen wurden deshalb direkt mit der vorhandenen Node-Laufzeit
ausgeführt.

## Noch offen

- Migration bewusst in einer Zielumgebung ausführen und Backfill kontrollieren.
- Live-Integrationstest mit echten Rollen, Tenant-Daten und Outdooractive-Key.
- Eigener Button „Verbindung testen“ mit persistiertem Teststatus.
- Automatisierte React-Tests für Accordion, URL-State und Rücknavigation.
- Manuelle visuelle QA bei 1440, 1280, 1024, 768 und 390 Pixeln.
- Redaktionelle Vollprüfung der nicht in diesem Arbeitsblock geänderten Seiten.
- Filterkomponenten bei Bedarf weiter aus `RecordsPage.tsx` auslagern.
