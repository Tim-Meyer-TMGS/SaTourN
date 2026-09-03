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

Outdooractive-Aufrufe laufen über die Same-Origin-API. Zugangsdaten werden je
Nutzergruppe serverseitig verwaltet und niemals unmaskiert an das Frontend
gegeben.

Vercel baut das Frontend über die Root-Konfiguration `../vercel.json` und
liefert `frontend/dist` aus.
