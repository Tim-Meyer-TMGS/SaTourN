import dotenv from 'dotenv';

dotenv.config();

const firstEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const OI_API_BASE = firstEnv('OI_API_BASE') || 'https://oi.destination.one/api';
const OI_API_KEY = firstEnv('OI_API_KEY');
const OI_MODEL_MAIL = firstEnv('OI_MODEL_MAIL');
const OI_MODEL_SEARCH = firstEnv('OI_MODEL_SEARCH');
const OI_MAIL_CC = firstEnv('OI_MAIL_CC');
const OI_MAIL_BCC = firstEnv('OI_MAIL_BCC');

export {
  OI_API_BASE,
  OI_API_KEY,
  OI_MODEL_MAIL,
  OI_MODEL_SEARCH,
  OI_MAIL_CC,
  OI_MAIL_BCC
};
