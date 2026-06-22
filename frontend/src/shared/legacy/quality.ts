// @ts-ignore: The migration preview intentionally reuses the existing live quality model.
import {
  evaluateAllItems as legacyEvaluateAllItems,
  qualityCriteria as legacyQualityCriteria
} from '../../../../Statistik/quality.js';

export type QualityCriterion = {
  id: string;
  label: string;
  priority?: string;
  recommendation?: string;
};

export const qualityCriteria = legacyQualityCriteria as QualityCriterion[];
export const evaluateAllItems = legacyEvaluateAllItems as (items: unknown[]) => unknown[];
