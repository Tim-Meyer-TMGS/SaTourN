# Neon-Datenbank

Stand: 2026-09-02

## Ziel der ersten Stufe

ET4-Datensätze werden mit `ET2022A` geladen, vor dem Speichern auf die im
Qualitätsmonitor benötigten Felder reduziert und anschließend in Neon
gespeichert. Das bestehende Live-Frontend und die bisherigen Endpunkte bleiben
zunächst unverändert.

## Datenmodell

- `et4_records`: kompakte Datensätze, Filterspalten und vorberechnete Qualität
- `et4_sync_state`: letzter erfolgreicher Synchronisationsstand je Experience
  und Datensatztyp

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
in kleinen Transaktionen und aktualisiert einen Datensatz nur, wenn sich dessen
Inhalt geändert hat.

Der importierte Bestand und sein Speicherbedarf werden so kontrolliert:

```powershell
npm run db:verify -- --experience statistik_sachsen
```

## Noch offen

- initialer Vollabruf mit Pagination
- inkrementeller Abruf über `changed` mit Zeitpuffer
- Behandlung gelöschter oder nicht mehr veröffentlichter Datensätze
- Datenbank-Leseendpunkte für Liste, Detail und Qualitätsübersicht
- produktiver Umschaltplan mit Live-Fallback
