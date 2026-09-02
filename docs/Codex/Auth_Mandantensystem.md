# Authentifizierung und Mandanten

Stand: 2026-09-02

## Umgesetzte erste Stufe

- Better Auth mit E-Mail und Passwort
- keine öffentliche Registrierung
- sichere, serverseitige Sessions in Neon
- Login-Rate-Limit über eine Datenbanktabelle
- erzwungener Passwortwechsel für initiale und zurückgesetzte Konten
- Rollen `USER`, `GROUP_ADMIN` und `SUPER_ADMIN`
- Root-Mandant TMGS mit Zugriff auf alle Areas
- initiale Mandantenstruktur für TMGS, Sächsische Schweiz, Leipzig und Chemnitz Zwickau Region
- exakte E-Mail-Domainprüfung aus einer geschützten Vercel-Variable
- fachliche Vercel-APIs liefern ohne Session `401`
- Nutzer mit erzwungenem Passwortwechsel erhalten bis zur Änderung `403`
- serverseitige Area-Begrenzung für zukünftige Nicht-Root-Mandanten
- Audit-Grundstruktur und leichtgewichtige Super-Admin-Kennzahlen

Passwörter werden ausschließlich durch Better Auth als Scrypt-Hash gespeichert.
Temporäre Klartextpasswörter werden weder in Git noch in Audit-Logs abgelegt.

## Erforderliche Vercel-Variablen

Alle Variablen werden serverseitig, als `Sensitive` und mindestens für
`Production` angelegt:

- `BETTER_AUTH_SECRET`: kryptografisch zufälliger Wert mit mindestens 32 Zeichen
- `BETTER_AUTH_URL`: vollständige öffentliche Production-Origin ohne Pfad
- `TENANT_EMAIL_DOMAINS_JSON`: JSON-Objekt aus Tenant-Slug und erlaubten Domains

Beispielstruktur ohne echte Domains:

```json
{
  "tmgs": ["example.org"]
}
```

Die Domainliste wird nicht im Repository gespeichert. Fehlt sie oder ist sie
ungültig, schlägt die Identitätsprüfung geschlossen fehl.

Optional können mit `BETTER_AUTH_TRUSTED_ORIGINS` weitere, kommaseparierte und
explizit freigegebene Origins ergänzt werden. Wildcards sollen vermieden werden.

## Öffentliche Endpunkte

- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/auth/change-password` benötigt bereits eine Session
- `GET /api/auth/forgot-password`
- `GET /api/health`

Der Better-Auth-Sign-up-Endpunkt wird nicht veröffentlicht.

## Noch offen

- vollständige Nutzerverwaltung im Super-Admin-Bereich
- Passwort-Reset und Session-Widerruf über das Admin-UI
- Pflege der Area-Zuordnungen im Admin-UI
- Benutzerprofil außerhalb der kompakten Kopfzeile
- persistente nutzerbezogene Outdooractive-Einstellungen
- Schutz beziehungsweise Migration der noch auf Render liegenden One-Intelligence-Endpunkte
- automatisierte Tests für Nicht-Root-Mandanten und manipulierte Area-Anfragen
