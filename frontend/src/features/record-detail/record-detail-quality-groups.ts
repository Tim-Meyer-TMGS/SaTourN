import { findQualityCriterion } from '../../shared/quality/quality-criteria';
import { formatRecordDate } from '../../shared/format/formatters';
import type { DetailItem, DetailQualityField, DetailQualityGroup } from './record-detail-types';

const DEFINITIONS = [
  { id: 'basis', label: 'Basisinformationen', pattern: /title|name|teaser|description|text|language|updated|changed/i },
  { id: 'contact', label: 'Adresse & Kontakt', pattern: /street|address|zip|city|email|website|phone|contact|geo|coordinate/i },
  { id: 'categories', label: 'Kategorien & Merkmale', pattern: /categor|feature|cuisine|keyword|theme/i },
  { id: 'media', label: 'Bilder & Medien', pattern: /image|media|copyright|creator|alt_text|picture/i },
  { id: 'license', label: 'Lizenz & Open Data', pattern: /license|open_data/i },
  { id: 'opening', label: 'Öffnungszeiten', pattern: /opening/i },
  { id: 'prices', label: 'Preise', pattern: /price|payment/i },
  { id: 'mobility', label: 'Anreise & Mobilität', pattern: /transport|arrival|direction|barrier|mobility|parking/i },
  { id: 'sources', label: 'Quellen & technische Zuordnung', pattern: /source|external|global_id|system/i },
  { id: 'technical', label: 'Technische Daten', pattern: /./ }
] as const;

function groupForCriterion(id: string) {
  return DEFINITIONS.find((definition) => definition.pattern.test(id))?.id || 'technical';
}

function valueField(id: string, label: string, value: string): DetailQualityField {
  return { id, label, value: value || 'Fehlt', status: value ? 'fulfilled' : 'missing' };
}

function factualFields(item: DetailItem): Record<string, DetailQualityField[]> {
  return {
    basis: [valueField('title', 'Titel', item.title), valueField('teaser', 'Teaser', item.teaser), valueField('description', 'Beschreibung', item.description), valueField('type', 'Datentyp', item.type), valueField('updated', 'Aktualisiert', formatRecordDate(item.updatedAt))],
    contact: [valueField('street', 'Straße', item.street), valueField('zip', 'PLZ', item.zip), valueField('city', 'Ort', item.city), valueField('region', 'Gebiet', item.region), valueField('coordinates', 'Koordinaten', item.coordinates), valueField('phone', 'Telefon', item.phone), valueField('email', 'E-Mail', item.email), valueField('web', 'Website', item.web), ...item.addressEntries.map((entry, index) => valueField(`address-${index}`, entry.label, entry.value))],
    categories: [valueField('category', 'Kategorien', item.category)],
    media: [valueField('image-count', 'Bilder', String(item.mediaImages.length)), ...item.mediaImages.flatMap((image, index) => [valueField(`image-${index}-title`, `Bild ${index + 1}: Titel`, image.title), valueField(`image-${index}-alt`, `Bild ${index + 1}: Alt-Text`, image.alt), valueField(`image-${index}-copyright`, `Bild ${index + 1}: Urheber`, image.copyright), valueField(`image-${index}-license`, `Bild ${index + 1}: Lizenz`, image.license)])],
    license: [valueField('license', 'Lizenztyp', item.license), valueField('license-url', 'Lizenz-URL', item.licenseUrl)],
    opening: item.openings ? [valueField('opening-value', 'Angabe', item.openings)] : [],
    prices: item.price || item.priceReduced ? [valueField('price', 'Preis', item.price), valueField('price-reduced', 'Ermäßigter Preis', item.priceReduced)] : [],
    mobility: [valueField('directions', 'Anreise', item.directions)],
    sources: [valueField('id', 'Interne ID', item.id), valueField('global-id', 'global_id', item.globalId), valueField('system', 'Pflegesystem', item.primarySystem.name), valueField('source', 'Quelle', item.source), valueField('et4-url', 'ET4 pages', item.et4Url), ...item.externalIds.map((entry, index) => valueField(`external-${index}`, entry.label, entry.value))],
    technical: item.rawExcerpt.map((entry, index) => valueField(`raw-${index}`, entry.label, entry.value))
  };
}

export function buildDetailQualityGroups(item: DetailItem): DetailQualityGroup[] {
  const fields = factualFields(item);
  const criterionItems: Record<string, DetailQualityField[]> = {};
  const append = (id: string, status: DetailQualityField['status']) => {
    const criterion = findQualityCriterion(id);
    const groupId = groupForCriterion(id);
    (criterionItems[groupId] ||= []).push({ id, label: criterion?.label || id, value: status === 'missing' ? 'Fehlt' : status === 'review' ? 'Prüfen' : 'Erfüllt', status, recommendation: criterion?.recommendation });
  };
  item.fulfilledCriteria.forEach((id) => append(id, 'fulfilled'));
  item.missingCriteria.forEach((id) => append(id, 'missing'));
  item.manualCriteria.forEach((id) => append(id, 'review'));

  return DEFINITIONS.map((definition) => {
    const criteria = criterionItems[definition.id] || [];
    const assessed = criteria.filter((entry) => entry.status === 'fulfilled' || entry.status === 'missing');
    const missingCount = criteria.filter((entry) => entry.status === 'missing').length;
    const reviewCount = criteria.filter((entry) => entry.status === 'review').length;
    const score = assessed.length ? Math.round(100 * assessed.filter((entry) => entry.status === 'fulfilled').length / assessed.length) : null;
    return {
      id: definition.id,
      label: definition.label,
      score,
      status: score == null ? 'not_applicable' : score < 50 ? 'critical' : score < 100 || reviewCount ? 'review' : 'good',
      missingCount,
      reviewCount,
      items: [...criteria, ...(fields[definition.id] || [])]
    } satisfies DetailQualityGroup;
  }).filter((group) => group.items.length && (group.id !== 'opening' || item.openings || group.score != null) && (group.id !== 'prices' || item.price || item.priceReduced || group.score != null));
}
