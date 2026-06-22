import type { WorkContext } from '../types/context';

export const STORAGE_KEYS = {
  workContext: 'satournWorkContext'
} as const;

export const AREAS = [
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
] as const;

export const DATA_TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'] as const;

export const DEFAULT_WORK_CONTEXT: WorkContext = {
  area: '',
  city: '',
  type: ''
};
