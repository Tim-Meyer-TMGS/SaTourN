import { PagePlaceholder } from '../../shared/ui/PagePlaceholder';

export function OverviewPage() {
  return (
    <PagePlaceholder
      title="Übersicht"
      summary="KPI-Karten, wichtigste Pflegeaufgaben, Qualitätsstatus und Open-Data-Status."
      migrationStatus="Vorbereitet"
      nextStep="Nach der Datensatz-Pilotseite werden KPI- und Aggregationslogik aus dem Bestand in ein Overview-Feature überführt."
    />
  );
}
