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

const DZT_LICENSEKEY = firstEnv(
  'DZT_LICENSEKEY',
  'DZT_LICENSE_KEY',
  'OPENDATA_GERMANY_API_KEY',
  'KG_API_KEY'
);

const BASE_URL = firstEnv('DESTINATION_ONE_BASE_URL') || 'https://destination.one/rest.ashx/search/';
const EXPERIENCE = firstEnv('DESTINATION_ONE_EXPERIENCE') || 'statistik_sachsen';
const TEMPLATE = firstEnv('DESTINATION_ONE_TEMPLATE') || 'ET2014A.xml';
const KG_DS_LIST_URL = firstEnv('KG_DS_LIST_URL') || 'https://semantify.it/list/CRkyvcqGqeUu';
const KG_LANG = firstEnv('KG_LANG') || 'de';

const MAX_LIMIT_CITIES = numberFromEnv('MAX_LIMIT_CITIES', 1000);
const MAX_LIMIT_OTHERS = numberFromEnv('MAX_LIMIT_OTHERS', 200);
const CACHE_TTL_MS = numberFromEnv('CACHE_TTL_MS', 60 * 60 * 1000);
const REQUEST_TIMEOUT_MS = numberFromEnv('REQUEST_TIMEOUT_MS', 15000);

const BIG_LIMIT_TYPES = new Set(['city', 'cities', 'orte', 'staedte']);

export {
  PORT,
  API_KEY,
  DZT_LICENSEKEY,
  BASE_URL,
  EXPERIENCE,
  TEMPLATE,
  KG_DS_LIST_URL,
  KG_LANG,
  MAX_LIMIT_CITIES,
  MAX_LIMIT_OTHERS,
  CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  BIG_LIMIT_TYPES
};
