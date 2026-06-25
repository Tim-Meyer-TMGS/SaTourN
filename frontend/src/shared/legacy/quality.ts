// @ts-ignore: The migration preview intentionally reuses the existing live quality model.
import {
  evaluateAllItems as legacyEvaluateAllItems,
  evaluateQualityForItem as legacyEvaluateQualityForItem,
  findMissingCopyrightMedia as legacyFindMissingCopyrightMedia,
  getAttributeValue as legacyGetAttributeValue,
  getDomainCriteriaForType as legacyGetDomainCriteriaForType,
  getQualityScanConfig as legacyGetQualityScanConfig,
  getMediaObjects as legacyGetMediaObjects,
  getTextsByRel as legacyGetTextsByRel,
  hasBookingLink as legacyHasBookingLink,
  hasDetailsText as legacyHasDetailsText,
  hasOpeningHours as legacyHasOpeningHours,
  hasPublicTransportFeature as legacyHasPublicTransportFeature,
  hasValidDatasetLicense as legacyHasValidDatasetLicense,
  isCheckableMediaObject as legacyIsCheckableMediaObject,
  qualityCriteria as legacyQualityCriteria
} from '../../../../Statistik/quality.js';

export type QualityCriterion = {
  id: string;
  label: string;
  priority?: string;
  recommendation?: string;
  types?: string[];
  status?: string;
  autoCheck?: boolean;
};

export type QualityScanConfig = {
  method: string;
  verified: boolean;
  missingQuery?: string | null;
  positiveQuery?: string | null;
  prefilterQuery?: string | null;
};

export const qualityCriteria = legacyQualityCriteria as readonly QualityCriterion[];
export const evaluateAllItems = legacyEvaluateAllItems as (items: unknown[]) => unknown[];
export const evaluateQualityForItem = legacyEvaluateQualityForItem as (item: unknown) => Record<string, unknown>;
export const getDomainCriteriaForType = legacyGetDomainCriteriaForType as (type: string) => QualityCriterion[];
export const getQualityScanConfig = legacyGetQualityScanConfig as (
  criterionId: string | QualityCriterion,
  type: string
) => QualityScanConfig;
export const getAttributeValue = legacyGetAttributeValue as (item: unknown, key: string) => string;
export const getTextsByRel = legacyGetTextsByRel as (item: unknown, rel: string) => unknown[];
export const hasValidDatasetLicense = legacyHasValidDatasetLicense as (item: unknown) => boolean;
export const hasDetailsText = legacyHasDetailsText as (item: unknown) => boolean;
export const hasOpeningHours = legacyHasOpeningHours as (item: unknown) => boolean;
export const hasPublicTransportFeature = legacyHasPublicTransportFeature as (item: unknown) => boolean;
export const hasBookingLink = legacyHasBookingLink as (item: unknown) => boolean;
export const getMediaObjects = legacyGetMediaObjects as (item: unknown) => unknown[];
export const isCheckableMediaObject = legacyIsCheckableMediaObject as (item: unknown) => boolean;
export const findMissingCopyrightMedia = legacyFindMissingCopyrightMedia as (item: unknown) => unknown[];
