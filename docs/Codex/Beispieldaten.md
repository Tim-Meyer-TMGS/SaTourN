# Beispiel-Datensaetze

Die grossen Fixture-Dateien liegen nicht mehr im aktiven Docs-Kontext, sondern
unter `testdata/quality-examples/`.

## Dateien

| Datei | Typ | Items | Groesse ca. | Top-Level |
| --- | --- | ---: | ---: | --- |
| `poi.json` | POI | 100 | 0,7 MB | `status,count,overallcount,channels,facetGroups,items` |
| `gastro.json` | Gastro | 100 | 0,7 MB | `status,count,overallcount,channels,facetGroups,items` |
| `tour.json` | Tour | 100 | 10,2 MB | `status,count,overallcount,channels,facetGroups,items` |
| `hotel.json` | Hotel | 100 | 1,3 MB | `status,count,overallcount,channels,facetGroups,items` |

## Nutzung

- Nicht in normale Codex-Kontexte laden.
- Fuer Helper-, Kriterien- und Mapping-Diagnosen nutzen.
- Aktueller Diagnosebefehl:

```bash
npm run diagnose:quality-examples
```

Maschinenlesbar:

```bash
npm run diagnose:quality-examples:json
```

Wenn Node nicht verfuegbar ist, kann PowerShell die Dateien mit
`ConvertFrom-Json` auf Parsebarkeit pruefen.
