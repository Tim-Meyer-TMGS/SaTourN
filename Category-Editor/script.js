// =========================================
// script.js – Kategorie-Editor mit allen gewünschten Features
// =========================================

// ------------------------------
//  Globals & Initialisierung
// ------------------------------
let xmlDoc        = null;   // aktuelles XML-DOM
let categoriesNode = null;  // <Categories>-Node im xmlDoc
let selectedCategoryElement = null; // aktuell geöffnete Kategorie
let undoStack     = [];     // für Undo
let redoStack     = [];     // für Redo
const MAX_HISTORY = 20;     // maximale Schritte in den Stacks
let isDebug       = window.location.search.includes("debug=true");

// Elemente zentral referenzieren:
const elements = {
  // Datei-Upload & Baumauswahl
  fileInput:           document.getElementById('fileInput'),
  importJsonInput:     document.getElementById('importJsonInput'),
  importCsvInput:      document.getElementById('importCsvInput'),
  fileInfo:            document.getElementById('fileInfo'),
  treeContainer:       document.getElementById('treeContainer'),
  editorContainer:     document.getElementById('editorContainer'),
  catNameInput:        document.getElementById('catName'),
  catSchemaorgInput:   document.getElementById('catSchemaorg'),
  displayNamesContainer: document.getElementById('displayNamesContainer'),
  addDisplayNameBtn:   document.getElementById('addDisplayNameBtn'),
  cancelEditBtn:       document.getElementById('cancelEditBtn'),
  deleteCatBtn:        document.getElementById('deleteCatBtn'),
  addRootBtn:          document.getElementById('addRootBtn'),
  downloadBtn:         document.getElementById('downloadBtn'),
  saveCatBtn:          document.getElementById("saveCatBtn"),
  saveDraftBtn:        document.getElementById("saveDraftBtn"),
  undoBtn:             document.getElementById("undoBtn"),
  redoBtn:             document.getElementById("redoBtn"),
  bulkEditBtn:         document.getElementById("bulkEditBtn"),
  bulkDeleteBtn:       document.getElementById("bulkDeleteBtn"),
  loadXmlBtn:          document.getElementById("loadXmlBtn"),
  xmlSelect:           document.getElementById("xmlSelect"),
  attributeFilter:     document.getElementById("attributeFilter"),
  searchInput:         document.getElementById("searchInput"),
  manageSourcesBtn:    document.getElementById("manageSourcesBtn"),
  sourcesModal:        document.getElementById("sourcesModal"),
  sourcesTableBody:    document.getElementById("sourcesTableBody"),
  sourceLabelInput:    document.getElementById("sourceLabelInput"),
  sourceUrlInput:      document.getElementById("sourceUrlInput"),
  tabTree:             document.getElementById("tabTree"),
  tabPreview:          document.getElementById("tabPreview"),
  viewTree:            document.getElementById("viewTree"),
  viewPreview:         document.getElementById("viewPreview"),
  xmlPreview:          document.getElementById("xmlPreview"),
  downloadFromPreviewBtn: document.getElementById("downloadFromPreviewBtn"),
  dropOverlay:         document.getElementById("dropOverlay"),
  toastContainer:      document.getElementById("toastContainer"),
  debugLogContainer:   document.getElementById("debugLog"),
  toggleDebugBtn:      document.getElementById("toggleDebugBtn")
};

// Standard-Quellen (werden ggf. überschrieben durch LocalStorage):
let xmlSources = [
  { label: "Vermieter", url: "http://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml" },
  { label: "Veranstaltung", url: "http://api.et4.de/Schema/eTouristV4/Veranstaltung/sachsen-tourismus-beta/VeranstaltungTree.xml" },
  { label: "Gastro", url: "http://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml" },
  { label: "Tour", url: "http://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml" },
  { label: "Poi", url: "http://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml" },
  { label: "GlobalePauschale", url: "http://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml" }
];

// DeepL-Mapping (unverändert):
const DEEPL_API_KEY = "****_DEIN_BACKEND_PROXY_KEY_****"; 
const requiredLanguages = [
  "de-DE","en-US","en-GB","fr-FR","es-ES","it-IT","pt-PT",
  "nl-NL","pl-PL","ru-RU","zh-CN","ja-JP","ar-SA","ko-KR",
  "sv-SE","da-DK","fi-FI","no-NO","tr-TR","cs-CZ","hu-HU","ro-RO"
];
const deepLMapping = {
  "de-DE":"DE","en-US":"EN-US","en-GB":"EN-GB","fr-FR":"FR",
  "es-ES":"ES","it-IT":"IT","pt-PT":"PT-PT","nl-NL":"NL",
  "pl-PL":"PL","ru-RU":"RU","zh-CN":"ZH","ja-JP":"JA",
  "ar-SA":"AR","ko-KR":"KO","sv-SE":"SV","da-DK":"DA",
  "fi-FI":"FI","no-NO":"NO","tr-TR":"TR","cs-CZ":"CS",
  "hu-HU":"HU","ro-RO":"RO"
};

// Debounce-Funktion (§1.8):
function debounce(fn, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Logging-Funktion (Debug) (§18):
function logDebug(msg) {
  if (!isDebug) return;
  console.log(msg);
  const p = document.createElement("p");
  p.textContent = msg;
  elements.debugLogContainer.appendChild(p);
}

// Utility: Toast anzeigen (§18):
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  // Nach 3 Sek. ausblenden
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Schemaorg-Validierung (§1.5):
function isValidSchemaorg(val) {
  return /^[A-Za-z0-9_:/\-]+$/.test(val);
}

// Menü schließen (Kontextmenü) (§14):
function hideContextMenu() {
  const existing = document.getElementById("customContextMenu");
  if (existing) existing.remove();
}

// Utility: XML-String formatieren (§17):
function formatXml(xml) {
  // Einfache Indentation via RegEx (für Demo ausreichend)
  const formatted = xml.replace(/(>)(<)(\/*)/g, "$1\n$2$3");
  let pad = 0;
  return formatted.split("\n").map(line => {
    let indent = 0;
    if (line.match(/<\/\w/)) pad--;
    if (pad < 0) pad = 0;
    indent = pad;
    if (line.match(/<\w[^>]*[^\/]>.*$/)) pad++;
    return "  ".repeat(indent) + line;
  }).join("\n");
}

// -----------------------------------------
//  INIT-Funktion – wird direkt am Seitenstart ausgeführt
// -----------------------------------------
function init() {
  // 1) Quellen aus localStorage laden (§20):
  const storedSources = localStorage.getItem("externalXmlSources");
  if (storedSources) {
    try {
      xmlSources = JSON.parse(storedSources);
    } catch {
      showToast("Fehler beim Laden der gespeicherten Quellen.", "warning");
    }
  }
  rebuildSourceDropdown();

  // 2) Draft aus localStorage? (§1.6)
  const draftXml = localStorage.getItem("kategorieEditorDraft");
  if (draftXml) {
    if (confirm("Es wurde ein ungespeicherter Entwurf gefunden. Möchten Sie ihn wiederherstellen?")) {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(draftXml, "application/xml");
      if (!parsed.querySelector("parsererror")) {
        xmlDoc = parsed;
        categoriesNode = xmlDoc.querySelector("Categories") || xmlDoc.documentElement;
        rebuildTreeView();
      } else {
        showToast("Gespeicherter Entwurf enthält XML-Fehler.", "error");
      }
    } else {
      localStorage.removeItem("kategorieEditorDraft");
    }
  }

  // 3) Event-Handler binden
  elements.loadXmlBtn.addEventListener("click", () => {
    const sel = elements.xmlSelect.value;
    const source = xmlSources.find(s => s.label === sel);
    if (!source) return showToast("Quelle nicht gefunden.", "error");
    fetchXmlAndInit(source.url);
  });
  elements.fileInput.addEventListener('change', handleFileUpload);
  elements.importJsonInput.addEventListener("change", handleJsonImport);
  elements.importCsvInput.addEventListener("change", handleCsvImport);
  elements.addRootBtn.addEventListener('click', () => { recordState("add"); addRootCategory(); });
  elements.downloadBtn.addEventListener('click', downloadXML);
  elements.saveCatBtn.addEventListener("click", event => { event.preventDefault(); recordState("edit"); saveCategoryChanges(); });
  elements.saveDraftBtn.addEventListener("click", () => { saveDraftToLocalStorage(); showToast("Entwurf gespeichert.", "success"); });
  elements.undoBtn.addEventListener("click", undo);
  elements.redoBtn.addEventListener("click", redo);
  elements.bulkEditBtn.addEventListener("click", showBulkEditDialog);
  elements.bulkDeleteBtn.addEventListener("click", confirmBulkDelete);
  elements.addDisplayNameBtn.addEventListener("click", () => addDisplayNameRow());
  elements.cancelEditBtn.addEventListener("click", () => { closeEditor(); });
  elements.deleteCatBtn.addEventListener("click", () => { recordState("delete"); deleteCategory(selectedCategoryElement); });
  elements.searchInput.addEventListener("input", debounce(filterTree, 200));  // §1.8
  elements.attributeFilter.addEventListener("change", applyAttributeFilter);
  elements.manageSourcesBtn.addEventListener("click", () => elements.sourcesModal.style.display = "block");
  document.getElementById("closeSourcesModal").addEventListener("click", () => elements.sourcesModal.style.display = "none");
  document.getElementById("addSourceBtn").addEventListener("click", addNewXmlSource);
  elements.downloadFromPreviewBtn.addEventListener("click", downloadFromPreview);
  elements.tabTree.addEventListener("click", () => switchTab("tree"));
  elements.tabPreview.addEventListener("click", () => switchTab("preview"));
  // Kontextmenü global Hide:
  document.body.addEventListener("click", hideContextMenu);
  document.body.addEventListener("scroll", hideContextMenu, true);
  // Drag&Drop-Datei-Upload (§19):
  document.body.addEventListener("dragenter", showDropOverlay);
  document.body.addEventListener("dragover", showDropOverlay);
  document.body.addEventListener("dragleave", hideDropOverlay);
  document.body.addEventListener("drop", handleBodyDrop);
  // Toggle Debug-Log (§18):
  if (isDebug) {
    elements.debugLogContainer.style.display = "block";
    elements.toggleDebugBtn.style.display = "inline-block";
    elements.toggleDebugBtn.addEventListener("click", () => {
      if (elements.debugLogContainer.style.display === "none") elements.debugLogContainer.style.display = "block";
      else elements.debugLogContainer.style.display = "none";
    });
  }

  // Tastatur-Listener für globale Shortcuts (§1.7):
  document.addEventListener("keydown", handleGlobalKeydown);

  // Falls wir beim Init bereits xmlDoc haben (z. B. aus Draft), dann bauen wir die Ansicht:
  if (xmlDoc && categoriesNode) {
    rebuildTreeView();
  }

  logDebug("Init abgeschlossen");
}

// -----------------------------------------
//  1. Suche & Filter (§1.1) + Dropdown-Filter (§1.1)
// -----------------------------------------
function filterTree() {
  const query = elements.searchInput.value.trim().toLowerCase();
  traverseAndApplyFilter(categoriesNode, query, elements.attributeFilter.value);
}

function applyAttributeFilter() {
  const query = elements.searchInput.value.trim().toLowerCase();
  traverseAndApplyFilter(categoriesNode, query, elements.attributeFilter.value);
}

function traverseAndApplyFilter(node, textQuery, attrFilter) {
  // Durchläuft rekursiv alle Category-Knoten und wendet Highlight/Dim an.
  if (!node) return;
  const children = Array.from(node.children).filter(ch => ch.tagName === "Category");
  children.forEach(cat => {
    const li = document.querySelector(`[data-id="${cat.getAttribute("id")}"]`);
    if (!li) return;
    // 1) Prüfe Attribut-Filter (z. B. ohne schemaorg, ohne de-DE):
    let attrMatches = true;
    switch (attrFilter) {
      case "ohne-schemaorg":
        if (cat.getAttribute("schemaorg")) attrMatches = false;
        break;
      case "ohne-deDE":
        if ([...cat.getElementsByTagName("DisplayName")]
             .some(dn => dn.getAttribute("xml:lang") === "de-DE")) attrMatches = false;
        break;
      case "root":
        if (cat.parentNode.tagName === "Category") attrMatches = false;
        break;
      case "unterkategorien":
        if (cat.parentNode.tagName !== "Category") attrMatches = false;
        break;
      default:
        attrMatches = true;
    }
    // 2) Prüfe Text-Suche (Name + DisplayNames):
    const nameVal = (cat.getAttribute("Name") || "").toLowerCase();
    const displayVals = Array.from(cat.getElementsByTagName("DisplayName"))
                             .map(dn => dn.textContent.toLowerCase()).join(" ");
    const textMatches = !textQuery || nameVal.includes(textQuery) || displayVals.includes(textQuery);

    if (attrMatches && textMatches) {
      // Treffer → Highlight und Eltern auffalten:
      li.classList.add("highlight");
      li.classList.remove("dimmed");
      expandPathToRoot(cat);
    } else {
      // Kein Treffer → dimmen
      li.classList.remove("highlight");
      li.classList.add("dimmed");
    }
    // Rekursiv für Unterkategorien:
    traverseAndApplyFilter(cat, textQuery, attrFilter);
  });
}

// -----------------------------------------
//  2. Undo/Redo (§2)
// -----------------------------------------
function recordState(actionType) {
  if (!xmlDoc) return;
  // Letzten Zustand serialisieren:
  const prevXml = new XMLSerializer().serializeToString(xmlDoc);
  undoStack.push({ action: actionType, prevState: prevXml });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  // Neuer Eintrag → Redo-Stack leeren:
  redoStack = [];
  updateUndoRedoButtons();
  saveDraftToLocalStorage();
}

function undo() {
  if (!undoStack.length) return;
  // Letzten State: Ziehe vom undoStack:
  const { prevState } = undoStack.pop();
  // Aktuellen State für Redo speichern:
  const currXml = new XMLSerializer().serializeToString(xmlDoc);
  redoStack.push({ nextState: currXml });
  // XML zurücksetzen:
  const parser = new DOMParser();
  xmlDoc = parser.parseFromString(prevState, "application/xml");
  categoriesNode = xmlDoc.querySelector("Categories") || xmlDoc.documentElement;
  rebuildTreeView();
  updateUndoRedoButtons();
  showToast("Rückgängig ausgeführt", "info");
  logDebug("Undo: Zustand wiederhergestellt");
}

function redo() {
  if (!redoStack.length) return;
  const { nextState } = redoStack.pop();
  // Aktuellen State wieder in Undo speichern:
  const currXml = new XMLSerializer().serializeToString(xmlDoc);
  undoStack.push({ action: "redo", prevState: currXml });
  // XML setzen:
  const parser = new DOMParser();
  xmlDoc = parser.parseFromString(nextState, "application/xml");
  categoriesNode = xmlDoc.querySelector("Categories") || xmlDoc.documentElement;
  rebuildTreeView();
  updateUndoRedoButtons();
  showToast("Wiederherstellen ausgeführt", "info");
  logDebug("Redo: Zustand wiederhergestellt");
}

function updateUndoRedoButtons() {
  elements.undoBtn.disabled = undoStack.length === 0;
  elements.redoBtn.disabled = redoStack.length === 0;
}

// -----------------------------------------
//  3. Bulk-Operationen & Mehrfachauswahl (§3)
// -----------------------------------------
function showBulkEditDialog() {
  // Dialog-Inhalt erstellen, wenn noch nicht vorhanden.
  if (!document.getElementById("bulkEditDialog")) {
    const dialog = document.createElement("div");
    dialog.id = "bulkEditDialog";
    dialog.className = "modal";
    dialog.innerHTML = `
      <div class="modal-content">
        <h3>Bulk-Bearbeitung</h3>
        <label>Neuer schemaorg-Wert für alle ausgewählten Kategorien:</label>
        <input type="text" id="bulkSchemaInput" placeholder="Schemaorg…" />
        <button id="confirmBulkEditBtn">Änderung übernehmen</button>
        <button id="cancelBulkEditBtn">Abbrechen</button>
      </div>`;
    document.body.appendChild(dialog);
    document.getElementById("cancelBulkEditBtn")
      .addEventListener("click", () => dialog.remove());
    document.getElementById("confirmBulkEditBtn")
      .addEventListener("click", confirmBulkEdit);
  }
  document.getElementById("bulkEditDialog").style.display = "block";
}

function confirmBulkEdit() {
  const newSchema = document.getElementById("bulkSchemaInput").value.trim();
  if (newSchema && !isValidSchemaorg(newSchema)) {
    showToast("Ungültiger schemaorg-Wert.", "error");
    return;
  }
  // Alle Checkboxen, die ausgewählt sind:
  const checkedLis = Array.from(document.querySelectorAll(".bulk-checkbox:checked"))
                          .map(cb => cb.closest("li"));
  if (!checkedLis.length) {
    showToast("Keine Kategorien ausgewählt.", "warning");
    return;
  }
  // Doppelte Translationen prüfen (§3.2):
  for (let li of checkedLis) {
    const catEl = li.xmlElement;
    const langs = Array.from(catEl.getElementsByTagName("DisplayName"))
                       .map(dn => dn.getAttribute("xml:lang"));
    const duplicates = langs.some((lg,i) => langs.indexOf(lg) !== i);
    if (duplicates) {
      showToast("Doppelte DisplayName-Sprachen in ausgewählten Kategorien gefunden.", "error");
      return;
    }
  }
  // Änderungen durchführen:
  checkedLis.forEach(li => {
    const catEl = li.xmlElement;
    if (newSchema) catEl.setAttribute("schemaorg", newSchema);
  });
  document.getElementById("bulkEditDialog").remove();
  rebuildTreeView();
  recordState("bulkEdit");
  showToast("Bulk-Änderung durchgeführt.", "success");
}

// Bulk-Löschung (§3.3):
function confirmBulkDelete() {
  const checkedLis = Array.from(document.querySelectorAll(".bulk-checkbox:checked"))
                          .map(cb => cb.closest("li"));
  if (!checkedLis.length) {
    showToast("Keine Kategorien ausgewählt.", "warning");
    return;
  }
  if (!confirm(`Möchten Sie wirklich ${checkedLis.length} Kategorien (inkl. Unterkategorien) löschen?`)) {
    return;
  }
  recordState("bulkDelete");
  checkedLis.forEach(li => {
    const catEl = li.xmlElement;
    catEl.parentNode.removeChild(catEl);
  });
  rebuildTreeView();
  showToast("Ausgewählte Kategorien gelöscht.", "info");
}

// -----------------------------------------
//  4. Inline-Bearbeitung & Doppelklick (§4)
// -----------------------------------------
function startInlineEdit(e) {
  e.stopPropagation();
  const li = e.currentTarget;
  const catEl = li.xmlElement;
  // Bereits editierend? Dann return
  if (li.querySelector("input.inline-edit")) return;
  // momentanen Namen holen:
  const oldName = catEl.getAttribute("Name") || "";
  // Ersetze <li>-Inhalt temporär mit <input> + Buttons:
  const input = document.createElement("input");
  input.className = "inline-edit";
  input.type = "text";
  input.value = oldName;
  input.style.width = "70%";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "✓";
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "✕";
  // Leere li, füge neu ein:
  li.textContent = "";
  li.appendChild(input);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  input.focus();
  // Enter → speichern
  input.addEventListener("keydown", ev => {
    if (ev.key === "Enter") saveInlineEdit(li, catEl, input.value.trim());
    if (ev.key === "Escape") cancelInlineEdit(li, catEl, oldName);
  });
  saveBtn.addEventListener("click", () => saveInlineEdit(li, catEl, input.value.trim()));
  cancelBtn.addEventListener("click", () => cancelInlineEdit(li, catEl, oldName));
}

function saveInlineEdit(li, catEl, newName) {
  if (!newName) {
    showToast("Name darf nicht leer sein.", "warning");
    return;
  }
  // Konfliktprüfung (§1.5):
  if (checkNameConflict(catEl, newName)) {
    showToast("Namenskonflikt: Geschwister-Kategorie mit gleichem Name existiert.", "error");
    return;
  }
  // Alles gut → speichern
  catEl.setAttribute("Name", newName);
  rebuildTreeView();
  recordState("inlineEdit");
  hideInlineEdit(li, catEl);
  showToast("Name geändert.", "success");
}

function cancelInlineEdit(li, catEl, oldName) {
  hideInlineEdit(li, catEl);
}

function hideInlineEdit(li, catEl) {
  // Li zurücksetzen auf reinen Text + Checkbox + ggf. Icons
  const nameText = catEl.getAttribute("Name") || "";
  li.textContent = nameText;
  // ggf. DisplayName-Klammer anfügen:
  const dn = [...catEl.getElementsByTagName("DisplayName")].find(d => d.getAttribute("xml:lang")==="de-DE");
  if (dn) li.textContent += ` (${dn.textContent})`;
  // Neu aufbauen:
  li.className = "tree-item";
  li.setAttribute("draggable", "true");
  // Checkbox & Icon & Events neu anhängen:
  attachListItemExtras(li, catEl);
}

function attachListItemExtras(li, catEl) {
  // 1) Checkbox für Bulk (§3):
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "bulk-checkbox";
  cb.addEventListener("change", () => {
    const anyChecked = document.querySelectorAll(".bulk-checkbox:checked").length > 0;
    elements.bulkEditBtn.disabled = !anyChecked;
    elements.bulkDeleteBtn.disabled = !anyChecked;
  });
  li.prepend(cb);
  // 2) Edit-Icon (Stift) (§4):
  const editIcon = document.createElement("span");
  editIcon.className = "edit-icon";
  editIcon.textContent = "✎";
  editIcon.title = "Inline bearbeiten";
  editIcon.addEventListener("click", e => { e.stopPropagation(); startInlineEdit({ currentTarget: li, stopPropagation:()=>{} }); });
  li.appendChild(editIcon);
  // 3) Doppelklick-Handler:
  li.addEventListener("dblclick", startInlineEdit);
  // 4) Kontextmenü-Handler (§14):
  li.addEventListener("contextmenu", handleContextMenu);
  // 5) Drag&Drop (§15):
  li.addEventListener("dragstart", handleDragStart);
  li.addEventListener("dragover", handleDragOver);
  li.addEventListener("dragleave", handleDragLeave);
  li.addEventListener("drop", handleDropOnLi);
  // 6) Keydown (Fokus) (§1.7) – wird über globalen Listener behandelt
}

// -----------------------------------------
//  5. Validierung & Warnsystem (§1.5)
// -----------------------------------------
function checkNameConflict(catEl, newName) {
  const parent = catEl.parentNode;
  if (!parent) return false;
  const siblings = Array.from(parent.children).filter(ch => ch.tagName === "Category" && ch !== catEl);
  if (siblings.some(sib => sib.getAttribute("Name") === newName)) return true;
  return false;
}

// -----------------------------------------
//  6. Persistenz & Automatisches Speichern (§1.6)
// -----------------------------------------
function saveDraftToLocalStorage() {
  if (!xmlDoc) return;
  const xmlString = new XMLSerializer().serializeToString(xmlDoc);
  localStorage.setItem("kategorieEditorDraft", xmlString);
}

function clearDraft() {
  localStorage.removeItem("kategorieEditorDraft");
}

// -----------------------------------------
//  7. Keyboard-Navigation & Accessibility (§1.7)
// -----------------------------------------
function handleGlobalKeydown(e) {
  const focusedLi = document.activeElement.closest("li");
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      moveFocus(focusedLi, "down");
      break;
    case "ArrowUp":
      e.preventDefault();
      moveFocus(focusedLi, "up");
      break;
    case "ArrowRight":
      e.preventDefault();
      moveFocus(focusedLi, "right");
      break;
    case "ArrowLeft":
      e.preventDefault();
      moveFocus(focusedLi, "left");
      break;
    case "Enter":
      if (focusedLi) {
        e.preventDefault();
        const catEl = focusedLi.xmlElement;
        recordState("edit");
        openEditor(catEl);
      }
      break;
    case "Delete":
      if (focusedLi) {
        e.preventDefault();
        if (confirm("Kategorie wirklich löschen?")) {
          recordState("delete");
          deleteCategory(focusedLi.xmlElement);
        }
      }
      break;
    case "z":
      if (e.ctrlKey) {
        e.preventDefault();
        undo();
      }
      break;
    case "y":
      if (e.ctrlKey) {
        e.preventDefault();
        redo();
      }
      break;
    default:
      break;
  }
}

function moveFocus(currentLi, direction) {
  if (!elements.treeContainer || !currentLi) {
    // Falls gar kein li fokussiert → erstes li fokussieren
    const firstLi = elements.treeContainer.querySelector("li");
    if (firstLi) {
      firstLi.tabIndex = 0;
      firstLi.focus();
      firstLi.classList.add("focused");
      setAriaSelected(firstLi);
    }
    return;
  }
  // Entferne Fokus-Klasse & aria-selected von altem:
  currentLi.classList.remove("focused");
  currentLi.setAttribute("aria-selected", "false");

  let nextLi = null;
  switch (direction) {
    case "down":
      // nächstes <li> im DOM, falls vorhanden
      nextLi = currentLi.nextElementSibling 
               || findNextFromParent(currentLi);
      break;
    case "up":
      nextLi = currentLi.previousElementSibling 
               || findPrevFromParent(currentLi);
      break;
    case "right":
      // Falls Kindliste existiert, nimm erstes Kind:
      const childUl = currentLi.querySelector("ul");
      if (childUl) nextLi = childUl.querySelector("li");
      else nextLi = currentLi.nextElementSibling || findNextFromParent(currentLi);
      break;
    case "left":
      // Zum Eltern-li:
      const parentUl = currentLi.parentElement.closest("ul");
      if (parentUl) {
        nextLi = parentUl.closest("li");
      } else {
        nextLi = currentLi.previousElementSibling || null;
      }
      break;
  }
  if (nextLi) {
    nextLi.tabIndex = 0;
    nextLi.focus();
    nextLi.classList.add("focused");
    setAriaSelected(nextLi);
  }
}

function findNextFromParent(li) {
  // Springer vom Geschwister li zum nächsten von dessen Eltern, etc.
  let parentLi = li.parentElement.closest("li");
  while (parentLi && !parentLi.nextElementSibling) {
    parentLi = parentLi.parentElement.closest("li");
  }
  return parentLi ? parentLi.nextElementSibling : null;
}

function findPrevFromParent(li) {
  let parentLi = li.parentElement.closest("li");
  if (parentLi) return parentLi;
  // Falls kein Eltern-li, kein Vorgänger auf gleicher Ebene
  return null;
}

function setAriaSelected(li) {
  document.querySelectorAll("#treeContainer li").forEach(item => {
    item.setAttribute("aria-selected", "false");
  });
  li.setAttribute("aria-selected", "true");
}

// -----------------------------------------
//  8. Performance: rebuildTreeView mit DocumentFragment & Event-Delegation (§1.8)
// -----------------------------------------
function rebuildTreeView() {
  if (!categoriesNode) return;
  elements.treeContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const ul = document.createElement("ul");
  ul.setAttribute("role", "group");
  Array.from(categoriesNode.children).filter(ch => ch.tagName === "Category")
    .forEach(cat => {
      ul.appendChild(buildTreeItem(cat));
    });
  fragment.appendChild(ul);
  elements.treeContainer.appendChild(fragment);
  updateXmlPreview(); // Live-Vorschau (§17)
  saveDraftToLocalStorage(); 
  logDebug("Baum neu aufgebaut");
}

function buildTreeItem(catElement) {
  const li = document.createElement("li");
  const catId = catElement.getAttribute("id") || Math.random().toString(36).substr(2,9);
  if (!catElement.getAttribute("id")) catElement.setAttribute("id", catId);

  li.xmlElement = catElement;
  li.setAttribute("data-id", catId);
  li.setAttribute("role", "treeitem");
  li.tabIndex = -1; // Für Fokussteuerung (§1.7)

  // Textnode: Name + (de-DE DisplayName)
  const nameText = document.createElement("span");
  nameText.className = "node-text";
  nameText.textContent = catElement.getAttribute("Name") || "Kategorie";

  const dnList = Array.from(catElement.getElementsByTagName("DisplayName"));
  const dnDE = dnList.find(dn => dn.getAttribute("xml:lang") === "de-DE");
  if (dnDE) nameText.textContent += ` (${dnDE.textContent})`;

  li.appendChild(nameText);

  // Checkbox + Icon + Inline-Events (§3, §4, §14, §15)
  attachListItemExtras(li, catElement);

  // Event-Delegation für Drag&Drop auf Root-Container:
  elements.treeContainer.addEventListener("drop", handleDropOnContainer);
  elements.treeContainer.addEventListener("dragover", e => e.preventDefault());

  // Unterknoten:
  const childCats = Array.from(catElement.children).filter(ch => ch.tagName === "Category");
  if (childCats.length) {
    const ul = document.createElement("ul");
    ul.setAttribute("role", "group");
    childCats.forEach(sub => {
      ul.appendChild(buildTreeItem(sub));
    });
    li.appendChild(ul);
  }
  return li;
}

// -----------------------------------------
//  9. Erweiterte DeepL-Integration (§1.9)
// -----------------------------------------
async function generateMissingTranslations(catEl = selectedCategoryElement) {
  if (!catEl) {
    showToast("Bitte zuerst eine Kategorie auswählen.", "warning");
    return;
  }
  // Basistext (de-DE):
  const dnElements = Array.from(catEl.getElementsByTagName("DisplayName"));
  const baseDE = dnElements.find(dn => dn.getAttribute("xml:lang") === "de-DE");
  if (!baseDE) {
    showToast("Deutsche Übersetzung (de-DE) erforderlich.", "error");
    return;
  }
  const baseText = baseDE.textContent.trim();
  // Fehlende Sprachen sammeln:
  const existing = dnElements.map(dn => dn.getAttribute("xml:lang"));
  const missingLangs = requiredLanguages.filter(l => !existing.includes(l));
  if (!missingLangs.length) {
    showToast("Alle Übersetzungen bereits vorhanden.", "info");
    return;
  }
  // Zielcodes:
  const targetLangs = missingLangs.map(l => deepLMapping[l]).filter(t => t);
  if (!targetLangs.length) {
    showToast("Keine gültigen Zielsprachen gefunden.", "error");
    return;
  }
  // Fortschritts-Overlay anzeigen:
  const overlay = document.createElement("div");
  overlay.id = "translationOverlay";
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      <p id="translationStatus">Starte Übersetzungen…</p>
      <progress id="translationProgress" max="${targetLangs.length}" value="0"></progress>
      <button id="cancelTranslationBtn">Abbrechen</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("cancelTranslationBtn")
    .addEventListener("click", () => {
      cancelledTranslation = true;
      showToast("Übersetzung abgebrochen.", "warning");
      overlay.remove();
    });

  let cancelledTranslation = false;
  try {
    // DeepL Batch-Anfrage:
    const params = new URLSearchParams();
    params.append("auth_key", DEEPL_API_KEY);
    params.append("text", baseText);
    targetLangs.forEach(t => params.append("target_lang", t));

    const resp = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    if (!resp.ok) throw new Error("DeepL API: " + resp.statusText);
    const data = await resp.json();
    const translations = data.translations || [];
    for (let i = 0; i < translations.length; i++) {
      if (cancelledTranslation) break;
      const translatedText = translations[i].text;
      // Fehlende Sprache:
      const langCode = missingLangs[i];
      addDisplayNameRow(langCode, translatedText);
      document.getElementById("translationStatus").textContent = 
        `Übersetzung ${i+1} von ${translations.length}`;
      document.getElementById("translationProgress").value = i+1;
      await new Promise(res => setTimeout(res, 300)); // kurzer Delay, damit Progress sichtbar wird
    }
    if (!cancelledTranslation) showToast("Übersetzungen erstellt.", "success");
  } catch (err) {
    showToast("Übersetzungsfehler: " + err.message, "error");
  } finally {
    overlay.remove();
    recordState("translate");
  }
}

// -----------------------------------------
// 10. Bulk-Import/Export via JSON/CSV (§1.10)
// -----------------------------------------
// JSON-Export:
function downloadJSON() {
  if (!xmlDoc) return showToast("Keine Kategorien vorhanden.", "warning");
  function categoryToObject(catEl) {
    const obj = {
      id: catEl.getAttribute("id") || "",
      Name: catEl.getAttribute("Name") || "",
      schemaorg: catEl.getAttribute("schemaorg") || "",
      displayNames: {},
      children: []
    };
    Array.from(catEl.getElementsByTagName("DisplayName")).forEach(dn => {
      const lg = dn.getAttribute("xml:lang");
      obj.displayNames[lg] = dn.textContent;
    });
    Array.from(catEl.children).filter(ch => ch.tagName === "Category")
      .forEach(sub => obj.children.push(categoryToObject(sub)));
    return obj;
  }
  const result = { categories: [] };
  Array.from(categoriesNode.children).filter(ch => ch.tagName === "Category")
    .forEach(cat => result.categories.push(categoryToObject(cat)));
  const jsonStr = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "kategorien.json";
  link.click();
}

// CSV-Export (wie zuvor, aber gemeinsamer Name):
function downloadCSV() {
  if (!xmlDoc) return showToast("Keine Kategorien vorhanden.", "warning");
  let rows = [["ID","Name","Schemaorg","DisplayName_de-DE","Eltern-ID"]];
  function traverse(cat, parentId = "") {
    const id = cat.getAttribute("id") || "";
    const name = cat.getAttribute("Name") || "";
    const schema = cat.getAttribute("schemaorg") || "";
    const dn = cat.getElementsByTagName("DisplayName")[0];
    const dnText = dn? dn.textContent : "";
    rows.push([id, name, schema, dnText, parentId]);
    Array.from(cat.children).filter(ch => ch.tagName === "Category")
      .forEach(sub => traverse(sub, id));
  }
  Array.from(categoriesNode.children).filter(ch => ch.tagName === "Category")
    .forEach(cat => traverse(cat));
  let csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(";")).join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "kategorien.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// JSON-Import:
function handleJsonImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith(".json")) {
    showToast("Nur JSON-Dateien erlaubt.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const obj = JSON.parse(evt.target.result);
      if (!obj.categories) throw new Error("Ungültiges JSON-Format.");
      recordState("importJson");
      // Lege neues xmlDoc an:
      xmlDoc = document.implementation.createDocument("", "Categories", null);
      categoriesNode = xmlDoc.documentElement;
      obj.categories.forEach(catObj => {
        const newCat = objectToCategory(catObj, categoriesNode);
        categoriesNode.appendChild(newCat);
      });
      rebuildTreeView();
      showToast("JSON-Import erfolgreich.", "success");
    } catch (err) {
      showToast("JSON-Import-Fehler: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// Hilfsfunktion: aus JS-Objekt → <Category> (§10):
function objectToCategory(obj, parentEl) {
  const cat = xmlDoc.createElement("Category");
  if (obj.id) cat.setAttribute("id", obj.id);
  cat.setAttribute("Name", obj.Name || "");
  cat.setAttribute("schemaorg", obj.schemaorg || "");
  if (obj.displayNames) {
    Object.entries(obj.displayNames).forEach(([lg, text]) => {
      const dn = xmlDoc.createElement("DisplayName");
      dn.setAttribute("xml:lang", lg);
      dn.textContent = text;
      cat.appendChild(dn);
    });
  }
  if (obj.children && obj.children.length) {
    obj.children.forEach(subObj => {
      const subCat = objectToCategory(subObj, cat);
      cat.appendChild(subCat);
    });
  }
  return cat;
}

// CSV-Import:
function handleCsvImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith(".csv")) {
    showToast("Nur CSV-Dateien erlaubt.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = evt => {
    const lines = evt.target.result.split(/\r?\n/).filter(l => l.trim());
    const rows = lines.map(l => l.split(";"));
    if (rows.length < 2 || rows[0].length < 5) {
      return showToast("Ungültiges CSV-Format.", "error");
    }
    recordState("importCsv");
    // Erstelle Map id→Element:
    const catMap = {};
    // 1. Zeile ist Header:
    for (let i = 1; i < rows.length; i++) {
      const [id, name, schema, dn, parentId] = rows[i];
      if (!id) continue;
      const cat = xmlDoc.createElement("Category");
      cat.setAttribute("id", id);
      cat.setAttribute("Name", name);
      if (schema) cat.setAttribute("schemaorg", schema);
      if (dn) {
        const dnEl = xmlDoc.createElement("DisplayName");
        dnEl.setAttribute("xml:lang", "de-DE");
        dnEl.textContent = dn;
        cat.appendChild(dnEl);
      }
      catMap[id] = { element: cat, parentId: parentId };
    }
    // 2. Parent-Beziehung herstellen:
    xmlDoc = document.implementation.createDocument("", "Categories", null);
    categoriesNode = xmlDoc.documentElement;
    Object.values(catMap).forEach(({ element, parentId }) => {
      if (parentId && catMap[parentId]) {
        catMap[parentId].element.appendChild(element);
      } else {
        categoriesNode.appendChild(element);
      }
    });
    rebuildTreeView();
    showToast("CSV-Import erfolgreich.", "success");
  };
  reader.readAsText(file);
}

// -----------------------------------------
// 13. Automatische Baum-Auffaltung & Kontext-Merker (§13)
// -----------------------------------------
function expandPathToRoot(catEl) {
  let current = catEl;
  while (current && current.tagName === "Category") {
    const li = document.querySelector(`[data-id="${current.getAttribute("id")}"]`);
    if (!li) break;
    // Li war bereits in DOM – klappe seine Eltern-ul auf:
    const parentUl = li.parentElement;
    if (parentUl && parentUl.tagName === "UL") parentUl.style.display = "block";
    // Markiere Path:
    li.classList.add("path-highlight");
    current = current.parentElement.closest("Category");
  }
}

function clearPathHighlight() {
  document.querySelectorAll(".path-highlight").forEach(li => li.classList.remove("path-highlight"));
}

// -----------------------------------------
// 14. Kontextmenü (§14)
// -----------------------------------------
function handleContextMenu(e) {
  e.preventDefault();
  hideContextMenu();
  const li = e.target.closest("li");
  if (!li) return;
  const catEl = li.xmlElement;
  const menu = document.createElement("div");
  menu.id = "customContextMenu";
  menu.className = "context-menu";
  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <div class="context-item" data-action="edit" role="menuitem">Bearbeiten</div>
    <div class="context-item" data-action="delete" role="menuitem">Löschen</div>
    <div class="context-item" data-action="addSub" role="menuitem">Unterkategorie anlegen</div>
    <div class="context-item" data-action="moveRoot" role="menuitem">Nach Root verschieben</div>
    <div class="context-item" data-action="exportCsv" role="menuitem">Teilbaum als CSV exportieren</div>
    <div class="context-item" data-action="translate" role="menuitem">DeepL-Übersetzungen</div>`;
  document.body.appendChild(menu);

  // Event-Listener für Menübefehle:
  menu.querySelectorAll(".context-item").forEach(item => {
    item.addEventListener("click", () => {
      const act = item.getAttribute("data-action");
      switch (act) {
        case "edit":
          recordState("edit");
          openEditor(catEl);
          break;
        case "delete":
          if (confirm("Kategorie wirklich löschen?")) {
            recordState("delete");
            deleteCategory(catEl);
          }
          break;
        case "addSub":
          recordState("add");
          const newCat = createEmptyCategory();
          newCat.setAttribute("Name", "Neue Kategorie");
          newCat.getElementsByTagName("DisplayName")[0].textContent = "Neue Kategorie";
          catEl.appendChild(newCat);
          rebuildTreeView();
          openEditor(newCat);
          break;
        case "moveRoot":
          recordState("move");
          catEl.parentNode.removeChild(catEl);
          categoriesNode.appendChild(catEl);
          rebuildTreeView();
          break;
        case "exportCsv":
          exportSubtreeCsv(catEl);
          break;
        case "translate":
          generateMissingTranslations(catEl);
          break;
      }
      hideContextMenu();
    });
  });

  // Keyboard-Shortcuts im Menü (§14):
  menu.addEventListener("keydown", me => {
    const key = me.key.toLowerCase();
    if (key === "b") { // Bearbeiten
      recordState("edit");
      openEditor(catEl);
      hideContextMenu();
    }
    if (key === "l") { // Löschen
      if (confirm("Kategorie wirklich löschen?")) {
        recordState("delete");
        deleteCategory(catEl);
      }
      hideContextMenu();
    }
    if (key === "u") { // Unterkategorie
      recordState("add");
      const newC = createEmptyCategory();
      newC.setAttribute("Name", "Neue Kategorie");
      newC.getElementsByTagName("DisplayName")[0].textContent = "Neue Kategorie";
      catEl.appendChild(newC);
      rebuildTreeView();
      openEditor(newC);
      hideContextMenu();
    }
    if (key === "r") { // Nach Root verschieben
      recordState("move");
      catEl.parentNode.removeChild(catEl);
      categoriesNode.appendChild(catEl);
      rebuildTreeView();
      hideContextMenu();
    }
    if (key === "c") { // CSV
      exportSubtreeCsv(catEl);
      hideContextMenu();
    }
    if (key === "t") { // Translate
      generateMissingTranslations(catEl);
      hideContextMenu();
    }
    if (me.key === "Escape") {
      hideContextMenu();
    }
  });
  menu.focus();
}

// -----------------------------------------
// 15. Erweiterte Drag&Drop-Visualisierung (§1.15)
// -----------------------------------------
// Globals für Ghost-Element:
let ghostElement = null;

function handleDragStart(e) {
  const li = e.currentTarget;
  draggedElement = li;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "");

  // Ghost-Layer erzeugen:
  ghostElement = document.createElement("div");
  ghostElement.className = "ghost";
  ghostElement.textContent = li.xmlElement.getAttribute("Name");
  ghostElement.style.position = "fixed";
  ghostElement.style.pointerEvents = "none";
  ghostElement.style.opacity = "0.6";
  document.body.appendChild(ghostElement);
}

function handleDragOver(e) {
  e.preventDefault();
  const li = e.currentTarget;
  const rect = li.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;

  li.classList.add("dragover");
  // Entferne vorherige Icons:
  li.querySelectorAll(".insert-icon").forEach(ic => ic.remove());
  // Je nach Bereich ein Icon hinzufügen:
  let icon;
  if (offsetY < rect.height / 3) {
    icon = document.createElement("span");
    icon.className = "insert-icon up-arrow";
    icon.textContent = "▲";
    li.appendChild(icon);
  } else if (offsetY > (2*rect.height)/3) {
    icon = document.createElement("span");
    icon.className = "insert-icon down-arrow";
    icon.textContent = "▼";
    li.appendChild(icon);
  } else {
    icon = document.createElement("span");
    icon.className = "insert-icon plus-icon";
    icon.textContent = "＋";
    li.appendChild(icon);
  }
  // Ghost-Position aktualisieren:
  if (ghostElement) {
    ghostElement.style.left = `${e.clientX + 10}px`;
    ghostElement.style.top  = `${e.clientY + 10}px`;
  }
  // Auto-Scroll (§1.15):
  const containerRect = elements.treeContainer.getBoundingClientRect();
  if (e.clientY < containerRect.top + 20) {
    elements.treeContainer.scrollTop -= 10;
  } else if (e.clientY > containerRect.bottom - 20) {
    elements.treeContainer.scrollTop += 10;
  }
}

function handleDragLeave(e) {
  const li = e.currentTarget;
  li.classList.remove("dragover");
  li.querySelectorAll(".insert-icon").forEach(ic => ic.remove());
  if (ghostElement) ghostElement.remove();
}

function handleDropOnLi(e) {
  e.preventDefault();
  const li = e.currentTarget;
  li.classList.remove("dragover");
  li.querySelectorAll(".insert-icon").forEach(ic => ic.remove());
  if (ghostElement) ghostElement.remove();

  if (!draggedElement || draggedElement === li) return;
  const xmlToMove = draggedElement.xmlElement;
  const oldParent = xmlToMove.parentNode;
  const rect = li.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;

  if (offsetY < rect.height / 3) {
    // Vorher einfügen (§15)
    if (oldParent) oldParent.removeChild(xmlToMove);
    li.xmlElement.parentNode.insertBefore(xmlToMove, li.xmlElement);
  } else if (offsetY > (2*rect.height)/3) {
    // Nachher einfügen (§15)
    if (oldParent) oldParent.removeChild(xmlToMove);
    li.xmlElement.parentNode.insertBefore(xmlToMove, li.xmlElement.nextSibling);
  } else {
    // Als Unterkategorie (§15)
    if (oldParent) oldParent.removeChild(xmlToMove);
    li.xmlElement.appendChild(xmlToMove);
  }
  rebuildTreeView();
  recordState("move");
}

// Root-Container Drop (in Root aufnehmen):
function handleDropOnContainer(e) {
  e.preventDefault();
  if (!draggedElement) return;
  const xmlToMove = draggedElement.xmlElement;
  const oldParent = xmlToMove.parentNode;
  if (oldParent) oldParent.removeChild(xmlToMove);
  categoriesNode.appendChild(xmlToMove);
  rebuildTreeView();
  recordState("move");
}

// -----------------------------------------
// 17. Visuelle XML-Vorschau (§17)
// -----------------------------------------
function updateXmlPreview() {
  if (!xmlDoc) return;
  const serializer = new XMLSerializer();
  let xmlStr = serializer.serializeToString(xmlDoc).replace(/<\?xml.*?\?>\s*/g, "");
  xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(xmlStr);
  elements.xmlPreview.textContent = xmlStr;
  Prism.highlightElement(elements.xmlPreview); // PrismJS muss eingebunden sein
}

function downloadFromPreview() {
  const xmlStr = elements.xmlPreview.textContent;
  // Well-Formedness prüfen (§1.5)
  const parsed = new DOMParser().parseFromString(xmlStr, "application/xml");
  if (parsed.querySelector("parsererror")) {
    showToast("XML enthält Fehler und kann nicht heruntergeladen werden.", "error");
    return;
  }
  const blob = new Blob([xmlStr], { type: "text/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "kategorien_preview.xml";
  link.click();
}

// -----------------------------------------
// 18. Verbesserte Fehlerrückmeldung & Logging (§18)
// -----------------------------------------
// Bereits durch showToast und logDebug abgedeckt.

// -----------------------------------------
// 19. Drag&Drop von Dateien für “XML laden” (§19)
// -----------------------------------------
function showDropOverlay(e) {
  e.preventDefault();
  elements.dropOverlay.style.display = "block";
}

function hideDropOverlay() {
  elements.dropOverlay.style.display = "none";
}

function handleBodyDrop(e) {
  e.preventDefault();
  hideDropOverlay();
  const files = e.dataTransfer.files;
  if (!files || !files[0]) return;
  const file = files[0];
  if (!file.type.includes("xml") && !file.name.endsWith(".xml")) {
    showToast("Nur XML-Dateien erlaubt.", "error");
    return;
  }
  recordState("upload");
  handleFileUploadEvent(file);
  showToast("Datei erfolgreich geladen.", "success");
}

function handleFileUploadEvent(file) {
  // Gleich wie handleFileUpload, aber mit einem Dateiobjekt:
  elements.fileInfo.textContent = `Dateiname: ${file.name} (${Math.round(file.size/1024)} KB)`;
  const reader = new FileReader();
  reader.onload = evt => {
    let text = evt.target.result.trim();
    const idx = text.indexOf("<Categories>");
    text = idx !== -1 ? text.substring(idx) : text;
    if (!text.endsWith("</Categories>")) text += "\n</Categories>";
    text = sanitizeXMLString(text);
    const parsed = new DOMParser().parseFromString(text, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) {
      showToast("Die XML-Datei konnte nicht geparst werden.", "error");
      return;
    }
    xmlDoc = parsed;
    categoriesNode = xmlDoc.querySelector("Categories") || xmlDoc.documentElement;
    elements.addRootBtn.disabled = false;
    elements.downloadBtn.disabled = false;
    rebuildTreeView();
  };
  reader.readAsText(file);
}

// -----------------------------------------
// 20. Konfiguration externer XML-Quellen (§20)
// -----------------------------------------
function rebuildSourceDropdown() {
  elements.xmlSelect.innerHTML = "";
  xmlSources.forEach(src => {
    const opt = document.createElement("option");
    opt.value = src.label;
    opt.textContent = src.label;
    elements.xmlSelect.appendChild(opt);
  });
}

function addNewXmlSource() {
  const label = elements.sourceLabelInput.value.trim();
  const url   = elements.sourceUrlInput.value.trim();
  if (!label || !url) {
    showToast("Label und URL erforderlich.", "warning");
    return;
  }
  if (!/^https?:\/\/.+\.xml$/.test(url)) {
    showToast("Ungültige XML-URL.", "error");
    return;
  }
  xmlSources.push({ label, url });
  localStorage.setItem("externalXmlSources", JSON.stringify(xmlSources));
  rebuildSourceDropdown();
  elements.sourceLabelInput.value = "";
  elements.sourceUrlInput.value   = "";
  showToast("Quelle hinzugefügt.", "success");
  populateSourcesTable();
}

function populateSourcesTable() {
  elements.sourcesTableBody.innerHTML = "";
  xmlSources.forEach((src, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${src.label}</td>
      <td>${src.url}</td>
      <td><button data-idx="${idx}" class="editSourceBtn">Bearbeiten</button></td>
      <td><button data-idx="${idx}" class="deleteSourceBtn">Löschen</button></td>`;
    elements.sourcesTableBody.appendChild(tr);
  });
  // Event-Listener pro Button:
  document.querySelectorAll(".editSourceBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-idx"), 10);
      const newLabel = prompt("Neues Label:", xmlSources[i].label);
      const newUrl   = prompt("Neue URL:", xmlSources[i].url);
      if (newLabel && newUrl && /^https?:\/\/.+\.xml$/.test(newUrl)) {
        xmlSources[i].label = newLabel;
        xmlSources[i].url   = newUrl;
        localStorage.setItem("externalXmlSources", JSON.stringify(xmlSources));
        rebuildSourceDropdown();
        populateSourcesTable();
        showToast("Quelle aktualisiert.", "success");
      } else {
        showToast("Ungültige Eingaben.", "error");
      }
    });
  });
  document.querySelectorAll(".deleteSourceBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-idx"), 10);
      if (confirm(`Quelle '${xmlSources[i].label}' löschen?`)) {
        xmlSources.splice(i, 1);
        localStorage.setItem("externalXmlSources", JSON.stringify(xmlSources));
        rebuildSourceDropdown();
        populateSourcesTable();
        showToast("Quelle gelöscht.", "info");
      }
    });
  });
}

// -----------------------------------------
//  Datei-Upload & Laden, wie gehabt
// -----------------------------------------
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  handleFileUploadEvent(file);
}

function fetchXmlAndInit(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Fehler beim Laden der XML-Datei: ${response.statusText}`);
      return response.text();
    })
    .then(xmlText => {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) throw new Error(`Fehler beim Parsen: ${parserError.textContent}`);
      categoriesNode = xmlDoc.querySelector("Categories") || xmlDoc.documentElement;
      elements.addRootBtn.disabled = false;
      elements.downloadBtn.disabled = false;
      rebuildTreeView();
    })
    .catch(error => {
      console.error(error);
      showToast("Laden fehlgeschlagen: " + error.message, "error");
    });
}

// -----------------------------------------
//  Funktionen zur Kategoriemodifikation
// -----------------------------------------
function addRootCategory() {
  if (!categoriesNode) return;
  const newCat = createEmptyCategory();
  let baseName = "Neue Kategorie", newName = baseName, count = 1;
  while ([...categoriesNode.children].some(ch => ch.getAttribute("Name") === newName)) {
    newName = `${baseName} ${count++}`;
  }
  newCat.setAttribute("Name", newName);
  const dn = newCat.getElementsByTagName("DisplayName")[0];
  if (dn) dn.textContent = newName;
  categoriesNode.appendChild(newCat);
  rebuildTreeView();
  openEditor(newCat);
}

function createEmptyCategory() {
  if (!xmlDoc) {
    xmlDoc = document.implementation.createDocument(null, "Categories", null);
    categoriesNode = xmlDoc.documentElement;
  }
  const newCat = xmlDoc.createElement("Category");
  const newId = Math.random().toString(36).substr(2, 9);
  newCat.setAttribute("id", newId);
  newCat.setAttribute("Name", "Neue Kategorie");
  newCat.setAttribute("schemaorg", "");
  const dn = xmlDoc.createElement("DisplayName");
  dn.setAttribute("xml:lang", "de-DE");
  dn.textContent = "Neue Kategorie";
  newCat.appendChild(dn);
  return newCat;
}

function rebuildTreeView() {
  if (!categoriesNode) return;
  elements.treeContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const ul = document.createElement("ul");
  ul.setAttribute("role", "group");
  Array.from(categoriesNode.children).filter(ch => ch.tagName === "Category")
    .forEach(cat => {
      ul.appendChild(buildTreeItem(cat));
    });
  fragment.appendChild(ul);
  elements.treeContainer.appendChild(fragment);
  updateXmlPreview();
  saveDraftToLocalStorage();
}

function buildTreeItem(catElement) {
  const li = document.createElement("li");
  const catId = catElement.getAttribute("id") || Math.random().toString(36).substr(2, 9);
  if (!catElement.getAttribute("id")) catElement.setAttribute("id", catId);

  li.xmlElement = catElement;
  li.setAttribute("data-id", catId);
  li.setAttribute("role", "treeitem");
  li.tabIndex = -1;

  const nameText = document.createElement("span");
  nameText.className = "node-text";
  nameText.textContent = catElement.getAttribute("Name") || "Kategorie";
  const dnDE = Array.from(catElement.getElementsByTagName("DisplayName"))
                    .find(dn => dn.getAttribute("xml:lang") === "de-DE");
  if (dnDE) nameText.textContent += ` (${dnDE.textContent})`;

  li.appendChild(nameText);
  attachListItemExtras(li, catElement);

  const childCats = Array.from(catElement.children).filter(ch => ch.tagName === "Category");
  if (childCats.length) {
    const ul = document.createElement("ul");
    ul.setAttribute("role", "group");
    childCats.forEach(sub => {
      ul.appendChild(buildTreeItem(sub));
    });
    li.appendChild(ul);
  }
  return li;
}

function openEditor(catElement) {
  clearPathHighlight();
  selectedCategoryElement = catElement;
  // li markieren:
  document.querySelectorAll("#treeContainer li").forEach(item => {
    item.classList.remove("selected");
    item.classList.remove("focused");
    item.setAttribute("aria-selected", "false");
  });
  const li = document.querySelector(`[data-id="${catElement.getAttribute("id")}"]`);
  if (li) {
    li.classList.add("selected");
    li.classList.add("focused");
    li.setAttribute("aria-selected", "true");
    li.focus();
  }
  // Editor mit Werten füllen:
  elements.catNameInput.value = catElement.getAttribute("Name") || "";
  elements.catSchemaorgInput.value = catElement.getAttribute("schemaorg") || "";
  elements.displayNamesContainer.innerHTML = "";
  Array.from(catElement.getElementsByTagName("DisplayName"))
    .forEach(dn => addDisplayNameRow(dn.getAttribute("xml:lang"), escapeXML(dn.textContent)));
  elements.editorContainer.style.display = "block";
}

function closeEditor() {
  elements.editorContainer.style.display = "none";
  selectedCategoryElement = null;
  clearPathHighlight();
}

function addDisplayNameRow(lang = "", text = "") {
  const div = document.createElement("div");
  div.className = "displayname-row";
  const langInput = document.createElement("input");
  langInput.type = "text";
  langInput.placeholder = "Language (z.B. de-DE)";
  langInput.value = lang;
  langInput.className = "lang-input";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Übersetzung";
  textInput.value = text;
  textInput.className = "translation-input";
  textInput.addEventListener("input", () => {
    textInput.value = sanitizeXMLString(textInput.value);
  });

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "X";
  removeBtn.className = "btn";
  removeBtn.style.background = "#dc3545";
  removeBtn.style.marginLeft = "5px";
  removeBtn.addEventListener("click", () => div.remove());

  div.append(langInput, textInput, removeBtn);
  elements.displayNamesContainer.appendChild(div);
}

function escapeXML(text) {
  return text.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;")
             .replace(/</g, "&lt;").replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function saveCategoryChanges() {
  if (!selectedCategoryElement) return;
  const newName = elements.catNameInput.value.trim();
  const schemaVal = elements.catSchemaorgInput.value.trim();
  if (!newName) {
    showToast("Name darf nicht leer sein.", "warning");
    return;
  }
  // Name-Konflikt (§1.5):
  if (checkNameConflict(selectedCategoryElement, newName)) {
    showToast("Namenskonflikt: Geschwister-Kategorie existiert bereits.", "error");
    return;
  }
  // schemaorg validieren (§1.5):
  if (schemaVal && !isValidSchemaorg(schemaVal)) {
    showToast("Ungültiger schemaorg-Wert.", "error");
    return;
  }
  // Doppelte DisplayName-Sprachen (§1.5):
  const duplicateLang = hasDuplicateTranslations();
  if (duplicateLang) {
    showToast(`Doppelte Übersetzung für ${duplicateLang}`, "error");
    return;
  }
  // Wenn de-DE fehlt und Übersetzung gewünscht ist:
  if (!Array.from(selectedCategoryElement.getElementsByTagName("DisplayName"))
             .some(dn => dn.getAttribute("xml:lang") === "de-DE")) {
    showToast("Warnung: Keine de-DE-Übersetzung vorhanden.", "warning");
  }
  selectedCategoryElement.setAttribute("Name", newName);
  selectedCategoryElement.setAttribute("schemaorg", schemaVal);

  // Alte DisplayNames entfernen:
  while (selectedCategoryElement.firstChild) {
    selectedCategoryElement.removeChild(selectedCategoryElement.firstChild);
  }
  // Neue DisplayNames anlegen:
  const displayRows = elements.displayNamesContainer.getElementsByClassName("displayname-row");
  for (let row of displayRows) {
    const lang = row.querySelector(".lang-input").value.trim();
    const disp = row.querySelector(".translation-input").value.trim();
    if (lang && disp) {
      const dn = xmlDoc.createElement("DisplayName");
      dn.setAttribute("xml:lang", lang);
      dn.textContent = disp;
      selectedCategoryElement.appendChild(dn);
    }
  }
  rebuildTreeView();
  closeEditor();
  saveDraftToLocalStorage();
}

function hasDuplicateTranslations() {
  const langs = Array.from(elements.displayNamesContainer.getElementsByClassName("lang-input"))
                     .map(inp => inp.value.trim())
                     .filter(l => l);
  return langs.find((l, i) => langs.indexOf(l) !== i) || null;
}

function deleteCategory(catEl = selectedCategoryElement) {
  if (!catEl) return;
  catEl.parentNode.removeChild(catEl);
  closeEditor();
  rebuildTreeView();
  saveDraftToLocalStorage();
}

// -----------------------------------------
//  5. Well-Formedness & Download (§1.5, Kapitel XML-Download)
// -----------------------------------------
function downloadXML() {
  if (!xmlDoc) return;
  Array.from(xmlDoc.getElementsByTagName("Category")).forEach(cat => cat.removeAttribute("id"));
  const serializer = new XMLSerializer();
  let xmlStr = serializer.serializeToString(xmlDoc).replace(/<\?xml.*?\?>\s*/g, "");
  xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlStr;
  // Well-formedness prüfen:
  const parsed = new DOMParser().parseFromString(xmlStr, "application/xml");
  if (parsed.querySelector("parsererror")) {
    showToast("XML enthält Fehler. Download abgebrochen.", "error");
    return;
  }
  const blob = new Blob([xmlStr], { type: "text/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "neueKategorien.xml";
  link.click();
}

// -----------------------------------------
//  Klick auf Subtree-CSV exportieren (§14)
// -----------------------------------------
function exportSubtreeCsv(catEl) {
  // Ähnlich wie downloadCSV, aber nur für diesen Teilbaum:
  let rows = [["ID","Name","Schemaorg","DisplayName_de-DE","Eltern-ID"]];
  function traverse(cat, parentId = "") {
    const id = cat.getAttribute("id") || "";
    const name = cat.getAttribute("Name") || "";
    const schema = cat.getAttribute("schemaorg") || "";
    const dn = cat.getElementsByTagName("DisplayName")[0];
    const dnText = dn ? dn.textContent : "";
    rows.push([id, name, schema, dnText, parentId]);
    Array.from(cat.children).filter(ch => ch.tagName === "Category")
      .forEach(sub => traverse(sub, id));
  }
  traverse(catEl, catEl.parentNode === categoriesNode ? "" : catEl.parentNode.getAttribute("id") || "");
  let csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(";")).join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `subtree_${catEl.getAttribute("id")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -----------------------------------------
//  19. Variante: Dateien ziehen (bereits umgesetzt weiter oben)
// -----------------------------------------
// -> handleBodyDrop, showDropOverlay, hideDropOverlay

// -----------------------------------------
//  20. Quelle verwalten (§20)
// -----------------------------------------
populateSourcesTable();

// -----------------------------------------
//  XML-Well-Formedness-Check helper (§1.5)
// -----------------------------------------
function isWellFormedXml(xmlStr) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(xmlStr, "application/xml");
  return !parsed.querySelector("parsererror");
}

// -----------------------------------------
//  Initialize on page load
// -----------------------------------------
window.addEventListener("DOMContentLoaded", init);

