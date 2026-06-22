declare module '../../../../Statistik/quality.js' {
  export const qualityCriteria: Array<{
    id: string;
    label: string;
    priority?: string;
  }>;

  export function evaluateAllItems(items: unknown[]): unknown[];
}
