import * as qualityModel from '../../../../lib/quality/criteria.js';

export type QualityCriterion = {
  id: string;
  label: string;
  priority?: string;
  uiPriority?: string;
  recommendation?: string;
  types?: string[];
  status?: string;
  autoCheck?: boolean;
  openDataRelevant?: boolean;
  uiSeverity?: string;
  qualityLevel?: string;
  severity?: string;
  weight?: number;
};

export type QualityScanConfig = {
  method: string;
  verified: boolean;
  missingQuery?: string | null;
  positiveQuery?: string | null;
  prefilterQuery?: string | null;
};

export const qualityCriteria = qualityModel.qualityCriteria as readonly QualityCriterion[];
export const evaluateAllItems = qualityModel.evaluateAllItems as (items: unknown[]) => unknown[];
export const evaluateQualityForItem = qualityModel.evaluateQualityForItem as (item: unknown) => Record<string, unknown>;
export const getDomainCriteriaForType = qualityModel.getDomainCriteriaForType as (type: string) => QualityCriterion[];
export const getQualityScanConfig = qualityModel.getQualityScanConfig as (
  criterionId: string | QualityCriterion,
  type: string
) => QualityScanConfig;
export const getAttributeValue = qualityModel.getAttributeValue as (item: unknown, key: string) => string;
export const getTextsByRel = qualityModel.getTextsByRel as (item: unknown, rel: string) => unknown[];
export const hasValidDatasetLicense = qualityModel.hasValidDatasetLicense as (item: unknown) => boolean;
export const hasDetailsText = qualityModel.hasDetailsText as (item: unknown) => boolean;
export const hasOpeningHours = qualityModel.hasOpeningHours as (item: unknown) => boolean;
export const hasPublicTransportFeature = qualityModel.hasPublicTransportFeature as (item: unknown) => boolean;
export const hasBookingLink = qualityModel.hasBookingLink as (item: unknown) => boolean;
export const getMediaObjects = qualityModel.getMediaObjects as (item: unknown) => unknown[];
export const isCheckableMediaObject = qualityModel.isCheckableMediaObject as (item: unknown) => boolean;
export const findMissingCopyrightMedia = qualityModel.findMissingCopyrightMedia as (item: unknown) => unknown[];
