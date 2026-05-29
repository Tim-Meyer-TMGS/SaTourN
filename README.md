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
LICENSEKEY      Destination.One / ET4 License Key
DZT_LICENSEKEY  DZT Knowledge Graph API Key
```

Optionale Overrides:

```text
PORT
CACHE_TTL_MS
REQUEST_TIMEOUT_MS
DESTINATION_ONE_BASE_URL
DESTINATION_ONE_EXPERIENCE
DESTINATION_ONE_TEMPLATE
KG_DS_LIST_URL
KG_LANG
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
