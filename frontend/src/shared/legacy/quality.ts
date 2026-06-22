// @ts-ignore: The migration preview intentionally reuses the existing live quality model.
import {
  evaluateAllItems as legacyEvaluateAllItems,
  evaluateQualityForItem as legacyEvaluateQualityForItem,
  qualityCriteria as legacyQualityCriteria
} from '../../../../Statistik/quality.js';

export type QualityCriterion = {
  id: string;
  label: string;
  priority?: string;
  recommendation?: string;
};

export const qualityCriteria = legacyQualityCriteria as readonly QualityCriterion[];
export const evaluateAllItems = legacyEvaluateAllItems as (items: unknown[]) => unknown[];
export const evaluateQualityForItem = legacyEvaluateQualityForItem as (item: unknown) => Record<string, unknown>;
