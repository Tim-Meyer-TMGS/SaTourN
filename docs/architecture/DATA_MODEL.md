# Datenmodell

## ET4-Daten

`et4_records` ist die operative Projektion für Listen, Details und
Qualitätsauswertungen. Der Primärschlüssel besteht derzeit aus `experience`
und `global_id`. Neben dem reduzierten `payload` werden häufig benötigte
Werte wie Typ, Titel, Ort, Gebiete, Kategorien, Änderungszeitpunkt, Lizenztyp
und Qualitätsstatus spaltenbasiert gespeichert und indiziert.

Wichtige Lizenzfelder:

- `license_type`: normalisierter konkreter ET4-Lizenzwert
- `has_license`: nur für die offenen Werte `CC0`, `CC-BY`, `CC-BY-SA`,
  `PD`

Andere Lizenztypen werden nicht verworfen. So bleibt beispielsweise
`CC-BY-NC` als `license_type` erhalten, während `has_license = false` ist.

`et4_sync_state` speichert den Fortschritt je Quelle und Datentyp.
`et4_sync_seen` unterstützt Vollabgleiche. Bei einem erfolgreichen
Vollabgleich werden IDs, die in der aktuellen Quelle nicht mehr vorkommen, aus
der operativen Tabelle entfernt.

## Auth und Mandanten

Neon Auth verwaltet Identitäten und Sitzungen im Schema `neon_auth`. SaTourN
ergänzt diese Identitäten durch eigene Anwendungstabellen:

- `app_tenant`: Mandanten und Hierarchie
- `app_area`: verfügbare Gebiete
- `app_tenant_area`: Gebietszugriff eines Mandanten
- `app_user_profile`: Rolle, Aktivierung, Mandant und Neon-Auth-Verknüpfung
- `app_audit_log`: administrative Ereignisse
- `app_system_metrics`: anwendungsbezogene Systemmetriken

Eine gültige Auth-Sitzung allein reicht nicht aus. API-Zugriff setzt zusätzlich
ein aktives Profil, einen aktiven Mandanten und eine gültige Rolle voraus.

## Migrationen

SQL-Migrationen liegen sortiert unter `db/migrations/` und sind idempotent
geschrieben. `scripts/run-db-migrations.mjs` führt sie in
Dateinamensreihenfolge aus. Bestehende Migrationen werden nicht nachträglich
umgeschrieben oder gelöscht; Änderungen erfolgen über neue Migrationen.
