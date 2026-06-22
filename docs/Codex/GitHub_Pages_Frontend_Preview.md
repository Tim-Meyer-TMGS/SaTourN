# GitHub Pages Preview für das neue Frontend

## Ziel

Das neue React/Vite-Frontend wird parallel zur bestehenden Statistik-Seite veröffentlicht.
Die Live-Seite unter `Statistik/` bleibt unverändert.

Preview-URL nach erfolgreichem Deployment:

```text
https://tim-meyer-tmgs.github.io/SaTourN/frontend-preview/
```

Bestehende Live-URL bleibt:

```text
https://tim-meyer-tmgs.github.io/SaTourN/Statistik/index.html
```

## Was im Repository eingerichtet ist

- `frontend/vite.config.ts` setzt beim Build den Base-Pfad auf `/SaTourN/frontend-preview/`.
- `.github/workflows/pages.yml` baut zuerst die bestehende Jekyll-Seite.
- Danach wird `SaTourN/frontend` mit Vite gebaut.
- Der Vite-Build wird nach `_site/frontend-preview/` kopiert.
- `_config.yml` schließt den Quellordner `frontend/` aus dem Jekyll-Output aus.

## GitHub-Einstellungen

In GitHub unter `Settings` -> `Pages`:

1. `Build and deployment` auf `GitHub Actions` stellen.
2. Keine separate Branch-/Folder-Auswahl für Pages verwenden.
3. Danach einen Push auf `main` auslösen oder den Workflow manuell starten.

Workflow manuell starten:

1. Repository auf GitHub öffnen.
2. `Actions` öffnen.
3. Workflow `Deploy GitHub Pages` auswählen.
4. `Run workflow` klicken.
5. Branch `main` auswählen.
6. Starten und auf grünen Abschluss warten.

## Erwartetes Ergebnis

Nach erfolgreichem Workflow gibt es zwei getrennte Einstiege:

- Produktive Statistik: `/SaTourN/Statistik/index.html`
- Framework-Preview: `/SaTourN/frontend-preview/`

Falls die Preview fehlschlägt, bleibt die bestehende Statistik-Seite unverändert. Der Workflow würde dann zwar nicht deployen, aber die produktiven Dateien im Repository werden dadurch nicht geändert.

## Wichtige Hinweise

- Das neue Frontend ist aktuell eine Preview und ersetzt die Live-Seite noch nicht.
- Die Umschaltung auf das Framework erfolgt später seitenweise.
- Vor einer Umschaltung muss jede Framework-Seite gegen die bestehende Live-Funktion geprüft werden.
