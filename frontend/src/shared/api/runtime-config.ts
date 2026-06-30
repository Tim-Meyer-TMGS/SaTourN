export type FrontendRuntimeConfig = {
  warmupApiBase: string;
  searchApiBase: string;
  qualityCountApiBase: string;
  qualityScanApiBase: string;
  qualitySummaryApiBase: string;
  qualitySnapshotApiBase: string;
  qualityListApiBase: string;
  oiSearchApiBase: string;
  oiMailDraftApiBase: string;
  recordsByIdsApiBase: string;
  autocompleteApiBase: string;
};

declare global {
  interface Window {
    SATOURN_SEARCH_API_BASE?: string;
    SATOURN_WARMUP_API_BASE?: string;
    SATOURN_QUALITY_COUNT_API_BASE?: string;
    SATOURN_QUALITY_SCAN_API_BASE?: string;
    SATOURN_QUALITY_SUMMARY_API_BASE?: string;
    SATOURN_QUALITY_SNAPSHOT_API_BASE?: string;
    SATOURN_QUALITY_LIST_API_BASE?: string;
    SATOURN_OI_SEARCH_API_BASE?: string;
    SATOURN_OI_MAIL_DRAFT_API_BASE?: string;
    SATOURN_RECORDS_BY_GLOBAL_IDS_API_BASE?: string;
    SATOURN_AUTOCOMPLETE_API_BASE?: string;
  }
}

function deriveApiBase() {
  if (typeof window !== 'undefined' && window.SATOURN_SEARCH_API_BASE) {
    return window.SATOURN_SEARCH_API_BASE;
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/search';
    }
  }

  return 'https://satourn.onrender.com/api/search';
}

function deriveEndpointFromSearchBase(baseUrl: string, replacement: string) {
  return baseUrl.replace(/\/api\/search(?:\?.*)?$/, replacement);
}

export function getRuntimeConfig(): FrontendRuntimeConfig {
  const searchApiBase = deriveApiBase();

  return {
    warmupApiBase: window.SATOURN_WARMUP_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/health'),
    searchApiBase,
    qualityCountApiBase: window.SATOURN_QUALITY_COUNT_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/quality/count'),
    qualityScanApiBase: window.SATOURN_QUALITY_SCAN_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/quality/scan'),
    qualitySummaryApiBase: window.SATOURN_QUALITY_SUMMARY_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/quality/summary'),
    qualitySnapshotApiBase: window.SATOURN_QUALITY_SNAPSHOT_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/quality/snapshot'),
    qualityListApiBase: window.SATOURN_QUALITY_LIST_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/quality/list'),
    oiSearchApiBase: window.SATOURN_OI_SEARCH_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/oi/search-records'),
    oiMailDraftApiBase: window.SATOURN_OI_MAIL_DRAFT_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/oi/mail-draft'),
    recordsByIdsApiBase: window.SATOURN_RECORDS_BY_GLOBAL_IDS_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/records/by-global-ids'),
    autocompleteApiBase: window.SATOURN_AUTOCOMPLETE_API_BASE || deriveEndpointFromSearchBase(searchApiBase, '/api/autocomplete')
  };
}
