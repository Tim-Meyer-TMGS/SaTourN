# Admin- und Mandantenbereich

Stand: 3. September 2026

## Umgesetzt

Neon Auth verwaltet Konten und Sitzungen; SaTourN ergänzt Rolle, Aktivierung,
Mandant und Gebietsrechte. Der Admin-Bereich verwendet keine eigene
Authentifizierung und erzeugt keine zusätzliche Vercel Function. Sämtliche
Operationen laufen als Actions über `api/system.js`.

Der Super-Admin kann:

- Nutzer auflisten, suchen, anlegen, bearbeiten und deaktivieren
- Rollen `USER`, `GROUP_ADMIN` und `SUPER_ADMIN` zuweisen
- temporäre Passwörter erzeugen und einen Pflicht-Passwortwechsel setzen
- Sitzungen eines Nutzers widerrufen
- Nutzergruppen anlegen, bearbeiten und deaktivieren
- Gebiete einer Nutzergruppe zuweisen
- den Import- und Auth-Status prüfen
- die aktiven Qualitätskriterien einsehen
- administrative Änderungen im Audit-Log nachvollziehen

Jeder angemeldete Nutzer erreicht über seinen Namen im Kopfbereich das eigene
Profil. Dort sind Rolle, Nutzergruppe und der Zeitpunkt der letzten
Passwortänderung sichtbar; das eigene Passwort kann mit Beendigung der anderen
Sitzungen geändert werden.

E-Mail-Domains werden zentral in `lib/auth/tenant-domains.js` gepflegt. Die
Regeln werden beim Anlegen, bei Änderungen, beim Login und bei jeder
sicherheitsrelevanten Sessionprüfung angewendet. Leere Domainlisten sperren die
Nutzeranlage für den betreffenden Mandanten, bis eine echte Domain im Code
freigegeben wurde.

Gebietsrechte werden nicht nur in der Oberfläche gefiltert. Die Daten-API
prüft sie weiterhin serverseitig. Der Root-Mandant TMGS besitzt Zugriff auf
alle Gebiete.

Initiale Zuordnung:

- Chemnitz: Chemnitz
- Chemnitz.Zwickau.Region.: Chemnitz, Chemnitz.Zwickau.Region., Rochlitzer Muldental, Zwickau
- Dresden: Dresden, Dresden Elbland
- Leipzig: Leipzig, Leipzig Region
- Oberlausitz: Lausitzer Seenland, Oberlausitz
- Erzgebirge: Erzgebirge
- Sächsische Schweiz: Sächsische Schweiz
- Vogtland: Vogtland

Ein Super-Admin kann diese Zuordnungen in der Nutzergruppenverwaltung ändern.
Die initiale Migration wird durch eine Seed-Markierung nur einmal angewendet
und stellt später entfernte Zuordnungen nicht wieder her.

Die Outdooractive-Eingabe bleibt unter „Eigene Einstellungen“. Der Key wird
ausschließlich im Arbeitsspeicher der laufenden Browsersitzung gehalten und
weder an Neon gesendet noch im Browser-Cache gespeichert.

## Spätere Erweiterungen

- eingeschränkte Verwaltungsansicht für `GROUP_ADMIN`
- nutzerbezogene Auswahl eigener Prüfbereiche und Zusatzfilter
- Gestaltungseinstellungen über die derzeitige Theme-Kennung hinaus
- sicher verschlüsselte, nutzerbezogene Speicherung externer Zugänge, falls
  die reine Sitzungsspeicherung später ersetzt werden soll
