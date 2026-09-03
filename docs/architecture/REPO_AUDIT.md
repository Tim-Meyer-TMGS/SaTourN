# Repository-Audit und Cleanup

Stand: 3. September 2026

## Ergebnis

Das aktive Repository enthält nur noch die React-Anwendung, die konsolidierte
Vercel-API, Fachlogik, Migrationen, Betriebsskripte und benötigte Testdaten.
Vor dem Entfernen wurden Importe, Browseraufrufe, Workflow-, Vercel- und
Scriptreferenzen projektweit geprüft.

Entfernt wurden:

- alte Einzeloberflächen: Category Editor, Chatbot Test, Copyright Checker,
  Fieldname Finder, KG Finder, Pages Builder und deepl-checker
- die durch React ersetzte Oberfläche `Statistik/`
- Jekyll-Layouts, Root-HTML/CSS, Gemfile und GitHub-Pages-Deployment
- nicht mehr importierte Browser-Helfer unter `lib/browser/`
- alte Archivkopien, Zwischenstände und überholte Architekturtexte
- die nicht referenzierte Fixture `testdata/treepoi.xml`

Die weiterhin verwendete Qualitätslogik aus der alten Statistik wurde vor dem
Löschen nach `lib/quality/criteria.js` verschoben. Das React-Frontend nutzt sie
über die typisierte Fassade `frontend/src/shared/quality/quality.ts`.

Bewusst beibehalten wurden:

- Neon Auth und die fünf Auth-Functions
- alle Datenbankmigrationen einschließlich Mandanten- und Auth-Verknüpfung
- Zufalls-/Beispieldatenabruf in der React-Anwendung
- direkter Outdooractive-Detailabruf mit flüchtigen Nutzerzugangsdaten
- One Intelligence
- Kompatibilitäts-Rewrites für aktuell verwendete API-URLs
- `experience` als derzeitige Import-/Quellenpartition

## Abweichungen vom Cleanup-Leitfaden

Der Leitfaden beschrieb teilweise einen älteren Zwischenstand. Deshalb wurde
die API nicht auf drei Functions reduziert: Die fünf Auth-Functions sind live
und nötig. Insgesamt bleiben acht Functions und damit weniger als das
Hobby-Limit von zwölf.

`experience` und der Wert `statistik_sachsen` werden nicht im Rahmen eines
Repository-Cleanups entfernt. Sie sind aktuell Teil von Primärschlüssel,
Abfragen und Synchronisationszustand. Eine Umstellung wäre eine separate
Datenmodellmigration.

Der Outdooractive-Abruf wurde nicht serverseitig verlegt, weil die aktuelle
Produktanforderung ausdrücklich nutzerseitige, nicht persistierte
Zugangsdaten vorsieht.

## Absicherung

Die Bereinigung wird mit folgenden lokalen Prüfungen abgesichert:

- Syntax- und Datenbankverträge über `npm run check`
- ET4-Kompaktierungsvertrag
- Qualitätsdiagnose mit den Fixtures unter `testdata/quality-examples/`
- Vertrag der konsolidierten API-Entry-Points
- TypeScript- und Vite-Produktionsbuild
- Zählung der deploybaren Dateien unter `api/`
