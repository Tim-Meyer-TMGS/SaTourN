import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateQualityForItem,
  getCriteriaForType,
  getQualityScanConfig
} from '../Statistik/quality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const exampleDir = path.join(repoRoot, 'docs', 'Codex', 'examples');

const examples = [
  ['POI', 'poi.json'],
  ['Gastro', 'gastro.json'],
  ['Tour', 'tour.json'],
  ['Hotel', 'hotel.json']
];

async function readExampleItems(fileName) {
  const payload = JSON.parse(await readFile(path.join(exampleDir, fileName), 'utf8'));
  return Array.isArray(payload?.items) ? payload.items : [];
}

function formatQuery(value) {
  return value || '-';
}

for (const [type, fileName] of examples) {
  const rawItems = await readExampleItems(fileName);
  const evaluatedItems = rawItems.map((item) => evaluateQualityForItem({
    ...item,
    type,
    raw: item
  }));
  const criteria = getCriteriaForType(type);

  console.log(`\n${type} (${fileName})`);
  console.log(`Items: ${evaluatedItems.length}`);

  for (const criterion of criteria) {
    const scanConfig = getQualityScanConfig(criterion, type);
    const missingCount = evaluatedItems.filter((item) => item.missingCriteria.includes(criterion.id)).length;
    const fulfilledCount = evaluatedItems.filter((item) => item.fulfilledCriteria.includes(criterion.id)).length;

    console.log([
      criterion.id,
      `missing=${missingCount}`,
      `fulfilled=${fulfilledCount}`,
      `method=${scanConfig.method}`,
      `verified=${scanConfig.verified ? 'yes' : 'no'}`,
      `missingQuery=${formatQuery(scanConfig.missingQuery)}`
    ].join(' | '));
  }
}
