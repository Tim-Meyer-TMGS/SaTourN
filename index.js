import express from 'express';
import cors from 'cors';

import { CACHE_TTL_MS, PORT } from './lib/config.js';
import { TTLCache } from './lib/cache.js';
import { createKeyValueStore } from './lib/kv-store.js';
import { registerOiRoutes } from './routes/oi.js';
import { registerQualityRoute } from './routes/quality.js';
import { registerRecordRoutes } from './routes/records.js';
import { registerSearchRoute } from './routes/search.js';

const app = express();
const cache = new TTLCache(CACHE_TTL_MS);
const keyValueStore = createKeyValueStore();

app.disable('x-powered-by');
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.type('text/plain').send('SaTourN proxy alive');
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    keyValueStore: {
      mode: keyValueStore.mode,
      available: keyValueStore.available
    }
  });
});

registerSearchRoute(app, cache);
registerRecordRoutes(app);
registerOiRoutes(app);
registerQualityRoute(app, { keyValueStore });

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT);
