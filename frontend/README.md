# SaTourN Frontend

Das produktive Frontend liegt in diesem Verzeichnis und verwendet React, Vite
und TypeScript.

## Lokal starten

```bash
npm install
npm run dev
```

## API-Anbindung

Das Frontend verwendet standardmäßig dieselbe Origin:

```text
/api/data
/api/system
/api/auth/*
```

Die Endpunkte sind als feste Same-Origin-Pfade im Frontend hinterlegt.
destination.one wird nicht aus dem Browser aufgerufen.

Der Outdooractive-Detailabruf ist eine bewusste Ausnahme vom zentralen
Datenfluss. Den Schlüssel gibt der Nutzer ein; die Anwendung hält ihn nur im
Arbeitsspeicher und überträgt ihn direkt an Outdooractive.

Vercel baut das Frontend über die Root-Konfiguration `../vercel.json` und
liefert `frontend/dist` aus.
