import dotenv from 'dotenv';

dotenv.config();

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

const firstEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const PORT = numberFromEnv('PORT', 3000);

const API_KEY = firstEnv(
  'DESTINATION_ONE_API_KEY',
  'LICENSEKEY',
  'LICENSE_KEY'
);

const BASE_URL = firstEnv('DESTINATION_ONE_BASE_URL') || 'https://meta.et4.de/rest.ashx/search/';
const EXPERIENCE = firstEnv('DESTINATION_ONE_EXPERIENCE') || 'statistik_sachsen';
const OPEN_DATA_EXPERIENCE = firstEnv('DESTINATION_ONE_OPEN_DATA_EXPERIENCE') || 'open-data-sachsen-tourismus';
const TEMPLATE = firstEnv('DESTINATION_ONE_TEMPLATE') || 'ET2014A.json';
const COUNT_TEMPLATE = firstEnv('DESTINATION_ONE_COUNT_TEMPLATE') || 'ET2014A_LIGHT.json';

const MAX_LIMIT_CITIES = numberFromEnv('MAX_LIMIT_CITIES', 1000);
const MAX_LIMIT_OTHERS = numberFromEnv('MAX_LIMIT_OTHERS', 200);
const CACHE_TTL_MS = numberFromEnv('CACHE_TTL_MS', 60 * 60 * 1000);
const REQUEST_TIMEOUT_MS = numberFromEnv('REQUEST_TIMEOUT_MS', 15000);

const BIG_LIMIT_TYPES = new Set(['city', 'cities', 'orte', 'staedte']);

export {
  PORT,
  API_KEY,
  BASE_URL,
  EXPERIENCE,
  OPEN_DATA_EXPERIENCE,
  TEMPLATE,
  COUNT_TEMPLATE,
  MAX_LIMIT_CITIES,
  MAX_LIMIT_OTHERS,
  CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  BIG_LIMIT_TYPES
};
