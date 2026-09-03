# Qualitätsmodell

## Zentrale Logik

`lib/quality/criteria.js` ist die einzige fachliche Quelle für Kriterien,
Feldprüfungen, Typzuordnung und Bewertung. Sie wird vom Import und von den
serverseitigen Quality-Helfern verwendet. Das React-Frontend bindet dieselbe
Logik über `frontend/src/shared/quality/quality.ts` typisiert ein.

Beim Import werden die Qualitätswerte berechnet und zusammen mit dem Datensatz
in Neon gespeichert:

- `quality_score`
- `quality_status`
- `missing_criteria`
- `fulfilled_criteria`

Die produktiven Quality-Endpunkte filtern und aggregieren diese gespeicherten
Werte direkt in PostgreSQL. Sie laden nicht bei jeder Anfrage erneut den
gesamten destination.one-Bestand.

## Aufgaben und Darstellung

Die UI-Zuordnung zu Pflegeaufgaben liegt unter
`frontend/src/shared/tasks/task-families.ts`. Darstellungslogik darf fachliche
Prüfungen nicht duplizieren. Neue Kriterien werden zuerst im zentralen Modell
ergänzt und anschließend, falls nötig, einer UI-Aufgabe zugeordnet.

## Diagnose

Die Beispieldaten unter `testdata/quality-examples/` bleiben als kontrollierte
Fixtures erhalten. Relevante Prüfungen sind:

```bash
npm run test:db-projection
npm run diagnose:quality-examples
npm run check
```

Änderungen an Kriterien müssen mindestens mit der Projektion und der
Fixture-Diagnose geprüft werden, bevor sie produktiv eingesetzt werden.
