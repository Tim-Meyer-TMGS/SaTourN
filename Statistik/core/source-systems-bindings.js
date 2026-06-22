export function collectPrimarySystems({
  rows,
  getPrimarySystem,
  collectPrimarySystemsModel
}) {
  return collectPrimarySystemsModel(rows, { getPrimarySystem });
}

export function getSourceId({
  item,
  getFirst,
  textValue,
  getSourceIdModel
}) {
  return getSourceIdModel(item, { getFirst, textValue });
}

export function getPrimarySystem({
  item,
  textValue,
  getPrimarySystemModel
}) {
  return getPrimarySystemModel(item, textValue);
}

export function getKeywordValues({
  item,
  textValue,
  getKeywordValuesModel
}) {
  return getKeywordValuesModel(item, textValue);
}

export function safeKeywordArray({
  value,
  textValue,
  safeKeywordArrayModel
}) {
  return safeKeywordArrayModel(value, textValue);
}
