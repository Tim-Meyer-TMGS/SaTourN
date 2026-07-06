export type TaskFamilyMeta = {
  label: string;
  description: string;
  problem: string;
  impactText: string;
  recommendation: string;
  iconCriterionId: string;
};

const TASK_FAMILY_BY_CRITERION: Record<string, string> = {
  hotel_payment_cash_missing: 'payment_options_missing',
  poi_payment_options_missing: 'payment_options_missing',
  gastro_payment_options_missing: 'payment_options_missing',
  event_payment_options_missing: 'payment_options_missing',
  hotel_language_english_missing: 'languages_missing',
  poi_languages_missing: 'languages_missing',
  gastro_languages_missing: 'languages_missing',
  hotel_parking_feature_missing: 'parking_missing',
  tour_parking_missing: 'parking_missing',
  poi_parking_feature_missing: 'parking_missing',
  gastro_parking_feature_missing: 'parking_missing',
  poi_street_missing: 'street_missing',
  hotel_street_missing: 'street_missing',
  gastro_street_missing: 'street_missing',
  event_street_missing: 'street_missing',
  poi_phone_missing: 'phone_missing',
  hotel_phone_missing: 'phone_missing',
  gastro_phone_missing: 'phone_missing',
  event_phone_missing: 'phone_missing',
  poi_email_missing: 'email_missing',
  hotel_email_missing: 'email_missing',
  gastro_email_missing: 'email_missing',
  event_email_missing: 'email_missing',
  poi_website_missing: 'website_missing',
  hotel_website_missing: 'website_missing',
  gastro_website_missing: 'website_missing',
  event_website_missing: 'website_missing',
  poi_teaser_missing: 'teaser_missing',
  hotel_teaser_missing: 'teaser_missing',
  tour_teaser_missing: 'teaser_missing',
  gastro_teaser_missing: 'teaser_missing',
  event_teaser_missing: 'teaser_missing',
  poi_price_missing: 'price_missing',
  hotel_price_missing: 'price_missing',
  event_price_missing: 'price_missing'
};

const TASK_FAMILY_META: Record<string, TaskFamilyMeta> = {
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
  },
  street_missing: {
    label: 'Adressangabe fehlt',
    description: 'Straße oder Anschrift fehlt',
    problem: 'Für diese Datensätze fehlt eine belastbare Straßen- oder Anschriftsangabe.',
    impactText: 'Fehlende Adressdaten erschweren Orientierung, Kartendarstellung und Kontaktaufnahme.',
    recommendation: 'Straße oder Anschrift ergänzen.',
    iconCriterionId: 'poi_street_missing'
  },
  phone_missing: {
    label: 'Telefonnummer fehlt',
    description: 'Keine Telefonnummer hinterlegt',
    problem: 'Für diese Datensätze fehlt eine Telefonnummer.',
    impactText: 'Ohne Telefonnummer ist eine schnelle direkte Kontaktaufnahme schwieriger.',
    recommendation: 'Telefonnummer ergänzen.',
    iconCriterionId: 'poi_phone_missing'
  },
  email_missing: {
    label: 'E-Mail-Adresse fehlt',
    description: 'Keine E-Mail-Adresse hinterlegt',
    problem: 'Für diese Datensätze fehlt eine E-Mail-Adresse.',
    impactText: 'Ohne E-Mail-Adresse sind schriftliche Rückfragen und Buchungsanfragen erschwert.',
    recommendation: 'E-Mail-Adresse ergänzen.',
    iconCriterionId: 'poi_email_missing'
  },
  website_missing: {
    label: 'Webseite fehlt',
    description: 'Keine Webseite hinterlegt',
    problem: 'Für diese Datensätze fehlt eine Webseite.',
    impactText: 'Ohne Webseite fehlen Nutzern weiterführende Informationen.',
    recommendation: 'Webseite ergänzen.',
    iconCriterionId: 'poi_website_missing'
  },
  teaser_missing: {
    label: 'Teaser fehlt',
    description: 'Kurzbeschreibung fehlt',
    problem: 'Für diese Datensätze fehlt ein kurzer Einstiegstext.',
    impactText: 'Ein fehlender Teaser schwächt Suche, Vorschau und schnelle Orientierung.',
    recommendation: 'Kurzen Teaser-Text ergänzen.',
    iconCriterionId: 'poi_teaser_missing'
  },
  price_missing: {
    label: 'Preisinformation fehlt',
    description: 'Keine Preis-, Eintritts- oder Kosteninformation vorhanden',
    problem: 'Für diese Datensätze fehlt eine Preis- oder Kosteninformation.',
    impactText: 'Fehlende Preisangaben erschweren Planung und Vergleich.',
    recommendation: 'Preis-, Eintritts- oder Kosteninformation ergänzen.',
    iconCriterionId: 'poi_price_missing'
  }
};

export function getTaskFamilyId(criterionId: string) {
  return TASK_FAMILY_BY_CRITERION[criterionId] || criterionId;
}

export function getTaskFamilyMeta(taskFamily: string) {
  return TASK_FAMILY_META[taskFamily] || null;
}
