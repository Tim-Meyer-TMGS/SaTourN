import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateQualityForItem,
  getCriteriaForType,
  getQualityScanConfig,
  qualityHelpers
} from '../Statistik/quality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const exampleDir = path.join(repoRoot, 'docs', 'Codex', 'examples');
const outputJson = process.argv.includes('--json');

const examples = [
  { type: 'POI', fileName: 'poi.json' },
  { type: 'Gastro', fileName: 'gastro.json' },
  { type: 'Tour', fileName: 'tour.json' },
  { type: 'Hotel', fileName: 'hotel.json' }
];

const requiredHelpers = [
  'getTextsByRel',
  'hasTextByRel',
  'hasDetailsText',
  'isNonEmptyHtmlOrText',
  'getAttributeValue',
  'hasValidDatasetLicense',
  'getFeatureValues',
  'hasPublicTransportFeature',
  'getMediaObjects',
  'isCheckableMediaObject',
  'hasCheckableMedia',
  'findMissingCopyrightMedia',
  'hasBookingLink',
  'getAreaValues',
  'getCategoryValues'
];

async function readExampleItems(fileName) {
  const payload = JSON.parse(await readFile(path.join(exampleDir, fileName), 'utf8'));
  return Array.isArray(payload?.items) ? payload.items : [];
}

function itemId(item, fallbackIndex = 0) {
  return item?.global_id || item?.globalId || item?.id || `index_${fallbackIndex}`;
}

function firstExamples(items, predicate, limit = 5) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => predicate(item))
    .slice(0, limit)
    .map(({ item, index }) => itemId(item, index));
}

function count(items, predicate) {
  return items.filter(predicate).length;
}

function helperDiagnostics(items) {
  return {
    detailsText: {
      count: count(items, qualityHelpers.hasDetailsText),
      examples: firstExamples(items, qualityHelpers.hasDetailsText)
    },
    openingText: {
      count: count(items, (item) => qualityHelpers.hasTextByRel(item, 'openings')),
      examples: firstExamples(items, (item) => qualityHelpers.hasTextByRel(item, 'openings'))
    },
    validLicense: {
      count: count(items, qualityHelpers.hasValidDatasetLicense),
      examples: firstExamples(items, qualityHelpers.hasValidDatasetLicense)
    },
    publicTransportFeature: {
      count: count(items, qualityHelpers.hasPublicTransportFeature),
      examples: firstExamples(items, qualityHelpers.hasPublicTransportFeature)
    },
    checkableMedia: {
      count: count(items, qualityHelpers.hasCheckableMedia),
      examples: firstExamples(items, qualityHelpers.hasCheckableMedia)
    },
    missingCopyrightMedia: {
      count: count(items, (item) => qualityHelpers.findMissingCopyrightMedia(item).length > 0),
      examples: firstExamples(items, (item) => qualityHelpers.findMissingCopyrightMedia(item).length > 0)
    },
    bookingLink: {
      count: count(items, qualityHelpers.hasBookingLink),
      examples: firstExamples(items, qualityHelpers.hasBookingLink)
    },
    areaValues: {
      count: count(items, (item) => qualityHelpers.getAreaValues(item).length > 0),
      examples: firstExamples(items, (item) => qualityHelpers.getAreaValues(item).length > 0)
    },
    categoryValues: {
      count: count(items, (item) => qualityHelpers.getCategoryValues(item).length > 0),
      examples: firstExamples(items, (item) => qualityHelpers.getCategoryValues(item).length > 0)
    }
  };
}

function criterionDiagnostics(type, rawItems) {
  const evaluatedItems = rawItems.map((item) => evaluateQualityForItem({
    ...item,
    type,
    raw: item
  }));

  return getCriteriaForType(type).map((criterion) => {
    const scanConfig = getQualityScanConfig(criterion, type);
    const missingItems = evaluatedItems.filter((item) => item.missingCriteria.includes(criterion.id));
    const fulfilledItems = evaluatedItems.filter((item) => item.fulfilledCriteria.includes(criterion.id));

    return {
      criterionId: criterion.id,
      label: criterion.label,
      method: scanConfig.method,
      verified: scanConfig.verified,
      missingQuery: scanConfig.missingQuery,
      positiveQuery: scanConfig.positiveQuery,
      warnings: scanConfig.warnings,
      missingCount: missingItems.length,
      fulfilledCount: fulfilledItems.length,
      missingExampleIds: missingItems.slice(0, 5).map((item, index) => itemId(item.raw || item, index)),
      fulfilledExampleIds: fulfilledItems.slice(0, 5).map((item, index) => itemId(item.raw || item, index))
    };
  });
}

function buildWarnings(type, itemCount, helperStats, criteria) {
  const warnings = [];

  if (itemCount === 0) warnings.push('example_file_has_no_items');
  if (criteria.length === 0) warnings.push('type_has_no_active_criteria');
  if (helperStats.validLicense.count === 0) warnings.push('no_valid_license_found_in_examples');
  if (['POI', 'Gastro', 'Tour'].includes(type) && helperStats.detailsText.count === 0) {
    warnings.push('no_details_text_found_for_description_check');
  }
  if (['POI', 'Gastro', 'Tour'].includes(type) && helperStats.checkableMedia.count === 0) {
    warnings.push('no_checkable_media_found_for_image_check');
  }
  if (type === 'Hotel' && helperStats.bookingLink.count === 0) {
    warnings.push('no_hotel_booking_link_found_in_examples');
  }

  return warnings;
}

function printTextReport(results, helperStatus) {
  console.log('SaTourN quality example diagnostics');
  console.log(`Required helpers: ${helperStatus.available}/${helperStatus.required}`);
  if (helperStatus.missing.length) {
    console.log(`Missing helpers: ${helperStatus.missing.join(', ')}`);
  }

  for (const result of results) {
    console.log(`\n${result.type} (${result.fileName})`);
    console.log(`Items: ${result.itemCount}`);
    if (result.warnings.length) console.log(`Warnings: ${result.warnings.join(', ')}`);

    console.log('Helpers:');
    Object.entries(result.helpers).forEach(([name, stats]) => {
      console.log(`  ${name}: ${stats.count} | examples=${stats.examples.join(', ') || '-'}`);
    });

    console.log('Criteria:');
    result.criteria.forEach((criterion) => {
      console.log([
        `  ${criterion.criterionId}`,
        `missing=${criterion.missingCount}`,
        `fulfilled=${criterion.fulfilledCount}`,
        `method=${criterion.method}`,
        `verified=${criterion.verified ? 'yes' : 'no'}`,
        `missingQuery=${criterion.missingQuery || '-'}`,
        `missingExamples=${criterion.missingExampleIds.join(', ') || '-'}`
      ].join(' | '));
    });
  }
}

const helperStatus = {
  required: requiredHelpers.length,
  available: requiredHelpers.filter((helperName) => typeof qualityHelpers[helperName] === 'function').length,
  missing: requiredHelpers.filter((helperName) => typeof qualityHelpers[helperName] !== 'function')
};

const results = [];

for (const example of examples) {
  const rawItems = await readExampleItems(example.fileName);
  const helpers = helperDiagnostics(rawItems);
  const criteria = criterionDiagnostics(example.type, rawItems);
  const warnings = buildWarnings(example.type, rawItems.length, helpers, criteria);

  results.push({
    ...example,
    itemCount: rawItems.length,
    helpers,
    criteria,
    warnings
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  exampleDir,
  helperStatus,
  results
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printTextReport(results, helperStatus);
}

if (helperStatus.missing.length || results.some((result) => result.itemCount === 0)) {
  process.exitCode = 1;
}
