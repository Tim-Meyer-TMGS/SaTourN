export const TYPES = Object.freeze(['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package']);

export const STORAGE_KEYS = Object.freeze({
  workContext: 'satournWorkContext',
  recordViewState: 'satournRecordViewState',
  recordListState: 'satournRecordListState',
  kpiHistory: 'satournOverviewKpis',
  consentSettings: 'satournConsentSettings'
});

export const REQUEST_CACHE_TTL_MS = Object.freeze({
  searchCount: 45_000,
  autocomplete: 15_000,
  qualityCount: 60_000,
  qualityScan: 20_000,
  qualityList: 120_000,
  qualitySnapshot: 120_000
});

export const AREAS = Object.freeze([
  ['Sachsen', ''],
  ['Leipzig', 'Leipzig'],
  ['Leipzig Region', 'Leipzig Region'],
  ['Vogtland', 'Vogtland'],
  ['Erzgebirge', 'Erzgebirge'],
  ['Oberlausitz', 'Oberlausitz'],
  ['Sächsische Schweiz', 'Sächsische Schweiz'],
  ['Dresden', 'Dresden'],
  ['Dresden Elbland', 'Dresden Elbland'],
  ['Chemnitz', 'Chemnitz']
]);
