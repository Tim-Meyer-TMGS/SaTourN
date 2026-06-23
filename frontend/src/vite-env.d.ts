/// <reference types="vite/client" />

declare module '../../../../Statistik/quality.js' {
  export const qualityCriteria: Array<{
    id: string;
    label: string;
    priority?: string;
    recommendation?: string;
    types?: string[];
    status?: string;
  }>;

  export function evaluateAllItems(items: unknown[]): unknown[];
  export function evaluateQualityForItem(item: unknown): Record<string, unknown>;
  export function getDomainCriteriaForType(type: string): Array<{
    id: string;
    label: string;
    priority?: string;
    recommendation?: string;
    status?: string;
  }>;
  export function getAttributeValue(item: unknown, key: string): string;
  export function getTextsByRel(item: unknown, rel: string): unknown[];
  export function hasValidDatasetLicense(item: unknown): boolean;
  export function hasDetailsText(item: unknown): boolean;
  export function hasOpeningHours(item: unknown): boolean;
  export function hasPublicTransportFeature(item: unknown): boolean;
  export function hasBookingLink(item: unknown): boolean;
  export function getMediaObjects(item: unknown): unknown[];
  export function isCheckableMediaObject(item: unknown): boolean;
  export function findMissingCopyrightMedia(item: unknown): unknown[];
}
