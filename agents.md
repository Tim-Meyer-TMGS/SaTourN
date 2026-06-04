# Codex-Projektanweisung

Dieses Repository enthaelt das SaTourN-Statistik-Dashboard.

Ziel:
Das bestehende Dashboard soll schrittweise zu einem Datenqualitaets-Monitor
erweitert werden.

## Wichtige Referenzen

Vor groesseren Aenderungen zuerst `docs/Codex/README.md` lesen und nur die dort
genannten Standard-Kontextdateien laden:

- `docs/Codex/Datenqualitaetsmonitor_Aktueller_Projektstand.md`
- `docs/Codex/Datenqualitaetsmonitor_Offene_TODOs.md`

Bei Architektur-, API-, Kriterien- oder KI-Fragen zusaetzlich:

- `docs/Codex/Datenqualitaetsmonitor_Entscheidungen.md`

Grosse Fixtures unter `testdata/quality-examples/` und alte Arbeitsstaende unter
`_archive/codex-docs/` nicht automatisch in den Kontext laden.

## Arbeitsweise

- Bestehendes Dashboard nicht komplett neu bauen.
- Bestehendes Branding, Titel, Farbwelt und Grundlayout erhalten.
- Aenderungen schrittweise und nachvollziehbar umsetzen.
- Keine neue Build-Kette einfuehren, falls das Projekt statisch ist.
- Keine Secrets oder API-Keys im Frontend speichern.
- GitHub Pages bleibt statisches Hosting.
- KI-Anbindung nur ueber n8n-Webhook als Middleware vorbereiten.
- Fuer grosse Aufgaben immer nur den jeweils angeforderten Abschnitt umsetzen.
- Nach jeder Aenderung kurz zusammenfassen:
  - geaenderte Dateien
  - was umgesetzt wurde
  - was getestet wurde
  - offene TODOs
