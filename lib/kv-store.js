import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

const DEFAULT_COMMAND_TIMEOUT_MS = 5000;
const DEFAULT_MEMORY_TTL_MS = 60 * 60 * 1000;

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function encodeCommand(parts) {
  const buffers = [`*${parts.length}\r\n`];
  parts.forEach((part) => {
    const value = Buffer.isBuffer(part) ? part : Buffer.from(String(part));
    buffers.push(`$${value.length}\r\n`, value, '\r\n');
  });
  return Buffer.concat(buffers.map((part) => Buffer.isBuffer(part) ? part : Buffer.from(part)));
}

function parseLine(buffer, offset) {
  const end = buffer.indexOf('\r\n', offset);
  if (end < 0) return null;
  return {
    line: buffer.toString('utf8', offset, end),
    offset: end + 2
  };
}

function parseResp(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[offset]);
  const line = parseLine(buffer, offset + 1);
  if (!line) return null;

  if (prefix === '+') return { value: line.line, offset: line.offset };
  if (prefix === '-') {
    const error = new Error(line.line);
    error.redis = true;
    throw error;
  }
  if (prefix === ':') return { value: Number(line.line), offset: line.offset };
  if (prefix === '$') {
    const length = Number(line.line);
    if (length === -1) return { value: null, offset: line.offset };
    const end = line.offset + length;
    if (buffer.length < end + 2) return null;
    return {
      value: buffer.toString('utf8', line.offset, end),
      offset: end + 2
    };
  }
  if (prefix === '*') {
    const count = Number(line.line);
    if (count === -1) return { value: null, offset: line.offset };
    const values = [];
    let cursor = line.offset;
    for (let index = 0; index < count; index += 1) {
      const parsed = parseResp(buffer, cursor);
      if (!parsed) return null;
      values.push(parsed.value);
      cursor = parsed.offset;
    }
    return { value: values, offset: cursor };
  }

  throw new Error(`Unsupported Redis response prefix: ${prefix}`);
}

function normalizeTtlSeconds(ttlMs) {
  const value = Number(ttlMs);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.ceil(value / 1000));
}

export function stableHash(value) {
  return crypto
    .createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

class MemoryKeyValueStore {
  constructor({ ttlMs = DEFAULT_MEMORY_TTL_MS } = {}) {
    this.mode = 'memory';
    this.available = true;
    this.defaultTtlMs = ttlMs;
    this.values = new Map();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.values.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) this.values.delete(key);
    }
  }

  async get(key) {
    this.cleanup();
    const entry = this.values.get(key);
    return entry ? entry.value : null;
  }

  async set(key, value, { ttlMs = this.defaultTtlMs } = {}) {
    const ttl = Number(ttlMs);
    this.values.set(key, {
      value: String(value),
      expiresAt: Number.isFinite(ttl) && ttl > 0 ? Date.now() + ttl : null
    });
    return true;
  }

  async getJson(key) {
    const value = await this.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async setJson(key, value, options = {}) {
    return this.set(key, JSON.stringify(value), options);
  }

  async del(key) {
    this.values.delete(key);
    return true;
  }

  async ping() {
    return 'PONG';
  }
}

class RedisKeyValueStore {
  constructor(url, { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
    this.mode = 'redis';
    this.available = true;
    this.url = new URL(url);
    this.timeoutMs = timeoutMs;
    this.secure = this.url.protocol === 'rediss:';
    this.db = this.url.pathname && this.url.pathname !== '/'
      ? Number.parseInt(this.url.pathname.slice(1), 10)
      : null;
  }

  openSocket() {
    const port = Number(this.url.port || (this.secure ? 6380 : 6379));
    const options = {
      host: this.url.hostname,
      port,
      servername: this.url.hostname
    };
    return this.secure ? tls.connect(options) : net.connect(options);
  }

  async command(parts) {
    const socket = this.openSocket();
    let buffer = Buffer.alloc(0);
    let settled = false;
    let expectedResponses = 1;
    let responseCount = 0;
    let finalValue = null;

    const run = () => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Redis command timeout'));
      }, this.timeoutMs);

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.end();
        callback(value);
      };

      const fail = (error) => finish(reject, error);

      socket.on('error', fail);
      socket.on('data', (chunk) => {
        try {
          buffer = Buffer.concat([buffer, chunk]);
          while (true) {
            const parsed = parseResp(buffer);
            if (!parsed) return;
            responseCount += 1;
            finalValue = parsed.value;
            buffer = buffer.subarray(parsed.offset);
            if (responseCount >= expectedResponses) {
              finish(resolve, finalValue);
              return;
            }
          }
        } catch (error) {
          fail(error);
        }
      });

      socket.once(this.secure ? 'secureConnect' : 'connect', async () => {
        try {
          const initialCommands = [];
          const username = decodeURIComponent(this.url.username || '');
          const password = decodeURIComponent(this.url.password || '');
          if (username && password) initialCommands.push(['AUTH', username, password]);
          else if (password) initialCommands.push(['AUTH', password]);
          if (Number.isInteger(this.db) && this.db >= 0) initialCommands.push(['SELECT', String(this.db)]);
          expectedResponses = initialCommands.length + 1;

          for (const command of initialCommands) {
            socket.write(encodeCommand(command));
          }
          socket.write(encodeCommand(parts));
        } catch (error) {
          fail(error);
        }
      });
    });

    return run();
  }

  async get(key) {
    return this.command(['GET', key]);
  }

  async set(key, value, { ttlMs } = {}) {
    const ttlSeconds = normalizeTtlSeconds(ttlMs);
    const parts = ttlSeconds
      ? ['SET', key, value, 'EX', String(ttlSeconds)]
      : ['SET', key, value];
    await this.command(parts);
    return true;
  }

  async getJson(key) {
    const value = await this.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async setJson(key, value, options = {}) {
    return this.set(key, JSON.stringify(value), options);
  }

  async del(key) {
    await this.command(['DEL', key]);
    return true;
  }

  async ping() {
    return this.command(['PING']);
  }
}

class FallbackKeyValueStore {
  constructor(primary, fallback) {
    this.primary = primary;
    this.fallback = fallback;
    this.mode = primary ? primary.mode : fallback.mode;
    this.available = Boolean(primary);
  }

  async call(method, args) {
    if (this.primary) {
      try {
        return await this.primary[method](...args);
      } catch (error) {
        this.available = false;
        console.warn(`Key Value ${method} failed; using memory fallback.`, error.message || error);
      }
    }
    return this.fallback[method](...args);
  }

  get(key) { return this.call('get', [key]); }
  set(key, value, options) { return this.call('set', [key, value, options]); }
  getJson(key) { return this.call('getJson', [key]); }
  setJson(key, value, options) { return this.call('setJson', [key, value, options]); }
  del(key) { return this.call('del', [key]); }
  ping() { return this.call('ping', []); }
}

export function createKeyValueStore() {
  const redisUrl = firstEnv('REDIS_URL', 'KEY_VALUE_URL', 'KV_URL');
  const fallback = new MemoryKeyValueStore({
    ttlMs: numberFromEnv('KV_MEMORY_TTL_MS', DEFAULT_MEMORY_TTL_MS)
  });

  if (!redisUrl) return fallback;

  const primary = new RedisKeyValueStore(redisUrl, {
    timeoutMs: numberFromEnv('KV_TIMEOUT_MS', DEFAULT_COMMAND_TIMEOUT_MS)
  });
  return new FallbackKeyValueStore(primary, fallback);
}
