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

Für lokale Sonderfälle können vor dem App-Start ausschließlich die beiden
Globals `SATOURN_DATA_API_BASE` und `SATOURN_SYSTEM_API_BASE` gesetzt werden.
Es gibt keinen Render-Warmup und keinen Browserzugriff auf destination.one.

Vercel baut das Frontend über die Root-Konfiguration `../vercel.json` und
liefert `frontend/dist` aus.
