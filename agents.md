# Codex-Projektanweisung

Dieses Repository enthält das SaTourN-Statistik-Dashboard.

Ziel:
Das bestehende Dashboard soll schrittweise zu einem Datenqualitäts-Monitor erweitert werden.

Wichtige Referenzen:
- `docs/codex/codex-masterprompt.md`
- `docs/codex/datenqualitaetsmonitor-plan.md`
- `docs/codex/n8n-ki-chatbot.md`
- `docs/codex/ziel-dashboard.png`

Arbeitsweise:
- Bestehendes Dashboard nicht komplett neu bauen.
- Bestehendes Branding, Titel, Farbwelt und Grundlayout erhalten.
- Änderungen schrittweise und nachvollziehbar umsetzen.
- Keine neue Build-Kette einführen, falls das Projekt statisch ist.
- Keine Secrets oder API-Keys im Frontend speichern.
- GitHub Pages bleibt statisches Hosting.
- KI-Anbindung nur über n8n-Webhook als Middleware vorbereiten.
- Vor jeder größeren Änderung relevante Referenzdateien lesen.
- Für große Aufgaben immer nur den jeweils angeforderten Abschnitt umsetzen.
- Nach jeder Änderung kurz zusammenfassen:
  - geänderte Dateien
  - was umgesetzt wurde
  - was getestet wurde
  - offene TODOs