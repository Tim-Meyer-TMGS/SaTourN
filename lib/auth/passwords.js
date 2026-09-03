import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 16, p: 1, dkLen: 64 });

function generatePasswordKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(String(password).normalize('NFKC'), salt, SCRYPT_OPTIONS.dkLen, {
      N: SCRYPT_OPTIONS.N,
      r: SCRYPT_OPTIONS.r,
      p: SCRYPT_OPTIONS.p,
      maxmem: 128 * SCRYPT_OPTIONS.N * SCRYPT_OPTIONS.r * 2
    }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export function createTemporaryPassword() {
  return `${randomBytes(18).toString('base64url')}!7a`;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await generatePasswordKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPasswordHash(hash, password) {
  const [salt, expectedHex] = String(hash || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = await generatePasswordKey(password, salt);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
