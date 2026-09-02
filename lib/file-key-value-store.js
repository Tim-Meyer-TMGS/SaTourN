import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import path from 'path';

import { stableHash } from './kv-store.js';

function normalizeOutputDirectory(outputDirectory) {
  const value = String(outputDirectory || '').trim();
  if (!value) throw new Error('A snapshot output directory is required.');
  return path.resolve(value);
}

function entryCategory(key) {
  if (key.includes(':snapshot:')) return 'snapshots';
  if (key.includes(':list:')) return 'lists';
  if (key.includes(':count:')) return 'counts';
  return 'entries';
}

async function writeTextAtomically(filePath, serialized) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(temporaryPath, serialized, 'utf8');
    try {
      await rename(temporaryPath, filePath);
    } catch (error) {
      // Windows cannot always replace an existing file with rename. CI/Linux
      // uses the atomic path above; this fallback keeps local runs portable.
      if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
      await rm(filePath, { force: true });
      await rename(temporaryPath, filePath);
    }
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function writeJsonAtomically(filePath, value) {
  return writeTextAtomically(filePath, `${JSON.stringify(value)}\n`);
}

export class FileKeyValueStore {
  constructor(outputDirectory, { indexKey } = {}) {
    this.mode = 'file';
    this.available = true;
    this.outputDirectory = normalizeOutputDirectory(outputDirectory);
    this.indexKey = indexKey || '';
  }

  relativePathForKey(key) {
    if (key === this.indexKey) return 'index.json';
    return `${entryCategory(key)}/${stableHash(key)}.json`;
  }

  publicPathForKey(key) {
    return this.relativePathForKey(key).replaceAll('\\', '/');
  }

  absolutePathForKey(key) {
    return path.join(this.outputDirectory, this.relativePathForKey(key));
  }

  async get(key) {
    try {
      return await readFile(this.absolutePathForKey(key), 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async set(key, value) {
    await writeTextAtomically(this.absolutePathForKey(key), String(value));
    return true;
  }

  async getJson(key) {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJson(key, value) {
    await writeJsonAtomically(this.absolutePathForKey(key), value);
    return true;
  }

  async del(key) {
    await rm(this.absolutePathForKey(key), { force: true });
    return true;
  }

  async ping() {
    await mkdir(this.outputDirectory, { recursive: true });
    return 'PONG';
  }
}
