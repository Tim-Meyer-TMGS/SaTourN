# DeepL Glossar Checker

Kleines Testprojekt zum Prüfen, ob ein DeepL-Glossar korrekt verwendet wird.

## Warum nicht nur HTML?

Direkte Browser-Requests an die DeepL API werden durch CORS blockiert. Deshalb enthält dieses Projekt einen kleinen Node/Express-Server als Proxy.

## Nutzung mit GitHub Codespaces

1. Repository auf GitHub erstellen.
2. Diese Dateien hochladen.
3. In GitHub auf **Code > Codespaces > Create codespace** klicken.
4. Im Terminal ausführen:

```bash
npm install
npm start
```

5. In Codespaces den Port **3000** öffnen.
6. Im Browser die Testseite verwenden.

## Nutzung lokal

```bash
npm install
npm start
```

Dann öffnen:

```text
http://localhost:3000
```

## Test-Reihenfolge

1. **Glossare abrufen**  
   Prüft, ob API-Key und API-Typ stimmen.

2. **Glossar-Einträge abrufen**  
   Prüft, ob die Glossary ID korrekt ist.

3. **Ohne Glossar übersetzen**

4. **Mit Glossar übersetzen**  
   Wenn hier kein Unterschied sichtbar ist, prüfen:
   - `source_lang` ist explizit gesetzt
   - `target_lang` passt zum Glossar
   - Glossar-Sprachpaar passt exakt zur Übersetzung
   - im Text steht der Begriff exakt oder in einer passenden Form

## Sicherheit

Der API-Key wird nicht gespeichert. Er wird nur vom Browser an den laufenden Testserver und von dort an DeepL weitergegeben.
Für produktive Nutzung sollte der Key als Server-Umgebungsvariable gespeichert werden, nicht im Frontend.