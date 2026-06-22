/// <reference types="vite/client" />

declare module '../../../../Statistik/quality.js' {
  export const qualityCriteria: Array<{
    id: string;
    label: string;
    priority?: string;
    recommendation?: string;
  }>;

  export function evaluateAllItems(items: unknown[]): unknown[];
  export function evaluateQualityForItem(item: unknown): Record<string, unknown>;
}
