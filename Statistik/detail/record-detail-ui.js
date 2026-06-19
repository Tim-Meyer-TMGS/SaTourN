function wireDetailNavButton(button, target, currentKey, buildRecordDetailUrl) {
  if (!button) return;
  button.disabled = !target || !(target.globalId || target.id) || (target.globalId || target.id) === currentKey;
  button.onclick = null;
  if (!button.disabled) {
    button.onclick = () => {
      location.href = target.detailUrl || buildRecordDetailUrl(target);
    };
  }
}

function renderKvRows(rows, escapeHtml, allowHtml = false) {
  return rows.map(([key, value]) => `
    <dt>${escapeHtml(key)}</dt>
    <dd>${allowHtml ? value : escapeHtml(value)}</dd>
  `).join('');
}

function renderDetailCriteriaSection(title, criteria, note, escapeHtml, criterionStatusClass, getCriterionDisplayStatus) {
  if (!Array.isArray(criteria) || !criteria.length) return '';
  return `
    <section class="detail-criteria-section">
      <header class="detail-criteria-head">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(note)}</p>
      </header>
      <div class="detail-criteria-group">
        ${criteria.map((criterion) => `
          <span class="criteria-chip ${criterionStatusClass(criterion.status)}">
            <strong>${escapeHtml(criterion.label)}</strong>
            <small>${escapeHtml(getCriterionDisplayStatus(criterion.status))}</small>
          </span>
        `).join('')}
      </div>
    </section>
  `;
}

function renderDetailContext(els, model) {
  if (!els.detailBreadcrumb) return;

  if (model.context.source === 'task' && model.context.label) {
    els.detailBreadcrumb.innerHTML = `
      <a href="tasks.html">Pflegeaufgaben</a>
      <span class="material-icons" aria-hidden="true">chevron_right</span>
      <a href="records.html">${model.context.label}</a>
      <span class="material-icons" aria-hidden="true">chevron_right</span>
      <span>Datensatz-Detail</span>
    `;
    if (els.detailContextNote) {
      els.detailContextNote.textContent = `Aus Pflegeaufgabe: ${model.context.label}`;
      els.detailContextNote.hidden = false;
    }
    return;
  }

  els.detailBreadcrumb.innerHTML = `
    <a href="records.html">Datensätze</a>
    <span class="material-icons" aria-hidden="true">chevron_right</span>
    <span>Datensatz-Detail</span>
  `;
  if (els.detailContextNote) els.detailContextNote.hidden = true;
}

function renderDetailNavigation(els, model, loadRecordListState, buildRecordDetailUrl) {
  const listState = loadRecordListState();
  const currentKey = model.identity.globalId || model.identity.id;
  const currentIndex = listState.rows.findIndex((row) => (
    (model.identity.globalId && row.globalId === model.identity.globalId) ||
    (model.identity.id && row.id === model.identity.id)
  ));

  if (els.detailBackLink) els.detailBackLink.href = listState.backUrl || 'records.html';

  const previous = currentIndex > 0 ? listState.rows[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < listState.rows.length - 1 ? listState.rows[currentIndex + 1] : null;
  wireDetailNavButton(els.detailPrevRecord, previous, currentKey, buildRecordDetailUrl);
  wireDetailNavButton(els.detailNextRecord, next, currentKey, buildRecordDetailUrl);
}

function renderDetailIssues(els, model, escapeHtml) {
  if (!model.issues.length) {
    els.detailIssuesList.innerHTML = '<p class="empty-note">Keine priorisierten Baustellen gefunden.</p>';
    return;
  }

  els.detailIssuesList.innerHTML = model.issues.map((criterion) => `
    <div class="detail-issue-row">
      <span class="impact-dot ${criterion.priority === 'hoch' ? 'critical' : 'review'}"></span>
      <span><strong>${escapeHtml(criterion.label)}</strong><small>${escapeHtml(criterion.recommendation)}</small></span>
      <span class="status-badge ${criterion.priority === 'hoch' ? 'critical' : 'medium'}">${criterion.priority === 'hoch' ? 'hoch' : 'mittel'}</span>
    </div>
  `).join('');
}

function renderDetailUsability(els, model, escapeHtml) {
  els.detailUsability.innerHTML = model.usability.map((entry) => `
    <div><span>${escapeHtml(entry.label)}</span><strong class="${entry.ok ? 'ok' : entry.relevant === false ? 'muted' : 'bad'}">${escapeHtml(entry.value)}</strong></div>
  `).join('');

  els.detailTaxonomy.innerHTML = renderKvRows([
    ['Kategorie', model.identity.category || 'Nicht angegeben'],
    ['Gebiet', model.identity.region || 'Nicht angegeben'],
    ['Ort', model.identity.city || 'Nicht angegeben']
  ], escapeHtml);
}

function renderDetailTextCards(els, model, escapeHtml) {
  els.detailDescription.innerHTML = `<p>${escapeHtml(model.texts.description || 'Keine Beschreibung vorhanden.')}</p>${model.texts.teaser ? `<p class="data-note">${escapeHtml(model.texts.teaser)}</p>` : ''}`;
  els.detailOpenings.innerHTML = `<p>${escapeHtml(model.texts.openings)}</p>`;
  els.detailTransport.innerHTML = `<p>${escapeHtml(model.texts.directions)}</p>`;

  if (els.detailPriceCard && els.detailPrice) {
    const prices = [model.texts.price, model.texts.priceReduced].filter(Boolean);
    els.detailPriceCard.hidden = !prices.length;
    els.detailPrice.innerHTML = prices.map((price) => `<p>${escapeHtml(price)}</p>`).join('');
  }
}

function renderDetailMedia(els, model, escapeHtml, formatNumber) {
  if (!model.media.images.length) {
    els.detailMedia.innerHTML = '<p class="empty-note">Keine prüfbaren Bilder vorhanden.</p>';
    els.detailMediaNote.textContent = '';
    return;
  }

  els.detailMedia.innerHTML = model.media.images.slice(0, 5).map((image) => `
    <figure class="detail-media-item">
      <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || image.value || '')}" loading="lazy">
      <figcaption>
        <strong>${escapeHtml(image.value || 'Bild')}</strong>
        <span>${escapeHtml(image.copyrightText || 'Urheber fehlt')}</span>
        <small>Lizenz: ${escapeHtml(image.license || 'nicht angegeben')}</small>
      </figcaption>
    </figure>
  `).join('');

  els.detailMediaNote.textContent = `${formatNumber(model.media.images.length)} Bilder vorhanden. ${formatNumber(model.media.missingCopyrightCount)} ohne Urheberangabe. ${formatNumber(model.media.missingAltCount)} ohne Alt-Text.`;
}

function renderDetailInfo(els, model, escapeHtml, formatRecordDate, copyText) {
  const rows = [
    ['ID', escapeHtml(model.identity.id || '-')],
    ['global_id', escapeHtml(model.identity.globalId || '-')],
    ['Pflegesystem', escapeHtml(model.details.primarySystem.name)],
    ['ET4 pages', model.details.et4Url ? `<a href="${escapeHtml(model.details.et4Url)}" target="_blank" rel="noopener">Öffnen auf et4 pages</a>` : 'Nicht verfügbar'],
    ['Web', model.details.web ? `<a href="${escapeHtml(model.details.web)}" target="_blank" rel="noopener">Datensatz öffnen</a>` : 'Nicht angegeben'],
    ['E-Mail', escapeHtml(model.details.email || 'Nicht angegeben')],
    ['Telefon', escapeHtml(model.details.phone || 'Nicht angegeben')],
    ['Adresse', escapeHtml([model.details.street, model.details.zip, model.identity.city].filter(Boolean).join(', ') || 'Nicht angegeben')],
    ['Lizenz', escapeHtml(model.details.license || 'Lizenz fehlt')],
    ['Letzte Aktualisierung', escapeHtml(formatRecordDate(model.identity.updatedAt))]
  ];

  els.detailInfo.innerHTML = renderKvRows(rows, escapeHtml, true);
  els.detailInfo.querySelectorAll('[data-copy-detail]').forEach((button) => {
    button.addEventListener('click', () => copyText(button.dataset.copyDetail || ''));
  });
}

function renderDetailCriteria(els, model, escapeHtml, criterionStatusClass, getCriterionDisplayStatus) {
  if (!els.detailCriteriaCard || !els.detailCriteriaList) return;

  const automatic = model.quality.criteria || [];
  const prepared = model.quality.preparedCriteria || [];
  const manualDomain = model.quality.manualDomainCriteria || [];
  const sourceGuarded = model.quality.sourceGuardedCriteria || [];
  const sections = [
    renderDetailCriteriaSection(
      'Automatisch bewertet',
      automatic,
      'Diese Kriterien fliessen heute bereits in die Datensatzbewertung ein.',
      escapeHtml,
      criterionStatusClass,
      getCriterionDisplayStatus
    ),
    renderDetailCriteriaSection(
      'Fachlich vorbereitet',
      prepared,
      'Diese Prüfungen sind für diesen Datentyp bereits fachlich vorgesehen, aber technisch noch nicht automatisch angebunden.',
      escapeHtml,
      criterionStatusClass,
      getCriterionDisplayStatus
    ),
    renderDetailCriteriaSection(
      'Manuell zu prüfen',
      manualDomain,
      'Diese Punkte brauchen weiterhin eine redaktionelle Sichtprüfung.',
      escapeHtml,
      criterionStatusClass,
      getCriterionDisplayStatus
    ),
    renderDetailCriteriaSection(
      'Nicht als normale Pflegeaufgabe',
      sourceGuarded,
      'Diese Punkte sind fachlich relevant, werden aber nicht als normale automatische Pflegeaufgabe behandelt.',
      escapeHtml,
      criterionStatusClass,
      getCriterionDisplayStatus
    )
  ].filter(Boolean);

  els.detailCriteriaList.innerHTML = sections.join('');
  els.detailCriteriaCard.hidden = !sections.length;
}

export function renderRecordDetailPage({
  els,
  model,
  escapeHtml,
  formatNumber,
  formatRecordDate,
  criterionStatusClass,
  getCriterionDisplayStatus,
  buildRecordDetailUrl,
  loadRecordListState,
  copyText
}) {
  renderDetailContext(els, model);
  renderDetailNavigation(els, model, loadRecordListState, buildRecordDetailUrl);

  els.detailHeadCard.innerHTML = `
    <div class="detail-head-left">
      <h1 id="record-detail-title">${escapeHtml(model.identity.title)} <span class="type-chip ${model.identity.type.toLowerCase()}">${escapeHtml(model.identity.type || '-')}</span></h1>
      <p>${escapeHtml([model.identity.city, model.identity.region, model.identity.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben')}</p>
    </div>
  `;

  els.detailHeadCard.querySelectorAll('[data-copy-detail]').forEach((button) => {
    button.addEventListener('click', () => copyText(button.dataset.copyDetail || ''));
  });

  els.detailContent.hidden = false;
  renderDetailIssues(els, model, escapeHtml);
  renderDetailUsability(els, model, escapeHtml);
  renderDetailTextCards(els, model, escapeHtml);
  renderDetailMedia(els, model, escapeHtml, formatNumber);
  renderDetailInfo(els, model, escapeHtml, formatRecordDate, copyText);
  renderDetailCriteria(els, model, escapeHtml, criterionStatusClass, getCriterionDisplayStatus);

  if (model.details.et4Url && els.detailEt4Link) {
    els.detailEt4Link.href = model.details.et4Url;
    els.detailEt4Link.hidden = false;
  }
}

export function renderDetailLoadingState(els) {
  if (els.detailHeadCard) els.detailHeadCard.innerHTML = '<div class="table-empty"><span class="loading-line">Datensatz wird geladen ...</span></div>';
  if (els.detailContent) els.detailContent.hidden = true;
  if (els.detailCriteriaCard) els.detailCriteriaCard.hidden = true;
  if (els.detailEt4Link) els.detailEt4Link.hidden = true;
}

export function renderDetailEmptyState(els, message, escapeHtml, showDetailMessage) {
  if (els.detailHeadCard) els.detailHeadCard.innerHTML = `<div class="table-empty">${escapeHtml(message)}</div>`;
  if (els.detailContent) els.detailContent.hidden = true;
  if (els.detailCriteriaCard) els.detailCriteriaCard.hidden = true;
  showDetailMessage('');
}
