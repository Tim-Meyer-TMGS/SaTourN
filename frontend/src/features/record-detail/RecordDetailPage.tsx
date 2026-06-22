import { PagePlaceholder } from '../../shared/ui/PagePlaceholder';

export function RecordDetailPage() {
  return (
    <PagePlaceholder
      title="Datensatz-Detail"
      summary="Detailkopf, Kriterienstatus, Inhalte, Medien, Kontakt- und Systeminformationen."
      migrationStatus="Vorbereitet"
      nextStep="Die Detailseite folgt direkt nach der Datensatzliste, damit Rücknavigation und Qualitätsdarstellung konsistent bleiben."
    />
  );
}
