import { $, debounce, uid, triggerDownload } from './lib/dom-utils.js';
import { sanitizeXML, isValidSchemaorg, formatXml } from './lib/xml-utils.js';
import { getDeepLApiKey, loadJsonFromLocalStorage, saveJsonToLocalStorage } from './lib/storage-utils.js';

const MAX_HISTORY = 30;
const DEEPL_SESSION_KEY = 'ceDeepLApiKey';

const KNOWN_LANGUAGES = [
  'de-DE', 'en-GB', 'en-US', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT',
  'nl-NL', 'pl-PL', 'ru-RU', 'zh-CN', 'ja-JP',
  'ar-EG', 'ar-SA', 'ko-KR', 'sv-SE', 'da-DK', 'fi-FI', 'no-NO',
  'tr-TR', 'cs-CZ', 'sk-SK', 'hu-HU', 'ro-RO',
];

const DEEPL_MAPPING = {
  'de-DE': 'DE',    'en-GB': 'EN-GB', 'en-US': 'EN-US', 'fr-FR': 'FR',
  'es-ES': 'ES',    'it-IT': 'IT',    'pt-PT': 'PT-PT', 'nl-NL': 'NL',
  'pl-PL': 'PL',    'ru-RU': 'RU',    'zh-CN': 'ZH',    'ja-JP': 'JA',
  'ar-EG': 'AR',    'ar-SA': 'AR',    'ko-KR': 'KO',    'sv-SE': 'SV',
  'da-DK': 'DA',    'fi-FI': 'FI',    'no-NO': 'NO',    'tr-TR': 'TR',
  'cs-CZ': 'CS',    'sk-SK': 'SK',    'hu-HU': 'HU',    'ro-RO': 'RO',
};

const DEFAULT_SOURCES = [
  { label: 'Vermieter',        url: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml' },
  { label: 'Veranstaltung',    url: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/sachsen-tourismus-beta/VeranstaltungTree.xml' },
  { label: 'Gastro',           url: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml' },
  { label: 'Tour',             url: 'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml' },
  { label: 'Poi',              url: 'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml' },
  { label: 'GlobalePauschale', url: 'https://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml' },
];

let xmlDoc = null;
let categoriesNode = null;
let selectedCatEl = null;
let draggedEl = null;
let ghostEl = null;
let undoStack = [];
let redoStack = [];
let xmlSources = [];

const isDebug = location.search.includes('debug=true');
const el = {};

function showToast(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `ce-toast ce-toast--${type}`;
  d.textContent = msg;
  el.toastContainer.appendChild(d);
  setTimeout(() => {
    d.classList.add('fade-out');
    setTimeout(() => d.remove(), 500);
  }, 3200);
}

function logDebug(msg) {
  if (!isDebug) return;
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.debugLog.appendChild(p);
  el.debugLog.scrollTop = 9999;
}

function enableButtons(on) {
  [el.addRootBtn, el.downloadBtn, el.downloadJsonBtn, el.downloadCsvBtn]
    .forEach(b => { b.disabled = !on; });
  [el.expandAllBtn, el.collapseAllBtn]
    .forEach(b => { b.style.display = on ? 'inline-flex' : 'none'; });
}

function buildLabel(catEl) {
  const name = catEl.getAttribute('Name') || '(kein Name)';
  const dn = Array.from(catEl.getElementsByTagName('DisplayName'))
    .find(d => d.getAttribute('xml:lang') === 'de-DE');
  return (dn && dn.textContent !== name) ? `${name}  (${dn.textContent})` : name;
}

function catChildren(node) {
  return Array.from(node.children).filter(c => c.tagName === 'Category');
}

function toggleCollapse(li) {
  const ul = li.querySelector(':scope > ul');
  const tog = li.querySelector(':scope > .ce-toggle');
  if (!ul) return;
  const collapsed = ul.classList.toggle('ce-collapsed');
  if (tog) tog.textContent = collapsed ? '▶' : '▼';
}

function setAllCollapsed(collapse) {
  el.treeContainer.querySelectorAll('li > ul')
    .forEach(u => u.classList.toggle('ce-collapsed', collapse));
  el.treeContainer.querySelectorAll('.ce-toggle:not(.ce-leaf)')
    .forEach(t => { t.textContent = collapse ? '▶' : '▼'; });
}

function updateTreeStats() {
  if (!categoriesNode) return;
  const total = categoriesNode.getElementsByTagName('Category').length;
  const roots = catChildren(categoriesNode).length;
  el.treeStats.textContent = `${total} Kategorien · ${roots} Roots`;
}

function applyFilter() {
  if (!categoriesNode) return;
  const q = el.searchInput.value.trim().toLowerCase();
  const attr = el.attributeFilter.value;
  traverseFilter(categoriesNode, q, attr);
}

function traverseFilter(node, q, attr) {
  catChildren(node).forEach(cat => {
    const li = el.treeContainer.querySelector(`[data-id="${cat.getAttribute('id')}"]`);
    if (!li) return;

    let attrOk = true;
    switch (attr) {
      case 'ohne-schemaorg':
        attrOk = !cat.getAttribute('schemaorg');
        break;
      case 'ohne-deDE':
        attrOk = !Array.from(cat.getElementsByTagName('DisplayName'))
                       .some(d => d.getAttribute('xml:lang') === 'de-DE');
        break;
      case 'root':
        attrOk = cat.parentElement === categoriesNode;
        break;
      case 'unterkategorien':
        attrOk = cat.parentElement !== categoriesNode;
        break;
    }

    const textOk = !q
      || (cat.getAttribute('Name') || '').toLowerCase().includes(q)
      || Array.from(cat.getElementsByTagName('DisplayName'))
             .some(d => d.textContent.toLowerCase().includes(q));

    const match = attrOk && textOk;
    const active = !!(q || attr);
    li.classList.toggle('ce-highlight', match && active);
    li.classList.toggle('ce-dim',       !match && active);
    if (match && q) expandToRoot(cat);

    traverseFilter(cat, q, attr);
  });
}

function expandToRoot(catEl) {
  let p = catEl.parentElement;
  while (p && p !== el.treeContainer) {
    if (p.tagName === 'UL') {
      p.classList.remove('ce-collapsed');
      const parentLi = p.closest('li');
      if (parentLi) {
        const tog = parentLi.querySelector(':scope > .ce-toggle');
        if (tog && !tog.classList.contains('ce-leaf')) tog.textContent = '▼';
      }
    }
    p = p.parentElement;
  }
}

function openEditor(catEl) {
  selectedCatEl = catEl;

  el.treeContainer.querySelectorAll('li').forEach(l => {
    l.classList.remove('ce-selected');
    l.setAttribute('aria-selected', 'false');
  });
  const li = el.treeContainer.querySelector(`[data-id="${catEl.getAttribute('id')}"]`);
  if (li) {
    li.classList.add('ce-selected');
    li.setAttribute('aria-selected', 'true');
    li.focus();
  }

  el.catName.value = catEl.getAttribute('Name') || '';
  el.catSchemaorg.value = catEl.getAttribute('schemaorg') || '';
  el.displayNamesContainer.innerHTML = '';
  Array.from(catEl.getElementsByTagName('DisplayName'))
       .forEach(d => addDisplayNameRow(d.getAttribute('xml:lang'), d.textContent));

  el.editorContainer.style.display = 'block';
  el.editorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  el.catName.focus();
}

function closeEditor() {
  el.editorContainer.style.display = 'none';
  selectedCatEl = null;
}

function addDisplayNameRow(lang = '', text = '') {
  const row = document.createElement('div');
  row.className = 'ce-dn-row';

  const sel = document.createElement('select');
  sel.className = 'ce-lang-sel';
  const empty = document.createElement('option');
  empty.value = ''; empty.textContent = '-- Sprache --';
  sel.appendChild(empty);
  KNOWN_LANGUAGES.forEach(l => {
    const o = document.createElement('option');
    o.value = l; o.textContent = l;
    if (l === lang) o.selected = true;
    sel.appendChild(o);
  });
  if (lang && !KNOWN_LANGUAGES.includes(lang)) {
    const o = document.createElement('option');
    o.value = lang; o.textContent = lang; o.selected = true;
    sel.appendChild(o);
  }

  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'ce-dn-text';
  inp.placeholder = 'Übersetzung'; inp.value = text;
  inp.addEventListener('input', () => { inp.value = sanitizeXML(inp.value); });

  const del = document.createElement('button');
  del.type = 'button'; del.className = 'btn-danger ce-dn-del'; del.textContent = '✕';
  del.addEventListener('click', () => row.remove());

  row.append(sel, inp, del);
  el.displayNamesContainer.appendChild(row);
}

function saveCategoryChanges() {
  if (!selectedCatEl) return;

  const name = el.catName.value.trim();
  const schema = el.catSchemaorg.value.trim();

  if (!name) { showToast('Name darf nicht leer sein.', 'warning'); return; }
  if (nameConflict(selectedCatEl, name)) { showToast('Geschwister mit diesem Namen existiert.', 'error'); return; }
  if (!isValidSchemaorg(schema)) { showToast('Ungültiger schemaorg-Wert.', 'error'); return; }
  const dup = dupLang();
  if (dup) { showToast(`Doppelte Sprache: ${dup}`, 'error'); return; }

  selectedCatEl.setAttribute('Name', name);
  if (schema) selectedCatEl.setAttribute('schemaorg', schema);
  else selectedCatEl.removeAttribute('schemaorg');

  const kids = catChildren(selectedCatEl);
  while (selectedCatEl.firstChild) selectedCatEl.removeChild(selectedCatEl.firstChild);

  el.displayNamesContainer.querySelectorAll('.ce-dn-row').forEach(row => {
    const lang = row.querySelector('.ce-lang-sel').value.trim();
    const txt = row.querySelector('.ce-dn-text').value.trim();
    if (lang && txt) {
      const dn = xmlDoc.createElement('DisplayName');
      dn.setAttribute('xml:lang', lang);
      dn.textContent = txt;
      selectedCatEl.appendChild(dn);
    }
  });
  kids.forEach(k => selectedCatEl.appendChild(k));

  rebuildTree();
  closeEditor();
  showToast('Gespeichert.', 'success');
}

function nameConflict(catEl, newName) {
  const parent = catEl.parentElement || categoriesNode;
  return catChildren(parent)
    .filter(c => c !== catEl)
    .some(c => c.getAttribute('Name') === newName);
}

function dupLang() {
  const langs = Array.from(el.displayNamesContainer.querySelectorAll('.ce-lang-sel'))
                     .map(s => s.value).filter(Boolean);
  return langs.find((l, i) => langs.indexOf(l) !== i) || null;
}

function deleteCategory(catEl) {
  if (!catEl) return;
  catEl.parentNode.removeChild(catEl);
  closeEditor();
  rebuildTree();
  showToast('Kategorie gelöscht.', 'info');
}

function startInlineEdit(e, li, catEl) {
  e.stopPropagation();
  if (li.querySelector('.ce-inline-input')) return;

  const old = catEl.getAttribute('Name') || '';
  const lbl = li.querySelector('.ce-label');

  const inp = document.createElement('input');
  inp.className = 'ce-inline-input'; inp.value = old; inp.type = 'text';

  const save = document.createElement('button');
  save.textContent = '✓'; save.className = 'btn-primary ce-inline-btn';

  const cancel = document.createElement('button');
  cancel.textContent = '✕'; cancel.className = 'btn-danger ce-inline-btn';

  lbl.style.display = 'none';
  lbl.after(inp); inp.after(save); save.after(cancel);
  inp.focus(); inp.select();

  const commit = () => {
    const v = inp.value.trim();
    if (!v) { showToast('Name darf nicht leer sein.', 'warning'); return; }
    if (nameConflict(catEl, v)) { showToast('Namenskonflikt.', 'error'); return; }
    catEl.setAttribute('Name', v);
    recordState();
    rebuildTree();
    showToast('Name geändert.', 'success');
  };

  const abort = () => {
    inp.remove(); save.remove(); cancel.remove();
    lbl.style.display = '';
  };

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') abort();
  });
  save.addEventListener('click', commit);
  cancel.addEventListener('click', abort);
}

function addRootCategory() {
  if (!categoriesNode) {
    xmlDoc = document.implementation.createDocument('', 'Categories', null);
    categoriesNode = xmlDoc.documentElement;
  }
  const cat = newEmptyCat();
  let base = 'Neue Kategorie', name = base, n = 1;
  while (catChildren(categoriesNode).some(c => c.getAttribute('Name') === name)) {
    name = `${base} ${n++}`;
  }
  cat.setAttribute('Name', name);
  cat.querySelector('DisplayName').textContent = name;
  categoriesNode.appendChild(cat);
  rebuildTree();
  openEditor(cat);
}

function newEmptyCat() {
  if (!xmlDoc) {
    xmlDoc = document.implementation.createDocument('', 'Categories', null);
    categoriesNode = xmlDoc.documentElement;
  }
  const cat = xmlDoc.createElement('Category');
  cat.setAttribute('id', uid());
  cat.setAttribute('Name', 'Neue Kategorie');
  const dn = xmlDoc.createElement('DisplayName');
  dn.setAttribute('xml:lang', 'de-DE');
  dn.textContent = 'Neue Kategorie';
  cat.appendChild(dn);
  return cat;
}

function syncBulkButtons() {
  const any = !!el.treeContainer.querySelector('.ce-checkbox:checked');
  el.bulkEditBtn.disabled = !any;
  el.bulkDeleteBtn.disabled = !any;
}

function showBulkEditDialog() {
  let dlg = $('ceBulkDialog');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'ceBulkDialog'; dlg.className = 'ce-modal';
    dlg.innerHTML = `
      <div class="ce-modal-box">
        <h3>Bulk-Bearbeitung</h3>
        <div class="ce-form-row">
          <label>Neuer schemaorg-Wert <small>(leer lassen = keine Änderung)</small></label>
          <input type="text" id="bulkSchemaInput" placeholder="FoodEstablishment oder URL…" />
        </div>
        <div class="ce-btn-row" style="margin-top:12px;">
          <button id="confirmBulkBtn" class="btn-primary">Übernehmen</button>
          <button id="cancelBulkBtn">Abbrechen</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    $('cancelBulkBtn').addEventListener('click', () => { dlg.style.display = 'none'; });
    $('confirmBulkBtn').addEventListener('click', confirmBulkEdit);
  }
  dlg.style.display = 'flex';
}

function confirmBulkEdit() {
  const schema = $('bulkSchemaInput').value.trim();
  if (schema && !isValidSchemaorg(schema)) { showToast('Ungültiger schemaorg-Wert.', 'error'); return; }
  const checked = Array.from(el.treeContainer.querySelectorAll('.ce-checkbox:checked'))
                       .map(cb => cb.closest('li'));
  if (!checked.length) { showToast('Keine Kategorien gewählt.', 'warning'); return; }
  recordState();
  checked.forEach(li => { if (schema) li.xmlElement.setAttribute('schemaorg', schema); });
  $('ceBulkDialog').style.display = 'none';
  rebuildTree();
  showToast(`${checked.length} Kategorien aktualisiert.`, 'success');
}

function confirmBulkDelete() {
  const checked = Array.from(el.treeContainer.querySelectorAll('.ce-checkbox:checked'))
                       .map(cb => cb.closest('li'));
  if (!checked.length) { showToast('Keine Kategorien gewählt.', 'warning'); return; }
  if (!confirm(`Wirklich ${checked.length} Kategorien (inkl. Unterkategorien) löschen?`)) return;
  recordState();
  checked.forEach(li => li.xmlElement.parentNode.removeChild(li.xmlElement));
  rebuildTree();
  showToast('Gelöscht.', 'info');
}

function handleKeydown(e) {
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); return; }
  if (e.key === 'y' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redo(); return; }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

  const li = document.activeElement.closest && document.activeElement.closest('li');

  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); navFocus(li, 'down'); break;
    case 'ArrowUp': e.preventDefault(); navFocus(li, 'up'); break;
    case 'ArrowRight': e.preventDefault(); navFocus(li, 'right'); break;
    case 'ArrowLeft': e.preventDefault(); navFocus(li, 'left'); break;
    case 'Enter':
      if (li) { e.preventDefault(); openEditor(li.xmlElement); }
      break;
    case 'Delete':
      if (li && confirm('Kategorie löschen?')) {
        e.preventDefault(); recordState(); deleteCategory(li.xmlElement);
      }
      break;
  }
}

function navFocus(li, dir) {
  if (!li) {
    const first = el.treeContainer.querySelector('li');
    if (first) { first.tabIndex = 0; first.focus(); }
    return;
  }

  let next = null;
  if (dir === 'down') {
    next = li.nextElementSibling;
    if (!next) {
      let p = li.parentElement.closest('li');
      while (p && !p.nextElementSibling) p = p.parentElement.closest('li');
      if (p) next = p.nextElementSibling;
    }
  } else if (dir === 'up') {
    next = li.previousElementSibling || li.parentElement.closest('li');
  } else if (dir === 'right') {
    const ul = li.querySelector(':scope > ul');
    next = ul ? ul.querySelector('li') : li.nextElementSibling;
  } else if (dir === 'left') {
    next = li.parentElement.closest('li');
  }

  if (next && next.tagName === 'LI') { next.tabIndex = 0; next.focus(); }
}

function showContextMenu(e, catEl) {
  e.preventDefault();
  hideContextMenu();

  const menu = document.createElement('div');
  menu.id = 'ceCtxMenu';
  menu.className = 'ce-ctx-menu';
  menu.style.cssText = `position:fixed;top:${Math.min(e.clientY, window.innerHeight - 230)}px;left:${Math.min(e.clientX, window.innerWidth - 210)}px;`;

  menu.innerHTML = `
    <div data-a="edit" class="ce-ctx-item">✏️  Bearbeiten</div>
    <div data-a="addSub" class="ce-ctx-item">➕  Unterkategorie</div>
    <div data-a="moveRoot" class="ce-ctx-item">⬆️  Nach Root verschieben</div>
    <div data-a="exportCsv" class="ce-ctx-item">📄  Teilbaum als CSV</div>
    <div data-a="translate" class="ce-ctx-item">🌐  DeepL-Übersetzungen</div>
    <div data-a="delete" class="ce-ctx-item ce-ctx-danger">🗑  Löschen</div>`;

  document.body.appendChild(menu);
  menu.addEventListener('click', ev => {
    const action = ev.target.closest('[data-a]')?.dataset.a;
    if (!action) return;
    hideContextMenu();
    ctxAction(action, catEl);
  });
}

function ctxAction(action, catEl) {
  switch (action) {
    case 'edit': openEditor(catEl); break;
    case 'addSub':
      recordState();
      { const s = newEmptyCat(); catEl.appendChild(s); rebuildTree(); openEditor(s); }
      break;
    case 'moveRoot':
      recordState();
      catEl.parentNode.removeChild(catEl);
      categoriesNode.appendChild(catEl);
      rebuildTree();
      break;
    case 'exportCsv': exportSubtreeCsv(catEl); break;
    case 'translate': generateTranslations(catEl); break;
    case 'delete':
      if (confirm('Kategorie wirklich löschen?')) { recordState(); deleteCategory(catEl); }
      break;
  }
}

function handleDragStart(e) {
  draggedEl = e.currentTarget;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');

  ghostEl = document.createElement('div');
  ghostEl.className = 'ce-ghost';
  ghostEl.textContent = draggedEl.xmlElement.getAttribute('Name');
  document.body.appendChild(ghostEl);

  setTimeout(() => draggedEl && draggedEl.classList.add('ce-dragging'), 0);
}

function handleDragOver(e) {
  e.preventDefault(); e.stopPropagation();
  el.treeContainer.querySelectorAll('.ce-dragover')
    .forEach(x => x.classList.remove('ce-dragover'));
  e.currentTarget.classList.add('ce-dragover');
  if (ghostEl) {
    ghostEl.style.left = `${e.clientX + 14}px`;
    ghostEl.style.top = `${e.clientY + 10}px`;
  }
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('ce-dragover');
}

function handleDrop(e) {
  e.preventDefault(); e.stopPropagation();
  const target = e.currentTarget;
  target.classList.remove('ce-dragover');
  cleanupDrag();

  if (!draggedEl || draggedEl === target) return;

  const moving = draggedEl.xmlElement;
  const dest = target.xmlElement;
  let check = dest.parentElement;
  while (check) {
    if (check === moving) {
      showToast('Nicht in eigene Unterkategorie verschieben.', 'warning');
      return;
    }
    check = check.parentElement;
  }

  const rect = target.getBoundingClientRect();
  const rel = (e.clientY - rect.top) / rect.height;

  if (moving.parentNode) moving.parentNode.removeChild(moving);
  if (rel < 0.25) dest.parentNode.insertBefore(moving, dest);
  else if (rel > 0.75) dest.parentNode.insertBefore(moving, dest.nextSibling);
  else dest.appendChild(moving);

  recordState();
  rebuildTree();
  draggedEl = null;
}

function cleanupDrag() {
  if (ghostEl) { ghostEl.remove(); ghostEl = null; }
  el.treeContainer.querySelectorAll('.ce-dragging,.ce-dragover')
    .forEach(x => x.classList.remove('ce-dragging', 'ce-dragover'));
}

function handleBodyDrop(e) {
  e.preventDefault();
  el.dropOverlay.style.display = 'none';
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  if (!file.name.endsWith('.xml')) { showToast('Nur .xml Dateien.', 'error'); return; }
  processFile(file);
}

async function generateTranslations(catEl = selectedCatEl) {
  if (!catEl) { showToast('Bitte zuerst eine Kategorie öffnen.', 'warning'); return; }

  const dns = Array.from(catEl.getElementsByTagName('DisplayName'));
  const base = dns.find(d => d.getAttribute('xml:lang') === 'de-DE');
  if (!base) { showToast('de-DE DisplayName fehlt.', 'error'); return; }

  const have = dns.map(d => d.getAttribute('xml:lang'));
  const need = KNOWN_LANGUAGES.filter(l => !have.includes(l));
  if (!need.length) { showToast('Alle Übersetzungen bereits vorhanden.', 'info'); return; }

  const apiKey = getDeepLApiKey(DEEPL_SESSION_KEY);
  if (!apiKey) { showToast('DeepL API Key fehlt.', 'warning'); return; }

  showToast(`Übersetze ${need.length} Sprachen…`, 'info');

  try {
    const params = new URLSearchParams();
    params.append('auth_key', apiKey);
    params.append('text', base.textContent.trim());
    need.map(l => DEEPL_MAPPING[l]).filter(Boolean)
        .forEach(t => params.append('target_lang', t));

    const resp = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!resp.ok) throw new Error(resp.statusText);

    const data = await resp.json();
    (data.translations || []).forEach((t, i) => {
      if (need[i]) addDisplayNameRow(need[i], t.text);
    });
    showToast('Übersetzungen eingefügt.', 'success');
    recordState();
  } catch (err) {
    showToast('DeepL-Fehler: ' + err.message, 'error');
  }
}

function downloadXML() {
  if (!xmlDoc) return;
  const clone = xmlDoc.cloneNode(true);
  Array.from(clone.getElementsByTagName('Category')).forEach(c => c.removeAttribute('id'));

  let str = new XMLSerializer().serializeToString(clone).replace(/<\?xml[^?]*\?>\s*/, '');
  str = '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(str);

  if (new DOMParser().parseFromString(str, 'application/xml').querySelector('parsererror')) {
    showToast('XML-Fehler – Download abgebrochen.', 'error');
    return;
  }
  triggerDownload(URL.createObjectURL(new Blob([str], { type: 'text/xml' })), 'kategorien.xml');
}

function downloadJSON() {
  if (!xmlDoc) return;

  const toObj = c => ({
    Name: c.getAttribute('Name'),
    schemaorg: c.getAttribute('schemaorg') || '',
    displayNames: Object.fromEntries(
      Array.from(c.getElementsByTagName('DisplayName'))
           .map(d => [d.getAttribute('xml:lang'), d.textContent])
    ),
    children: catChildren(c).map(toObj),
  });

  const json = JSON.stringify({ categories: catChildren(categoriesNode).map(toObj) }, null, 2);
  triggerDownload(URL.createObjectURL(new Blob([json], { type: 'application/json' })), 'kategorien.json');
}

function downloadCSV() {
  if (!xmlDoc) return;
  const rows = [['Name', 'schemaorg', 'de-DE', 'Eltern-Name']];
  const walk = (c, parent = '') => {
    const dn = c.getElementsByTagName('DisplayName')[0];
    rows.push([
      c.getAttribute('Name') || '',
      c.getAttribute('schemaorg') || '',
      dn ? dn.textContent : '',
      parent,
    ]);
    catChildren(c).forEach(s => walk(s, c.getAttribute('Name')));
  };
  catChildren(categoriesNode).forEach(c => walk(c));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  triggerDownload(encodeURI('data:text/csv;charset=utf-8,' + csv), 'kategorien.csv');
}

function exportSubtreeCsv(catEl) {
  const rows = [['Name', 'schemaorg', 'de-DE', 'Eltern-Name']];
  const walk = (c, parent = '') => {
    const dn = c.getElementsByTagName('DisplayName')[0];
    rows.push([
      c.getAttribute('Name') || '',
      c.getAttribute('schemaorg') || '',
      dn ? dn.textContent : '',
      parent,
    ]);
    catChildren(c).forEach(s => walk(s, c.getAttribute('Name')));
  };
  walk(catEl);
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  triggerDownload(encodeURI('data:text/csv;charset=utf-8,' + csv), `subtree_${catEl.getAttribute('Name')}.csv`);
}

function handleJsonImport(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const obj = JSON.parse(ev.target.result);
      if (!obj.categories) throw new Error("Kein 'categories'-Feld.");

      recordState();
      xmlDoc = document.implementation.createDocument('', 'Categories', null);
      categoriesNode = xmlDoc.documentElement;

      const toEl = o => {
        const c = xmlDoc.createElement('Category');
        c.setAttribute('id', uid());
        c.setAttribute('Name', o.Name || '');
        if (o.schemaorg) c.setAttribute('schemaorg', o.schemaorg);
        Object.entries(o.displayNames || {}).forEach(([l, t]) => {
          const d = xmlDoc.createElement('DisplayName');
          d.setAttribute('xml:lang', l); d.textContent = t;
          c.appendChild(d);
        });
        (o.children || []).forEach(s => c.appendChild(toEl(s)));
        return c;
      };

      obj.categories.forEach(o => categoriesNode.appendChild(toEl(o)));
      enableButtons(true);
      rebuildTree();
      showToast('JSON importiert.', 'success');
    } catch (err) {
      showToast('JSON-Fehler: ' + err.message, 'error');
    }
  };
  reader.readAsText(f, 'UTF-8');
}

function handleCsvImport(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const rows = ev.target.result
      .split(/\r?\n/)
      .map(l => l.split(';'))
      .filter(r => r[0]?.replace(/"/g, ''));

    if (rows.length < 2) { showToast('CSV zu kurz.', 'error'); return; }

    recordState();
    xmlDoc = document.implementation.createDocument('', 'Categories', null);
    categoriesNode = xmlDoc.documentElement;

    const clean = v => (v || '').replace(/^"|"$/g, '');
    const map = {};

    rows.slice(1).forEach(([name, schema, dn, parent]) => {
      const n = clean(name); if (!n) return;
      const c = xmlDoc.createElement('Category');
      c.setAttribute('id', uid()); c.setAttribute('Name', n);
      const s = clean(schema); if (s) c.setAttribute('schemaorg', s);
      const d = clean(dn);
      if (d) {
        const dnEl = xmlDoc.createElement('DisplayName');
        dnEl.setAttribute('xml:lang', 'de-DE'); dnEl.textContent = d;
        c.appendChild(dnEl);
      }
      map[n] = { el: c, parent: clean(parent) };
    });

    Object.values(map).forEach(({ el: c, parent }) => {
      const p = parent && map[parent];
      (p ? p.el : categoriesNode).appendChild(c);
    });

    enableButtons(true);
    rebuildTree();
    showToast('CSV importiert.', 'success');
  };
  reader.readAsText(f, 'UTF-8');
}

function updateXmlPreview() {
  if (!xmlDoc || el.viewPreview.style.display === 'none') return;
  let str = new XMLSerializer().serializeToString(xmlDoc).replace(/<\?xml[^?]*\?>\s*/, '');
  str = '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(str);
  el.xmlPreview.textContent = str;
  if (typeof Prism !== 'undefined') Prism.highlightElement(el.xmlPreview);
}

function downloadFromPreview() {
  const str = el.xmlPreview.textContent;
  if (new DOMParser().parseFromString(str, 'application/xml').querySelector('parsererror')) {
    showToast('XML enthält Fehler.', 'error');
    return;
  }
  triggerDownload(URL.createObjectURL(new Blob([str], { type: 'text/xml' })), 'kategorien_preview.xml');
}

function saveDraft() {
  if (!xmlDoc) return;
  localStorage.setItem('ceDraft', new XMLSerializer().serializeToString(xmlDoc));
}

function rebuildSourceDropdown() {
  el.xmlSelect.innerHTML = '';
  xmlSources.forEach(s => {
    const o = document.createElement('option');
    o.value = s.label; o.textContent = s.label;
    el.xmlSelect.appendChild(o);
  });
}

function addNewSource() {
  const label = el.sourceLabelInput.value.trim();
  const url = el.sourceUrlInput.value.trim();
  if (!label || !url) { showToast('Label und URL erforderlich.', 'warning'); return; }
  if (!/^https?:\/\/.+\.xml$/i.test(url)) { showToast('URL muss auf .xml enden.', 'error'); return; }
  xmlSources.push({ label, url });
  saveJsonToLocalStorage('ceXmlSources', xmlSources);
  rebuildSourceDropdown();
  populateSourcesTable();
  el.sourceLabelInput.value = '';
  el.sourceUrlInput.value = '';
  showToast('Quelle hinzugefügt.', 'success');
}

function populateSourcesTable() {
  if (!el.sourcesTableBody) return;
  el.sourcesTableBody.innerHTML = '';

  xmlSources.forEach((src, i) => {
    const tr = document.createElement('tr');

    const labelCell = document.createElement('td');
    labelCell.textContent = src.label;

    const urlCell = document.createElement('td');
    urlCell.className = 'ce-src-url';
    urlCell.textContent = src.url;

    const editCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.className = 'ce-src-edit';
    editButton.type = 'button';
    editButton.textContent = '✏';
    editButton.addEventListener('click', () => {
      const nl = prompt('Label:', xmlSources[i].label);
      const nu = prompt('URL:', xmlSources[i].url);
      if (nl && nu && /^https?:\/\/.+\.xml$/i.test(nu)) {
        xmlSources[i] = { label: nl, url: nu };
        saveJsonToLocalStorage('ceXmlSources', xmlSources);
        rebuildSourceDropdown();
        populateSourcesTable();
        showToast('Aktualisiert.', 'success');
      } else {
        showToast('Ungültige Eingaben.', 'error');
      }
    });
    editCell.appendChild(editButton);

    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-danger ce-src-del';
    deleteButton.type = 'button';
    deleteButton.textContent = '✕';
    deleteButton.addEventListener('click', () => {
      if (confirm(`„${xmlSources[i].label}" löschen?`)) {
        xmlSources.splice(i, 1);
        saveJsonToLocalStorage('ceXmlSources', xmlSources);
        rebuildSourceDropdown();
        populateSourcesTable();
        showToast('Gelöscht.', 'info');
      }
    });
    deleteCell.appendChild(deleteButton);

    tr.append(labelCell, urlCell, editCell, deleteCell);
    el.sourcesTableBody.appendChild(tr);
  });
}

function buildItem(catEl) {
  if (!catEl.getAttribute('id')) catEl.setAttribute('id', uid());

  const li = document.createElement('li');
  li.xmlElement = catEl;
  li.dataset.id = catEl.getAttribute('id');
  li.setAttribute('role', 'treeitem');
  li.setAttribute('aria-selected', 'false');
  li.tabIndex = -1;

  const children = catChildren(catEl);
  const toggle = document.createElement('span');
  toggle.className = children.length ? 'ce-toggle' : 'ce-toggle ce-leaf';
  toggle.textContent = children.length ? '▶' : '•';
  if (children.length) {
    toggle.addEventListener('click', e => { e.stopPropagation(); toggleCollapse(li); });
  }
  li.appendChild(toggle);

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'ce-checkbox';
  cb.addEventListener('change', syncBulkButtons);
  li.appendChild(cb);

  const lbl = document.createElement('span');
  lbl.className = 'ce-label';
  lbl.textContent = buildLabel(catEl);
  lbl.addEventListener('click', e => { e.stopPropagation(); openEditor(catEl); });
  li.appendChild(lbl);

  const schema = catEl.getAttribute('schemaorg');
  if (schema) {
    const badge = document.createElement('span');
    badge.className = 'ce-badge';
    badge.title = schema;
    badge.textContent = schema.startsWith('http') ? schema.split('/').pop() : schema.split(',')[0];
    li.appendChild(badge);
  }

  const ico = document.createElement('span');
  ico.className = 'ce-edit-ico';
  ico.textContent = '✎';
  ico.title = 'Bearbeiten';
  ico.addEventListener('click', e => { e.stopPropagation(); openEditor(catEl); });
  li.appendChild(ico);

  li.addEventListener('dblclick', e => startInlineEdit(e, li, catEl));
  li.addEventListener('contextmenu', e => showContextMenu(e, catEl));
  li.setAttribute('draggable', 'true');
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('dragleave', handleDragLeave);
  li.addEventListener('drop', handleDrop);
  li.addEventListener('dragend', cleanupDrag);

  if (children.length) {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'group');
    children.forEach(c => ul.appendChild(buildItem(c)));

    const isRoot = catEl.parentElement === categoriesNode;
    if (isRoot && children.length > 8) {
      ul.classList.add('ce-collapsed');
    } else {
      toggle.textContent = '▼';
    }
    li.appendChild(ul);
  }

  return li;
}

function rebuildTree() {
  if (!categoriesNode) return;
  el.treeContainer.innerHTML = '';
  const ul = document.createElement('ul');
  ul.setAttribute('role', 'group');
  catChildren(categoriesNode).forEach(c => ul.appendChild(buildItem(c)));
  el.treeContainer.appendChild(ul);
  updateTreeStats();
  updateXmlPreview();
  saveDraft();
  logDebug('Baum aufgebaut');
}

function switchTab(tab) {
  const isTree = tab === 'tree';
  el.viewTree.style.display = isTree ? 'block' : 'none';
  el.viewPreview.style.display = isTree ? 'none' : 'block';
  el.tabTree.classList.toggle('active', isTree);
  el.tabPreview.classList.toggle('active', !isTree);
  if (!isTree) updateXmlPreview();
}

function fetchXml(url) {
  showToast('Lade XML…', 'info');
  fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); })
    .then(txt => loadXmlString(txt, url.split('/').pop()))
    .catch(err => showToast('Ladefehler: ' + err.message, 'error'));
}

function processFile(file) {
  el.fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  const reader = new FileReader();
  reader.onload = e => loadXmlString(e.target.result, file.name);
  reader.readAsText(file, 'UTF-8');
}

function loadXmlString(rawText, label = '') {
  let text = sanitizeXML(rawText.trim());
  const idx = text.indexOf('<Categories');
  if (idx > 0) text = text.substring(idx);

  const parsed = new DOMParser().parseFromString(text, 'application/xml');
  if (parsed.querySelector('parsererror')) {
    showToast('XML-Parse-Fehler. Bitte Datei prüfen.', 'error');
    logDebug('parsererror: ' + parsed.querySelector('parsererror').textContent.slice(0, 300));
    return;
  }

  xmlDoc = parsed;
  categoriesNode = xmlDoc.querySelector('Categories') || xmlDoc.documentElement;
  enableButtons(true);
  rebuildTree();
  if (label) showToast(`„${label}" geladen.`, 'success');
  logDebug(`Geladen: ${label}`);
}

function recordState() {
  if (!xmlDoc) return;
  undoStack.push(new XMLSerializer().serializeToString(xmlDoc));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateHistoryBtns();
  saveDraft();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(new XMLSerializer().serializeToString(xmlDoc));
  restoreXml(undoStack.pop());
  updateHistoryBtns();
  showToast('Rückgängig.', 'info');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(new XMLSerializer().serializeToString(xmlDoc));
  restoreXml(redoStack.pop());
  updateHistoryBtns();
  showToast('Wiederhergestellt.', 'info');
}

function restoreXml(xmlStr) {
  xmlDoc = new DOMParser().parseFromString(xmlStr, 'application/xml');
  categoriesNode = xmlDoc.querySelector('Categories') || xmlDoc.documentElement;
  rebuildTree();
  saveDraft();
}

function updateHistoryBtns() {
  el.undoBtn.disabled = !undoStack.length;
  el.redoBtn.disabled = !redoStack.length;
}

function init() {
  [
    'fileInput', 'importJsonInput', 'importCsvInput', 'fileInfo',
    'treeContainer', 'editorContainer', 'catName', 'catSchemaorg',
    'displayNamesContainer', 'addDisplayNameBtn', 'cancelEditBtn',
    'deleteCatBtn', 'addRootBtn', 'downloadBtn', 'downloadJsonBtn',
    'downloadCsvBtn', 'saveDraftBtn', 'undoBtn', 'redoBtn',
    'bulkEditBtn', 'bulkDeleteBtn', 'loadXmlBtn', 'xmlSelect',
    'attributeFilter', 'searchInput', 'manageSourcesBtn',
    'sourcesModal', 'sourcesTableBody', 'sourceLabelInput',
    'sourceUrlInput', 'tabTree', 'tabPreview', 'viewTree',
    'viewPreview', 'xmlPreview', 'downloadFromPreviewBtn',
    'dropOverlay', 'toastContainer', 'debugLog',
    'expandAllBtn', 'collapseAllBtn', 'treeStats',
    'generateTranslationsBtn', 'editForm',
    'importJsonTrigger', 'importCsvTrigger',
  ].forEach(id => { el[id] = $(id); });

  if (isDebug) el.debugLog.style.display = 'block';

  xmlSources = loadJsonFromLocalStorage('ceXmlSources', [...DEFAULT_SOURCES]);

  rebuildSourceDropdown();
  populateSourcesTable();

  const draft = localStorage.getItem('ceDraft');
  if (draft && confirm('Ungespeicherter Entwurf gefunden – wiederherstellen?')) {
    loadXmlString(draft, '(Entwurf)');
  } else if (draft) {
    localStorage.removeItem('ceDraft');
  }

  el.loadXmlBtn.addEventListener('click', () => {
    const src = xmlSources.find(s => s.label === el.xmlSelect.value);
    if (src) fetchXml(src.url);
    else showToast('Quelle nicht gefunden.', 'error');
  });

  el.fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) processFile(f);
    e.target.value = '';
  });

  el.importJsonTrigger.addEventListener('click', () => el.importJsonInput.click());
  el.importCsvTrigger.addEventListener('click', () => el.importCsvInput.click());
  el.importJsonInput.addEventListener('change', e => { handleJsonImport(e); e.target.value = ''; });
  el.importCsvInput.addEventListener('change', e => { handleCsvImport(e); e.target.value = ''; });

  el.addRootBtn.addEventListener('click', () => { recordState(); addRootCategory(); });
  el.downloadBtn.addEventListener('click', downloadXML);
  el.downloadJsonBtn.addEventListener('click', downloadJSON);
  el.downloadCsvBtn.addEventListener('click', downloadCSV);
  el.saveDraftBtn.addEventListener('click', () => { saveDraft(); showToast('Entwurf gespeichert.', 'success'); });
  el.undoBtn.addEventListener('click', undo);
  el.redoBtn.addEventListener('click', redo);
  el.bulkEditBtn.addEventListener('click', showBulkEditDialog);
  el.bulkDeleteBtn.addEventListener('click', confirmBulkDelete);

  el.searchInput.addEventListener('input', debounce(applyFilter, 220));
  el.attributeFilter.addEventListener('change', applyFilter);

  el.editForm.addEventListener('submit', e => {
    e.preventDefault();
    recordState();
    saveCategoryChanges();
  });
  el.addDisplayNameBtn.addEventListener('click', () => addDisplayNameRow());
  el.generateTranslationsBtn.addEventListener('click', () => generateTranslations());
  el.cancelEditBtn.addEventListener('click', closeEditor);
  el.deleteCatBtn.addEventListener('click', () => {
    if (confirm('Kategorie wirklich löschen?')) { recordState(); deleteCategory(selectedCatEl); }
  });

  el.tabTree.addEventListener('click', () => switchTab('tree'));
  el.tabPreview.addEventListener('click', () => switchTab('preview'));
  el.expandAllBtn.addEventListener('click', () => setAllCollapsed(false));
  el.collapseAllBtn.addEventListener('click', () => setAllCollapsed(true));
  el.downloadFromPreviewBtn.addEventListener('click', downloadFromPreview);

  el.manageSourcesBtn.addEventListener('click', () => { el.sourcesModal.style.display = 'flex'; });
  $('closeSourcesModal').addEventListener('click', () => { el.sourcesModal.style.display = 'none'; });
  $('addSourceBtn').addEventListener('click', addNewSource);

  document.body.addEventListener('click', hideContextMenu);
  document.body.addEventListener('scroll', hideContextMenu, true);
  document.body.addEventListener('dragenter', e => { e.preventDefault(); el.dropOverlay.style.display = 'flex'; });
  document.body.addEventListener('dragover', e => e.preventDefault());
  document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) el.dropOverlay.style.display = 'none'; });
  document.body.addEventListener('drop', handleBodyDrop);
  document.addEventListener('keydown', handleKeydown);

  logDebug('Init OK');
}

export { init };
