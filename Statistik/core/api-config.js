export function getApiConfig(windowObject, locationObject) {
  const apiBase = windowObject.SATOURN_SEARCH_API_BASE
    || (locationObject.hostname === 'localhost' || locationObject.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');

  const derive = (replacement) => apiBase.replace(/\/api\/search(?:\?.*)?$/, replacement);

  return {
    API_BASE: apiBase,
    QUALITY_SCAN_API_BASE: windowObject.SATOURN_QUALITY_SCAN_API_BASE || derive('/api/quality/scan'),
    QUALITY_COUNT_API_BASE: windowObject.SATOURN_QUALITY_COUNT_API_BASE || derive('/api/quality/count'),
    QUALITY_SNAPSHOT_API_BASE: windowObject.SATOURN_QUALITY_SNAPSHOT_API_BASE || derive('/api/quality/snapshot'),
    QUALITY_LIST_API_BASE: windowObject.SATOURN_QUALITY_LIST_API_BASE || derive('/api/quality/list'),
    OI_MAIL_DRAFT_API_BASE: windowObject.SATOURN_OI_MAIL_DRAFT_API_BASE || derive('/api/oi/mail-draft'),
    OI_SEARCH_API_BASE: windowObject.SATOURN_OI_SEARCH_API_BASE || derive('/api/oi/search-records'),
    RECORDS_BY_GLOBAL_IDS_API_BASE: windowObject.SATOURN_RECORDS_BY_GLOBAL_IDS_API_BASE || derive('/api/records/by-global-ids'),
    AUTOCOMPLETE_API_BASE: windowObject.SATOURN_AUTOCOMPLETE_API_BASE || derive('/api/autocomplete'),
    USE_QUALITY_CACHE: windowObject.SATOURN_USE_QUALITY_CACHE === true
      || windowObject.SATOURN_USE_QUALITY_CACHE === '1'
  };
}
