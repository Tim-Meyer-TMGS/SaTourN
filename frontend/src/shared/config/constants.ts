import type { WorkContext } from '../types/context';

export const STORAGE_KEYS = {
  workContext: 'satournWorkContext'
} as const;

export const AREAS = [
  ['Sachsen', ''],
  ['Chemnitz', 'Chemnitz'],
  ['Dresden', 'Dresden'],
  ['Dresden Elbland', 'Dresden Elbland'],
  ['Erzgebirge', 'Erzgebirge'],
  ['Leipzig', 'Leipzig'],
  ['Leipzig Region', 'Leipzig Region'],
  ['Oberlausitz', 'Oberlausitz'],
  ['Sächsische Schweiz', 'Sächsische Schweiz'],
  ['Vogtland', 'Vogtland']
] as const;

export const DATA_TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'] as const;

export const DEFAULT_WORK_CONTEXT: WorkContext = {
  area: '',
  city: '',
  type: ''
};
