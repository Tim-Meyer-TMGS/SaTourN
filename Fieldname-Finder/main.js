import { $, downloadText, createStatusSetter } from '../lib/browser.js';

const ui = {
  file: $('jsonFile'),
  fileInfo: $('fileInfo'),
  convert: $('convertBtn'),
  download: $('downloadBtn'),
  error: $('errorMessage'),
  tableWrap: $('tableContainer'),
  tableBody: $('tableBody'),
  fieldCount: $('fieldCount'),
  status: $('status'),
};

let rows = [];

const setStatus = createStatusSetter(ui.status);

function setError(message = '') {
  if (!ui.error) return;
  ui.error.textContent = message;
}

function detectDataType(value) {
  const text = String(value || '').trim();
  if (!text) return 'Leer';
  if (/^(true|false)$/i.test(text)) return 'Boolean';
  if (/^-?\d+$/.test(text)) return 'Integer';
  if (/^-?\d+[,.]\d+$/.test(text)) return 'Float';
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?/.test(text)) return 'Datum';
  if (/^https?:\/\//i.test(text)) return 'URL';
  return 'String';
}

function mergeType(current, next) {
  if (!current) return next;
  if (current === next) return current;
  if (current === 'Leer') return next;
  if (next === 'Leer') return current;
  if ((current === 'Integer' && next === 'Float') || (current === 'Float' && next === 'Integer')) {
    return 'Float';
  }
  return 'Gemischt';
}

function collectFields(data) {
  const fields = new Map();

  function remember(name, value, typeHint = '') {
    const fieldName = String(name || '').trim();
    if (!fieldName) return;

    const example = value == null || typeof value === 'object' ? '' : String(value);
    const detected = typeHint || detectDataType(example);
    const entry = fields.get(fieldName) || { name: fieldName, type: '', count: 0, example: '' };

    entry.type = mergeType(entry.type, detected);
    entry.count += 1;
    if (!entry.example && example) entry.example = example.slice(0, 160);

    fields.set(fieldName, entry);
  }

  function walk(value, path) {
    if (Array.isArray(value)) {
      remember(path, '', 'Array');
      value.forEach((entry) => walk(entry, `${path}[]`));
      return;
    }

    if (value && typeof value === 'object') {
      if (path) remember(path, '', 'Object');
      for (const [key, child] of Object.entries(value)) {
        walk(child, path ? `${path}.${key}` : key);
      }
      return;
    }

    remember(path, value);
  }

  walk(data, '');
  return Array.from(fields.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

function renderTable() {
  if (!ui.tableBody || !ui.tableWrap || !ui.download) return;
  ui.tableBody.replaceChildren();

  for (const row of rows) {
    const tr = document.createElement('tr');
    [row.name, row.type || 'Unbekannt', row.count, row.example || '-'].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    });
    ui.tableBody.appendChild(tr);
  }

  ui.fieldCount.textContent = String(rows.length);
  ui.tableWrap.hidden = rows.length === 0;
  ui.download.disabled = rows.length === 0;
}

function readSelectedFile() {
  const file = ui.file.files?.[0];
  if (!file) throw new Error('Bitte eine JSON-Datei auswählen.');
  if (!/\.json$/i.test(file.name) && !/json/i.test(file.type || '')) {
    throw new Error('Bitte eine Datei im JSON-Format auswählen.');
  }
  return file;
}

async function analyse() {
  setError();
  setStatus('läuft', 'run');

  try {
    const file = readSelectedFile();
    const text = await file.text();
    rows = collectFields(JSON.parse(text));
    renderTable();
    setStatus('fertig', 'ok');
  } catch (error) {
    rows = [];
    renderTable();
    setError(error.message || String(error));
    setStatus('fehler', 'err');
  }
}

function downloadCsvFallback() {
  const lines = [
    ['Feldname', 'Datentyp', 'Vorkommen', 'Beispiel'],
    ...rows.map((row) => [row.name, row.type, row.count, row.example])
  ]
    .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'));

  downloadText('fieldnames.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

function downloadExcel() {
  if (!rows.length) return;

  if (!window.XLSX) {
    downloadCsvFallback();
    return;
  }

  const data = [
    ['Feldname', 'Datentyp', 'Vorkommen', 'Beispiel'],
    ...rows.map((row) => [row.name, row.type, row.count, row.example])
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), 'Felder');
  XLSX.writeFile(workbook, 'fieldnames.xlsx');
}

function init() {
  if (!ui.file || !ui.convert || !ui.download) return;

  ui.file.addEventListener('change', () => {
    const file = ui.file.files?.[0];
    rows = [];
    renderTable();
    setError();
    setStatus('bereit', 'idle');
    ui.fileInfo.textContent = file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : 'Keine Datei ausgewählt';
    ui.convert.disabled = !file;
  });

  ui.convert.addEventListener('click', analyse);
  ui.download.addEventListener('click', downloadExcel);
  renderTable();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
