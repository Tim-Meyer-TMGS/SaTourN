export type ResolvedPayload = {
  items?: unknown[];
};

export type RecordListEntry = {
  id: string;
  globalId: string;
  type: string;
  title: string;
  detailUrl: string;
};

export type RecordListState = {
  backUrl: string;
  rows: RecordListEntry[];
};

export type DetailImage = {
  url: string;
  title: string;
  alt: string;
  copyright: string;
  license: string;
};

export type DetailUsability = {
  label: string;
  value: string;
  ok: boolean;
  relevant?: boolean;
};

export type DetailInfoEntry = {
  label: string;
  value: string;
};

export type DetailPrimarySystem = {
  id: string;
  name: string;
  short: string;
  logoUrl: string;
};

export type DetailCriterion = {
  id: string;
  label: string;
  recommendation?: string;
  status: string;
};

export type DetailCriteriaSection = {
  title: string;
  note: string;
  criteria: DetailCriterion[];
};

export type DetailItem = {
  id: string;
  globalId: string;
  type: string;
  title: string;
  city: string;
  region: string;
  category: string;
  updatedAt: string;
  qualityStatus: string;
  qualityScore: number | null;
  missingCriteria: string[];
  fulfilledCriteria: string[];
  manualCriteria: string[];
  description: string;
  teaser: string;
  openings: string;
  directions: string;
  price: string;
  priceReduced: string;
  et4Url: string;
  web: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  license: string;
  licenseUrl: string;
  source: string;
  sourceUrl: string;
  coordinates: string;
  primarySystem: DetailPrimarySystem;
  externalIds: DetailInfoEntry[];
  addressEntries: DetailInfoEntry[];
  rawExcerpt: DetailInfoEntry[];
  usability: DetailUsability[];
  criteriaSections: DetailCriteriaSection[];
  mediaImages: DetailImage[];
  mediaNote: string;
};

export type MissingIssue = {
  id: string;
  label: string;
  recommendation: string;
  priority: string;
};
