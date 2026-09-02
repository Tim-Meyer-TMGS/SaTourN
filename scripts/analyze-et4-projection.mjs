import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { compactEt4Record, extractEt4Items } from '../lib/database/compact-et4-record.js';
import { evaluateQualityForItem } from '../Statistik/quality.js';

function byteSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function evaluationSignature(item) {
  const evaluated = evaluateQualityForItem(item);
  return JSON.stringify({
    missingCriteria: evaluated.missingCriteria,
    fulfilledCriteria: evaluated.fulfilledCriteria,
    manualCriteria: evaluated.manualCriteria,
    excludedCriteria: evaluated.excludedCriteria,
    qualityScore: evaluated.qualityScore,
    qualityStatus: evaluated.qualityStatus
  });
}

async function analyzeFile(filePath) {
  const sourceText = await readFile(filePath, 'utf8');
  const document = JSON.parse(sourceText);
  const items = extractEt4Items(document);
  const compactItems = items.map(compactEt4Record);
  const mismatches = [];

  items.forEach((item, index) => {
    if (evaluationSignature(item) !== evaluationSignature(compactItems[index])) {
      mismatches.push(String(item.global_id || item.id || index));
    }
  });

  const sourceStats = await stat(filePath);
  const compactBytes = byteSize(compactItems);
  const fieldBytes = {};
  compactItems.forEach((item) => {
    Object.entries(item).forEach(([field, value]) => {
      fieldBytes[field] = (fieldBytes[field] || 0) + byteSize(value);
    });
  });

  return {
    file: path.resolve(filePath),
    records: items.length,
    sourceBytes: sourceStats.size,
    compactBytes,
    reductionPercent: sourceStats.size > 0
      ? Math.round((1 - compactBytes / sourceStats.size) * 10000) / 100
      : 0,
    largestCompactFields: Object.entries(fieldBytes)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([field, bytes]) => ({ field, bytes })),
    qualityMismatches: mismatches.length,
    mismatchExamples: mismatches.slice(0, 10)
  };
}

const filePaths = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
if (!filePaths.length) {
  console.error('Usage: node scripts/analyze-et4-projection.mjs <et4-json> [more-json-files]');
  process.exitCode = 1;
} else {
  for (const filePath of filePaths) {
    const result = await analyzeFile(filePath);
    console.log(JSON.stringify(result, null, 2));
    if (result.qualityMismatches > 0) process.exitCode = 1;
  }
}
