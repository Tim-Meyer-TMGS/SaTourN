export const OPEN_DATA_LICENSE_VALUES = Object.freeze(['CC0', 'CC-BY', 'CC-BY-SA', 'PD']);
export const OPEN_DATA_LICENSE_QUERY = `attribute_license:(${OPEN_DATA_LICENSE_VALUES.join(' OR ')})`;
export const NON_OPEN_DATA_LICENSE_QUERY = `all:all -${OPEN_DATA_LICENSE_QUERY}`;

export function normalizeOpenDataMode(value = '') {
  return String(Array.isArray(value) ? value[0] : value || '').toLowerCase();
}

export function isOpenDataMode(value = '') {
  return normalizeOpenDataMode(value) === 'true';
}

export function isNonOpenDataMode(value = '') {
  return normalizeOpenDataMode(value) === 'false';
}
