# Admin- und Mandanten-Backlog

Stand: 3. September 2026

Die Authentifizierung selbst ist produktiv: Neon Auth verwaltet Konten und
Sitzungen; SaTourN ergänzt Rolle, Aktivierung, Mandant und Gebietsrechte. Der
aktuelle Root-Mandant ist TMGS, ein aktiver Super-Admin ist verknüpft und die
öffentliche Registrierung ist abgeschaltet.

Der nächste eigenständige Arbeitsschritt ist die vollständige
Super-Admin-Oberfläche. Dazu gehören:

- Nutzer auflisten, anlegen beziehungsweise einladen und deaktivieren
- Rollen `USER`, `GROUP_ADMIN` und `SUPER_ADMIN` verwalten
- Mandanten anlegen und bearbeiten
- Gebiete einem Mandanten zuordnen
- Passwort-Reset auslösen und bestehende Sitzungen widerrufen
- relevante Änderungen im Audit-Log nachvollziehbar machen
- Zugriffsgrenzen für Nicht-Root-Mandanten automatisiert testen

Die Outdooractive-Eingabe ist bereits im Admin-Bereich vorbereitet. Der Key
bleibt bis zu einem eigenen Sicherheits- und Persistenzkonzept ausschließlich
im Arbeitsspeicher der laufenden Browsersitzung und darf nicht gecacht werden.

Änderungen in diesem Bereich müssen die bestehende Neon-Auth-Brücke und die
serverseitige Mandanten-/Gebietsprüfung weiterverwenden. Eine parallele zweite
Authentifizierung soll nicht eingeführt werden.

Bis die Oberfläche fertig ist, können berechtigte Betreiber Konten mit
`npm run auth:manage-user -- --operation create ... --confirm` anlegen und mit
`--operation reset-password` ein temporäres Passwort setzen. Das Skript setzt
den Pflicht-Passwortwechsel, widerruft Sitzungen und protokolliert die Aktion,
aber niemals das Klartextpasswort.
