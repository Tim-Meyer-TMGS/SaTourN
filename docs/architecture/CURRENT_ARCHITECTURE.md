# Aktuelle Architektur

Stand: 3. September 2026

## Betrieb

SaTourN wird als ein Vercel-Projekt betrieben. Vercel baut `frontend/` und
liefert `frontend/dist` aus. Neon stellt PostgreSQL und Neon Auth bereit.
Jekyll, GitHub Pages, Render und ein allgemeiner Proxy gehören nicht mehr zur
Laufzeitarchitektur.

## Serverless Functions

Das Repository erzeugt acht Functions:

```text
api/
├── data.js
├── system.js
├── cron/
│   └── sync.js
└── auth/
    ├── change-password.js
    ├── forgot-password.js
    ├── login.js
    ├── logout.js
    └── session.js
```

`data.js` und `system.js` wählen ihre Operation über `action`. Alte
fachliche URLs werden in `vercel.json` darauf umgeschrieben; ein Rewrite ist
keine zusätzliche Function. Die Auth-Endpunkte sind eine Same-Origin-Brücke zu
Neon Auth und sorgen insbesondere für die korrekte Session-Cookie-Behandlung.

## Zuständigkeiten

- `api/`: dünne Vercel-Entry-Points
- `lib/api/`: HTTP-, Zugriffs- und Service-Logik
- `lib/database/`: Projektion, Persistenz und Synchronisation
- `lib/auth/`: Neon-Auth-Brücke und Mandantenzuordnung
- `lib/quality/`: zentrale Kriterien und Bewertungslogik
- `lib/integrations/`: explizite externe Serverintegrationen
- `frontend/src/`: produktive Benutzeroberfläche
- `scripts/`: manuelle Betriebs-, Migrations- und Diagnoseskripte

## Externe Systeme

- **destination.one:** ausschließlich serverseitige Quelle des geplanten oder
  manuellen Imports; kein Browserzugriff.
- **One Intelligence:** serverseitige Integration für Datensatzsuche und
  Mailentwürfe über `api/system.js`.
- **Outdooractive:** direkter Detailabruf im Browser. Projektkennung und Key
  werden vom Nutzer eingegeben, nur im Arbeitsspeicher gehalten und nicht
  gecacht. Diese Ausnahme bleibt bestehen, bis ein eigener Sicherheitsumbau
  beauftragt wird.

## Zugriff

Fachliche Datenendpunkte benötigen eine gültige Neon-Auth-Sitzung und ein
aktives SaTourN-Profil. Rolle, Mandant und erlaubte Gebiete werden aus den
Anwendungstabellen geladen. Der Admin-Bereich ist vorhanden, wird aber in einem
eigenen Arbeitsschritt weiterentwickelt. Der dafür erhaltene Arbeitsstand steht
in `ADMIN_BACKLOG.md`.
