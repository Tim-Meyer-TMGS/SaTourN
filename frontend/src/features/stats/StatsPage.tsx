import { PagePlaceholder } from '../../shared/ui/PagePlaceholder';

export function StatsPage() {
  return (
    <PagePlaceholder
      title="Open-Data-Statistik"
      summary="Bestandszahlen, Datentypverteilung und Open-Data-Quote."
      migrationStatus="Vorbereitet"
      nextStep="Diese Seite wird nach Übersicht und Datensatzfluss migriert, weil sie stark auf aggregierte APIs und Exportpfade aufsetzt."
    />
  );
}
