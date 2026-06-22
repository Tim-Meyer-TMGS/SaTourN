import { PagePlaceholder } from '../../shared/ui/PagePlaceholder';

export function TasksPage() {
  return (
    <PagePlaceholder
      title="Pflegeaufgaben"
      summary="Aufgabenliste, Typfilter und Sprung in zugehörige Datensatzlisten."
      migrationStatus="Vorbereitet"
      nextStep="Die Seite wird nach `Datensätze` migriert, damit die Verlinkung auf dieselben State- und Routing-Grenzen aufsetzt."
    />
  );
}
