export function getTaskProblem(id) {
  if (id === 'poi_street_missing') return 'Fuer diese POI fehlt eine belastbare Strassen- oder Anschriftsangabe.';
  if (id === 'poi_teaser_missing') return 'Fuer diese POI fehlt ein kurzer Teaser-Text.';
  if (id === 'poi_email_missing') return 'Fuer diese POI fehlt eine E-Mail-Adresse.';
  if (id === 'poi_website_missing') return 'Fuer diese POI fehlt eine Webseite.';
  if (id === 'poi_phone_missing') return 'Fuer diese POI fehlt eine Telefonnummer.';
  if (id === 'poi_price_missing') return 'Fuer diese POI fehlt eine Preis-, Eintritts- oder Kosteninformation.';
  if (id === 'tour_season_missing') return 'Fuer diese Tour fehlt eine belastbare Saison- oder Eignungsangabe.';
  if (id === 'tour_parking_missing') return 'Für diese Tour fehlt eine belastbare Parkinformation.';

  const problems = {
    license_missing: 'Für diese Datensätze ist keine gültige Lizenzangabe hinterlegt.',
    image_author_missing: 'Bildmaterial ist vorhanden, aber der Urheberhinweis fehlt.',
    description_missing: 'Für diese Datensätze fehlt eine belastbare Beschreibung mit Details.',
    opening_hours_missing: 'Es sind keine Öffnungszeiten oder vergleichbare Zeitinformationen hinterlegt.',
    public_transport_missing: 'Informationen zur Anreise mit dem ÖPNV fehlen.',
    booking_link_missing: 'Es ist kein Buchungs-, Reservierungs- oder Ticketlink hinterlegt.',
    image_missing: 'Für diese Datensätze ist kein prüfbares Bildmaterial vorhanden.',
    poi_parking_feature_missing: 'Das Merkmal "Parkplätze vorhanden" fehlt.',
    poi_payment_options_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    poi_languages_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    poi_suitability_missing: 'Keine der geprüften Eignungsangaben ist als Merkmal hinterlegt.',
    hotel_language_english_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    hotel_payment_cash_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    hotel_parking_feature_missing: 'Keine der geprüften Parkinformationen ist als Merkmal hinterlegt.',
    gastro_payment_options_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    gastro_languages_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    gastro_parking_feature_missing: 'Das Merkmal "PKW-Parkplatz am Haus" fehlt.',
    gastro_cuisine_category_missing: 'Keine der geprüften Küchenarten ist als Kategorie hinterlegt.'
  };

  return problems[id] || 'Für diese Datensätze fehlt eine für die Datenpflege relevante Angabe.';
}

export function getTaskImpactText(id) {
  if (id === 'poi_street_missing') return 'Fehlende Anschriften erschweren Orientierung, Routing und redaktionelle Pflege.';
  if (id === 'poi_teaser_missing') return 'Fehlende Teaser schwächen Kurzansicht, Auffindbarkeit und Erstverständnis.';
  if (id === 'poi_email_missing') return 'Fehlende E-Mail-Adressen erschweren Rückfragen und Kontaktaufnahme.';
  if (id === 'poi_website_missing') return 'Fehlende Webseiten schwächen Weiterleitung zu vertiefenden Informationen.';
  if (id === 'poi_phone_missing') return 'Fehlende Telefonnummern erschweren direkte Rückfragen und Kontaktaufnahme.';
  if (id === 'poi_price_missing') return 'Fehlende Preis- oder Eintrittshinweise erschweren Erwartungsmanagement und Besuchsplanung.';
  if (id === 'tour_season_missing') return 'Fehlende Saisonangaben erschweren Einordnung, Planung und passende Nutzung der Tour.';
  if (id === 'tour_parking_missing') return 'Fehlende Parkhinweise erschweren die Anreiseplanung für Touren mit Startpunkt vor Ort.';

  const impacts = {
    license_missing: 'Ohne Lizenz sind Daten nicht Open-Data-fähig und nur eingeschränkt weiterverwendbar.',
    image_author_missing: 'Ohne Urheberangabe ist die Weitergabe von Bildmaterial rechtlich eingeschränkt.',
    description_missing: 'Fehlende Beschreibungen reduzieren Auffindbarkeit, Verständlichkeit und Nutzbarkeit.',
    opening_hours_missing: 'Fehlende Öffnungszeiten erschweren Planung und Ausspielung in Portalen.',
    public_transport_missing: 'Fehlende ÖPNV-Hinweise schwächen nachhaltige Anreiseinformationen.',
    booking_link_missing: 'Ohne Buchungslink können Nutzer Angebote schwerer direkt abschließen.',
    image_missing: 'Ohne Bilder wirken Einträge weniger attraktiv und sind in vielen Kanälen schwächer.',
    poi_parking_feature_missing: 'Fehlende Parkangaben erschweren Anreiseplanung mit dem Auto.',
    poi_payment_options_missing: 'Fehlende Zahlungsarten schwächen Nutzbarkeit und Vorbereitung vor Ort.',
    poi_languages_missing: 'Fehlende Sprachangaben reduzieren Zugänglichkeit für internationale Gäste.',
    poi_suitability_missing: 'Fehlende Eignungsangaben erschweren Zielgruppenansprache und Orientierung.',
    hotel_language_english_missing: 'Fehlende Sprachangaben reduzieren die Zugänglichkeit für internationale Gäste.',
    hotel_payment_cash_missing: 'Fehlende Zahlungsarten erschweren Nutzung und Erwartungsmanagement vor Ort.',
    hotel_parking_feature_missing: 'Fehlende Parkhinweise erschweren Anreiseplanung und Erwartungsmanagement vor Ort.',
    gastro_payment_options_missing: 'Fehlende Zahlungsarten erschweren die Nutzung und Vorbereitung für Gäste.',
    gastro_languages_missing: 'Fehlende Sprachangaben reduzieren Zugänglichkeit für internationale Gäste.',
    gastro_parking_feature_missing: 'Fehlende Parkangaben erschweren die Anreiseplanung für Gäste.',
    gastro_cuisine_category_missing: 'Fehlende Küchenarten schwächen Auffindbarkeit und thematische Einordnung.'
  };

  return impacts[id] || 'Die fehlende Information reduziert die praktische Nutzbarkeit der Daten.';
}

export function getTaskIcon(id) {
  if (id === 'poi_street_missing') return 'pin_drop';
  if (id === 'poi_teaser_missing') return 'notes';
  if (id === 'poi_email_missing') return 'mail';
  if (id === 'poi_website_missing') return 'language';
  if (id === 'poi_phone_missing') return 'call';
  if (id === 'poi_price_missing') return 'sell';
  if (id === 'license_missing') return 'description';
  if (id === 'image_author_missing' || id === 'image_missing') return 'image';
  if (id === 'opening_hours_missing') return 'schedule';
  if (id === 'public_transport_missing') return 'directions_transit';
  if (id === 'booking_link_missing') return 'link';
  if (id === 'poi_parking_feature_missing' || id === 'gastro_parking_feature_missing') return 'local_parking';
  if (id === 'poi_payment_options_missing' || id === 'gastro_payment_options_missing') return 'payments';
  if (id === 'poi_languages_missing' || id === 'gastro_languages_missing') return 'translate';
  if (id === 'poi_suitability_missing') return 'groups';
  if (id === 'hotel_language_english_missing') return 'translate';
  if (id === 'hotel_payment_cash_missing') return 'payments';
  if (id === 'hotel_parking_feature_missing') return 'local_parking';
  if (id === 'tour_season_missing') return 'event';
  if (id === 'tour_parking_missing') return 'local_parking';
  if (id === 'gastro_cuisine_category_missing') return 'restaurant_menu';
  return 'warning';
}

export function getTaskDescription(id) {
  if (id === 'poi_street_missing') return 'Keine Strasse oder Anschrift hinterlegt';
  if (id === 'poi_teaser_missing') return 'Kein Teaser-Text vorhanden';
  if (id === 'poi_email_missing') return 'Keine E-Mail-Adresse vorhanden';
  if (id === 'poi_website_missing') return 'Keine Webseite vorhanden';
  if (id === 'poi_phone_missing') return 'Keine Telefonnummer vorhanden';
  if (id === 'poi_price_missing') return 'Keine Preisinformation vorhanden';
  if (id === 'tour_season_missing') return 'Keine Saisonangabe vorhanden';
  if (id === 'tour_parking_missing') return 'Keine Parkinformation vorhanden';

  const descriptions = {
    license_missing: 'Datensätze ohne Lizenzangabe',
    image_author_missing: 'Bilder ohne Urheberangabe',
    description_missing: 'Keine Beschreibung oder Details',
    opening_hours_missing: 'Keine Öffnungszeiten hinterlegt',
    public_transport_missing: 'Keine ÖPNV-Information vorhanden',
    booking_link_missing: 'Kein Buchungs- oder Reservierungslink',
    image_missing: 'Kein Bildmaterial vorhanden',
    poi_parking_feature_missing: 'Merkmal "Parkplätze vorhanden" fehlt',
    poi_payment_options_missing: 'Keine geprüfte Zahlungsart vorhanden',
    poi_languages_missing: 'Keine geprüfte Fremdsprache vorhanden',
    poi_suitability_missing: 'Keine geprüfte Eignungsangabe vorhanden',
    hotel_language_english_missing: 'Keine geprüfte Fremdsprache vorhanden',
    hotel_payment_cash_missing: 'Keine geprüfte Zahlungsart vorhanden',
    hotel_parking_feature_missing: 'Keine geprüfte Parkinformation vorhanden',
    gastro_payment_options_missing: 'Keine geprüfte Zahlungsart vorhanden',
    gastro_languages_missing: 'Keine geprüfte Fremdsprache vorhanden',
    gastro_parking_feature_missing: 'Merkmal "PKW-Parkplatz am Haus" fehlt',
    gastro_cuisine_category_missing: 'Keine geprüfte Küchenart vorhanden'
  };

  return descriptions[id] || 'Ergänzung empfohlen';
}
