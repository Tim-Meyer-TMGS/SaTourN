import { qualityCriteria } from './quality';

const OPEN_DATA_CRITERION_FALLBACKS = new Set(['license_missing', 'image_author_missing']);

export function findQualityCriterion(criterionId: string) {
  return qualityCriteria.find((criterion) => criterion.id === criterionId);
}

export function getQualityCriterionLabel(criterionId: string, fallback = criterionId) {
  return findQualityCriterion(criterionId)?.label || fallback;
}

export function isOpenDataRelevantCriterion(criterionId: string) {
  const criterion = findQualityCriterion(criterionId);
  return criterion?.openDataRelevant === true || OPEN_DATA_CRITERION_FALLBACKS.has(criterionId);
}
