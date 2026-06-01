# SaTourN Tools

SaTourN Tools bündelt interne Web-Werkzeuge für Statistik, Destination.One-Links, Datenprüfung und XML-Bearbeitung.

## Struktur

- `index.html`, `_layouts/`, `_includes/`, `base.css`: Jekyll/GitHub-Pages-Oberfläche
- `Statistik/`, `Pages-Builder/`, `KG-Finder/`, `Item_Randomizer/`, `Copyright-Checker/`, `OA-Datenabruf/`, `Category-Editor/`, `Fieldname-Finder/`, `Chatbot-Test/`: einzelne Tools
- `index.js`, `routes/`, `lib/`: Express-Proxy für serverseitige API-Keys
- `deepl-checker/`: separates Testprojekt für DeepL-Glossare

## Secrets und Umgebungsvariablen

Der Proxy akzeptiert die Secret-Namen aus dem GitHub/Render-Setup:

```text
LICENSEKEY      Destination.One / ET4 License Key für den OnRender-Proxy
DZT_LICENSEKEY  DZT Knowledge Graph API Key für den KG-Finder
```

Der Destination.One-Key wird serverseitig im OnRender-Proxy genutzt. Der KG-Finder greift direkt auf die DZT-/OpenDataGermany-Endpunkte zu; dafür muss der DZT-Key im Browser verfügbar sein, z. B. über eine nicht versionierte `KG-Finder/config.js`:

```js
window.SATOURN_DZT_LICENSEKEY = "...";
```

Wichtig: Ein direkter Browser-Zugriff bedeutet, dass der KG-Key für Nutzer der Seite technisch sichtbar ist. Wenn der Key geheim bleiben muss, braucht der KG-Finder ebenfalls einen Server-Proxy.

Der GitHub-Pages-Workflow schreibt `KG-Finder/config.js` beim Build aus `secrets.DZT_LICENSEKEY`. Das hält den Key aus dem Repository heraus, macht ihn aber im ausgelieferten Frontend sichtbar.

Optionale Overrides:

```text
PORT
CACHE_TTL_MS
REQUEST_TIMEOUT_MS
DESTINATION_ONE_BASE_URL
DESTINATION_ONE_EXPERIENCE
DESTINATION_ONE_TEMPLATE
```

Die Statistik-Oberfläche kann bei Bedarf vor dem Laden von `Statistik/scripts.js` über Browser-Globals angepasst werden:

```js
window.SATOURN_SEARCH_API_BASE = "https://satourn.onrender.com/api/search";
window.SATOURN_STATISTIK_CONCURRENCY = 6;
window.SATOURN_STATISTIK_WARN_REQUESTS = 120;
```

## Lokal starten

```bash
npm install
npm start
```

Der Proxy läuft danach standardmäßig auf `http://localhost:3000`.

## Pages-Builder Daten aktualisieren

```bash
npm run update:pagesbuilder-xml
```

Das Skript lädt Areas und Cities über den Proxy und schreibt die statischen XML-Dateien nach `Pages-Builder/data/`.
