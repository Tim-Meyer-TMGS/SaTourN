# Neon-Datenbank

Stand: 2026-09-02

## Ziel der ersten Stufe

ET4-Datensätze werden mit `ET2022A` geladen, vor dem Speichern auf die im
Qualitätsmonitor benötigten Felder reduziert und anschließend in Neon
gespeichert. Das bestehende Live-Frontend und die bisherigen Endpunkte bleiben
zunächst unverändert.

Neben den sechs Qualitäts-Datentypen werden `City`, `Area` und `Article`
gespeichert. Die Übersicht benötigt sie für die Sammelzeile „Weitere“. Der
META-Typ `Web` liefert mit den verfügbaren JSON-Templates eine leere Antwort
und kann deshalb derzeit nicht synchronisiert werden.

## Datenmodell

- `et4_records`: kompakte Datensätze, Filterspalten und vorberechnete Qualität
- `et4_sync_state`: letzter erfolgreicher Synchronisationsstand je Experience
  und Datensatztyp

Vollständige Datensätze werden ausschließlich für `statistik_sachsen`
gespeichert. `is_open_data_published` kennzeichnet, ob ihre `global_id` auch in
der Experience `open-data-sachsen-tourismus` veröffentlicht ist. `has_license`
bleibt davon getrennt und bewertet nur den Lizenzwert.

Der Primärschlüssel von `et4_records` ist `(experience, global_id)`. Dadurch
können dieselben IDs in getrennten Experiences geführt und Imports ohne
Duplikate wiederholt werden.

## Einrichtung

`DATABASE_URL` muss ausschließlich serverseitig gesetzt sein. Migrationen
werden mit folgendem Befehl ausgeführt:

```powershell
npm run db:migrate
```

## Lokale Prüfung eines Exports

```powershell
npm run db:analyze -- "C:\Pfad\zu\2022a.json"
```

Die Prüfung vergleicht für jeden Datensatz die bestehende Qualitätsbewertung
vor und nach der Reduktion. Bei einer Abweichung endet sie mit einem Fehler.

## Import

Zunächst kann der Import ohne Datenbankzugriff geprüft werden:

```powershell
npm run db:import -- --file "C:\Pfad\zu\2022a.json" --experience statistik_sachsen --dry-run
```

Nach gesetzter `DATABASE_URL` wird `--dry-run` weggelassen. Der Import arbeitet
in kleinen Transaktionen. Anhand des `content_hash` werden unveränderte
Datensätze vollständig übersprungen, damit wiederholte Läufe keine unnötigen
Tabellenversionen erzeugen.

Der importierte Bestand und sein Speicherbedarf werden so kontrolliert:

```powershell
npm run db:verify -- --experience statistik_sachsen
```

## Noch offen

- produktiven Vercel-Deploy und Browser-Abnahme durchführen
- one.intelligence-Endpunkte später von Render nach Vercel verschieben

## ET4-Synchronisierung

Der erste vollständige Abruf wird ausdrücklich gestartet:

```powershell
npm run db:sync -- --full
```

Spätere Läufe benötigen keinen Zeitraum. Sie lesen den letzten erfolgreichen
Stand aus `et4_sync_state` und verwenden automatisch einen zehnminütigen
Überlappungspuffer:

```powershell
npm run db:sync
```

Ein Lauf wird nur dann als erfolgreich gespeichert, wenn alle Seiten eines
Datensatztyps verarbeitet wurden. Der obere Zeitstempel wird zu Beginn des
Laufs festgehalten, damit Änderungen während einer langen Synchronisierung im
nächsten Lauf erneut erfasst werden.

Bei einem Vollabruf werden die gelieferten `global_id`-Werte zunächst in
`et4_sync_seen` gesammelt. Erst wenn alle Seiten eines Typs erfolgreich geladen
wurden, werden zuvor bekannte, aber nicht mehr gelieferte Datensätze gelöscht.
Ein abgebrochener Abruf kann damit keine gültigen Datensätze versehentlich
löschen.

## Vercel-Lese-API

Die produktive React-Anwendung verwendet folgende Vercel Functions direkt im
bestehenden Projekt:

- `/api/search`: Zählungen, Filter, Stichproben und Listen
- `/api/records/by-global-ids`: Detailabruf über `global_id` oder ET4-ID
- `/api/quality/count`: Trefferzahl einer Pflegeaufgabe
- `/api/quality/scan`: paginierte Arbeitsliste einer Pflegeaufgabe
- `/api/quality/summary`: vorberechnete Qualitätsübersicht

Suche, Datensatzdetails und Qualitätsdaten benötigen damit keinen ET4-Live-Scan
und keinen Umweg über Render. one.intelligence und Autocomplete bleiben bis zu
ihrer eigenen Migration auf den bestehenden Endpunkten.

## Täglicher Vercel-Sync

`/api/cron/sync-et4` synchronisiert täglich `statistik_sachsen` über `changed`.
Danach liest er von `open-data-sachsen-tourismus` nur die `global_id`-Werte mit
dem kleinen Template `ET2014A_LIGHT` und aktualisiert das Kennzeichen
`is_open_data_published`. Die vollständigen Open-Data-Datensätze werden nicht
noch einmal gespeichert.

Der Cronjob läuft im Hobby-kompatiblen Intervall einmal pro Tag. In Vercel muss
zusätzlich eine sensible Umgebungsvariable `CRON_SECRET` mit einem zufälligen
Wert von mindestens 32 Zeichen angelegt werden. Vercel sendet diesen Wert beim
Cron-Aufruf automatisch als Bearer-Token.

Die vier offenen Lizenzwerte `PD`, `CC0`, `CC-BY` und `CC-BY-SA` ergeben im
Bestand mehr Treffer als die Open-Data-Experience. Deshalb werden zwei Zahlen
bewusst getrennt ausgewiesen: lizenzseitig Open-Data-fähig (`has_license`) und
tatsächlich in der Open-Data-Experience veröffentlicht
(`is_open_data_published`).
