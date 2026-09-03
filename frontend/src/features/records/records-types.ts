export type RecordRow = {
  id: string;
  globalId: string;
  title: string;
  type: string;
  city: string;
  region: string;
  category: string;
  authorships: string[];
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
  mode: 'idle' | 'search' | 'id_search' | 'ai_search' | 'criterion' | 'non_open_data';
  prompt?: string;
  criterionId?: string;
  criterionLabel?: string;
  estimatedTotalItems: number;
  nextCursor?: string | number | null;
  supportsPagination?: boolean;
  truncated: boolean;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
};

export type RecordsQuery = {
  q: string;
  mode: 'search' | 'ai_search';
  types: string[];
  categoryIds: string[];
  categories: string[];
  authorships: string[];
  criterionIds: string[];
  areaIds: string[];
  city: string;
  nonOpenData: boolean;
  page: number;
  pageSize: number;
};
