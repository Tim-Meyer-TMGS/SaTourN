export const TASK_FAMILY_BY_CRITERION = Object.freeze({
  hotel_payment_cash_missing: 'payment_options_missing',
  poi_payment_options_missing: 'payment_options_missing',
  gastro_payment_options_missing: 'payment_options_missing',
  hotel_language_english_missing: 'languages_missing',
  poi_languages_missing: 'languages_missing',
  gastro_languages_missing: 'languages_missing',
  hotel_parking_feature_missing: 'parking_missing',
  tour_parking_missing: 'parking_missing',
  poi_parking_feature_missing: 'parking_missing',
  gastro_parking_feature_missing: 'parking_missing'
});

export const TASK_FAMILY_META = Object.freeze({
  payment_options_missing: {
    label: 'Zahlungsmöglichkeiten fehlen',
    description: 'Keine der geprüften Zahlungsarten vorhanden',
    problem: 'Für diese Datensätze fehlt mindestens eine gepflegte Zahlungsart.',
    impactText: 'Fehlende Zahlungsarten erschweren Planung, Vergleich und Erwartungsmanagement.',
    recommendation: 'Mindestens eine geprüfte Zahlungsart als Merkmal ergänzen.',
    iconCriterionId: 'poi_payment_options_missing'
  },
  languages_missing: {
    label: 'Fremdsprachenangaben fehlen',
    description: 'Keine der geprüften Fremdsprachen vorhanden',
    problem: 'Für diese Datensätze fehlt mindestens eine gepflegte Fremdsprachenangabe.',
    impactText: 'Fehlende Sprachangaben schränken Auffindbarkeit und Nutzbarkeit für internationale Gäste ein.',
    recommendation: 'Mindestens eine geprüfte Fremdsprache als Merkmal ergänzen.',
    iconCriterionId: 'poi_languages_missing'
  },
  parking_missing: {
    label: 'Parkhinweise fehlen',
    description: 'Keine Parkinformation oder kein geprüfter Parkhinweis vorhanden',
    problem: 'Für diese Datensätze fehlt eine belastbare Parkinformation oder ein Parkhinweis.',
    impactText: 'Fehlende Parkhinweise erschweren die Anreiseplanung vor Ort.',
    recommendation: 'Parkmöglichkeiten oder geprüfte Parkhinweise ergänzen.',
    iconCriterionId: 'tour_parking_missing'
  }
});

export function getTaskFamilyId(criterionId) {
  return TASK_FAMILY_BY_CRITERION[criterionId] || criterionId;
}

export function getTaskFamilyMeta(taskOrIssue) {
  return TASK_FAMILY_META[taskOrIssue?.taskFamily || getTaskFamilyId(taskOrIssue?.criterionId)];
}
