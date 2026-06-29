export type RecordRow = {
  id: string;
  globalId: string;
  title: string;
  type: string;
  city: string;
  region: string;
  category: string;
  updatedAt: string;
  qualityStatus: string;
  qualityScore: number | null;
  primaryIssue: string;
  missingCriteria: string[];
  email: string;
  web: string;
  detailUrl: string;
  raw: unknown;
};

export type RecordSearchMeta = {
  mode: 'idle' | 'search' | 'id_search' | 'ai_search' | 'criterion' | 'open_data_gap';
  prompt?: string;
  criterionId?: string;
  criterionLabel?: string;
  estimatedTotalItems: number;
  truncated: boolean;
};
