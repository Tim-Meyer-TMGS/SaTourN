# SaTourN Tools

SaTourN Tools bündelt interne Web-Werkzeuge für Statistik,
Destination.One-Links, Datenprüfung und Kategorien-Bearbeitung.

## Struktur

- `index.html`, `_layouts/`, `_includes/`, `base.css`
  Jekyll-/GitHub-Pages-Oberfläche
- `Statistik/`
  produktives Datenqualitätsmonitor-Frontend auf Basis von HTML, CSS und
  Vanilla JavaScript
- `frontend/`
  neues paralleles Frontend-Grundgerüst für die Migration auf
  `React + Vite + TypeScript`
- `Pages-Builder/`, `KG-Finder/`, `Item_Randomizer/`,
  `Copyright-Checker/`, `OA-Datenabruf/`, `Category-Editor/`,
  `Fieldname-Finder/`, `Chatbot-Test/`
  weitere einzelne Tools
- `index.js`, `routes/`, `lib/`
  Express-Proxy für serverseitige API-Keys und Integrationen
- `deepl-checker/`
  separates Testprojekt für DeepL-Glossare

## Secrets und Umgebungsvariablen

Der Proxy akzeptiert die Secret-Namen aus dem GitHub-/Render-Setup:

```text
LICENSEKEY      Destination.One / ET4 License Key für den OnRender-Proxy
DZT_LICENSEKEY  DZT Knowledge Graph API Key für den KG-Finder
OI_API_KEY      one.intelligence API Key
OI_MODEL_MAIL   Modellname für Mailentwürfe
OI_MODEL_SEARCH Modellname für KI-Suche
```

Der Destination.One-Key wird serverseitig im OnRender-Proxy genutzt. Der
KG-Finder greift direkt auf die DZT-/OpenDataGermany-Endpunkte zu; dafür muss
der DZT-Key im Browser verfügbar sein, zum Beispiel über eine nicht versionierte
`KG-Finder/config.js`:

```js
window.SATOURN_DZT_LICENSEKEY = '...';
```

Wichtig: Ein direkter Browser-Zugriff bedeutet, dass der KG-Key für Nutzer der
Seite technisch sichtbar ist. Wenn der Key geheim bleiben muss, braucht der
KG-Finder ebenfalls einen Server-Proxy.

Optionale Overrides:

```text
PORT
CACHE_TTL_MS
REQUEST_TIMEOUT_MS
DESTINATION_ONE_BASE_URL
DESTINATION_ONE_EXPERIENCE
DESTINATION_ONE_TEMPLATE
OI_API_BASE
OI_MAIL_CC
OI_MAIL_BCC
```

Die Statistik-Oberfläche kann bei Bedarf vor dem Laden von `Statistik/scripts.js`
über Browser-Globals angepasst werden:

```js
window.SATOURN_SEARCH_API_BASE = 'https://satourn.onrender.com/api/search';
window.SATOURN_STATISTIK_CONCURRENCY = 6;
window.SATOURN_STATISTIK_WARN_REQUESTS = 120;
```

## Statistik und Python

Die produktive Statistik-Oberfläche läuft auf GitHub Pages als statisches
HTML/CSS/JavaScript. Python kann dort nicht als serverseitige Laufzeit für
Nutzeranfragen ausgeführt werden. Deshalb bleibt die Live-Statistik im Browser
bei JavaScript und der API-Zugriff beim bestehenden Node-/Express-Proxy.

Python ist nur für Build- oder Job-Pfade sinnvoll, zum Beispiel GitHub Actions
zur Erzeugung statischer Snapshot-JSONs oder ein separater Backend-Dienst für
Vollscans und große CSV-Exporte.

## Lokal starten

### Proxy

```bash
npm install
npm start
```

Der Proxy läuft danach standardmäßig auf `http://localhost:3000`.

### Neues React-Frontend

```bash
cd frontend
npm install
npm run dev
```

Das neue Frontend läuft danach standardmäßig auf `http://localhost:4173`.

## Pages-Builder Daten aktualisieren

```bash
npm run update:pagesbuilder-json
```

Das Skript lädt Areas und Cities über den Proxy und schreibt die statischen
JSON-Dateien nach `Pages-Builder/data/`.
