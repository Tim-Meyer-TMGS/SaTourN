# Arbeitsanweisung für SaTourN

SaTourN ist ein React-/Vite-Datenqualitätsmonitor auf Vercel mit Neon als
operativer Datenbank und Neon Auth als Authentifizierungsdienst.

## Vor Änderungen lesen

- immer: `docs/architecture/CURRENT_ARCHITECTURE.md`
- für Repository- oder API-Arbeit: `docs/architecture/REPO_AUDIT.md`
- für Datenbank/Import: `docs/architecture/DATA_MODEL.md`
- für Kriterien/Qualität: `docs/architecture/QUALITY_MODEL.md`
- für Admin-Funktionen: `docs/architecture/ADMIN_BACKLOG.md`

Große Fixtures unter `testdata/quality-examples/` nur laden, wenn sie für die
Aufgabe benötigt werden.

## Verbindliche Grenzen

- `frontend/` ist die einzige produktive Benutzeroberfläche.
- Nur Dateien unter `api/` werden zu Vercel Serverless Functions.
- API-Entry-Points bleiben dünn; Fachlogik gehört nach `lib/`.
- Neon ist die operative Datenquelle des Frontends.
- destination.one darf nur serverseitig für den Datenimport genutzt werden.
- Auth-Code, Mandanten- und Rollenprüfung nicht ohne eigenen Auftrag umbauen.
- Outdooractive-Zugangsdaten werden je Mandant serverseitig verschlüsselt
  gespeichert und niemals unmaskiert an den Browser gegeben.
- Zufalls-/Beispieldatenabruf, Outdooractive-Details und One Intelligence sind
  aktive Produktfunktionen und keine Altlasten.
- Keine Secrets in Quellcode, Browser-Storage, Logs, Snapshots oder Cache legen.
- Keine neue Hosting-, Proxy- oder Build-Infrastruktur neben Vercel einführen.

## Prüfung

Nach Änderungen mindestens die betroffenen Verträge prüfen. Für einen
vollständigen lokalen Durchlauf:

```bash
npm run check
npm run --prefix frontend build
```

Live- oder schreibende Datenbankskripte nur ausführen, wenn die Aufgabe dies
erfordert und die passende Umgebung bewusst ausgewählt wurde.
