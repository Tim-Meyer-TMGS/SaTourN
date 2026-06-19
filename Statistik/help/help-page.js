export function renderHelpPage({
  els,
  types,
  qualityCriteria,
  qualityHelpers,
  escapeHtml,
  formatNumber,
  priorityRank
}) {
  if (els.helpModelSummary) {
    els.helpModelSummary.textContent = 'Nicht jeder Fehler wirkt gleich stark. Kritische Lücken schlagen deutlich auf den Score, normale Fehler schwächen ihn sichtbar und leichte Optimierungen runden den Datensatz später ab.';
  }

  renderHelpSeverityOverview({
    els,
    qualityCriteria,
    escapeHtml
  });
  renderHelpTypeOverview({
    els,
    types,
    qualityCriteria,
    qualityHelpers,
    escapeHtml,
    formatNumber,
    priorityRank
  });
}

function renderHelpTypeOverview({
  els,
  types,
  qualityCriteria,
  qualityHelpers,
  escapeHtml,
  formatNumber,
  priorityRank
}) {
  if (!els.helpTypeGrid) return;
  const cards = types.map((type) => buildHelpTypeCard({
    type,
    qualityCriteria,
    qualityHelpers,
    escapeHtml,
    formatNumber,
    priorityRank
  })).join('');
  els.helpTypeGrid.innerHTML = cards;
}

function renderHelpSeverityOverview({
  els,
  qualityCriteria,
  escapeHtml
}) {
  if (!els.helpSeverityGrid) return;

  const groups = [
    {
      key: 'critical',
      icon: 'error',
      iconClass: 'red',
      title: 'Kritische Fehler',
      impact: 'Wirken stark auf Score und Nutzbarkeit.',
      body: 'Diese Lücken solltest du zuerst schließen. Sie betreffen häufig Lizenz, Beschreibung oder andere zentrale Pflichtangaben.',
      action: 'Zuerst bearbeiten'
    },
    {
      key: 'error',
      icon: 'rule',
      iconClass: 'amber',
      title: 'Fehler',
      impact: 'Schwächen den Datensatz klar sichtbar.',
      body: 'Diese Angaben sind wichtig für Vollständigkeit und Verständlichkeit. Sie sollten nach den kritischen Punkten nachgezogen werden.',
      action: 'Danach bearbeiten'
    },
    {
      key: 'optimization',
      icon: 'auto_fix_high',
      iconClass: 'green',
      title: 'Leichte Optimierungen',
      impact: 'Verbessern Qualität und Feinschliff.',
      body: 'Diese Angaben machen den Datensatz runder und aussagekräftiger, sind aber nicht so gravierend wie harte Lücken.',
      action: 'Zum Schluss optimieren'
    }
  ];

  els.helpSeverityGrid.innerHTML = groups.map((group) => {
    const examples = getHelpSeverityExamples(group.key, qualityCriteria);
    return `
      <article class="panel-card help-score-card help-severity-card">
        <span class="help-score-icon ${group.iconClass} material-icons" aria-hidden="true">${group.icon}</span>
        <div>
          <h2>${escapeHtml(group.title)}</h2>
          <p><strong>${escapeHtml(group.impact)}</strong></p>
          <p>${escapeHtml(group.body)}</p>
          <div class="help-severity-examples">
            <span class="help-severity-action">${escapeHtml(group.action)}</span>
            <p>${escapeHtml(examples)}</p>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function buildHelpTypeCard({
  type,
  qualityCriteria,
  qualityHelpers,
  escapeHtml,
  formatNumber,
  priorityRank
}) {
  const criteria = qualityCriteria
    .filter((criterion) => (criterion.types || []).includes(type))
    .sort((a, b) => (
      priorityRank(b.priority) - priorityRank(a.priority) ||
      Number(b.weight || 0) - Number(a.weight || 0) ||
      a.label.localeCompare(b.label, 'de')
    ));
  const domainCriteria = qualityHelpers.getDomainCriteriaForType(type);
  const autoCheckedCount = criteria.length;
  const pendingCount = domainCriteria.filter((criterion) => criterion.status === 'needs_verification').length;
  const preparedItems = domainCriteria
    .filter((criterion) => criterion.status === 'needs_verification')
    .sort((a, b) => (
      priorityRank(b.uiPriority) - priorityRank(a.uiPriority) ||
      a.label.localeCompare(b.label, 'de')
    ));
  const model = buildHelpTypeScoreModel(criteria);
  const minimumItems = model.minimumCriteria.length ? model.minimumCriteria : criteria.slice(0, 1);
  const extraItems = criteria.filter((criterion) => !model.minimumIds.has(criterion.id));

  return `
    <article class="panel-card help-type-card">
      <header class="help-type-head">
        <div>
          <h3>${escapeHtml(type)}</h3>
          <p class="data-note">Ab ${formatNumber(model.threshold)} Punkten liegt dieser Typ im guten Bereich.</p>
        </div>
        <span class="help-type-score">Ab ${formatNumber(model.threshold)} Punkten gut</span>
      </header>
      <div class="help-type-columns">
        <section>
          <h4>Mindestens für einen guten Stand</h4>
          ${renderHelpCriterionList({ criteria: minimumItems, tone: 'required', escapeHtml, formatNumber })}
        </section>
        <section>
          <h4>Danach sinnvoll optimieren</h4>
          ${renderHelpCriterionList({ criteria: extraItems, tone: 'optional', escapeHtml, formatNumber })}
        </section>
      </div>
      ${preparedItems.length ? `
        <section class="help-prepared-section">
          <h4>Fachlich vorbereitet, später automatisch prüfbar</h4>
          ${renderPreparedHelpCriterionList({ criteria: preparedItems, escapeHtml })}
        </section>
      ` : ''}
      <footer class="help-type-footer">
        <span>Fehlende Angaben ziehen den Score direkt ab.</span>
        <span>${renderHelpTypeFooterSummary(autoCheckedCount, pendingCount, formatNumber)}</span>
      </footer>
    </article>
  `;
}

function buildHelpTypeScoreModel(criteria) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  const threshold = Math.ceil(totalWeight * 0.8);
  const subsets = [];
  const count = criteria.length;

  for (let mask = 1; mask < (1 << count); mask += 1) {
    const selected = [];
    let weight = 0;
    for (let index = 0; index < count; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      const criterion = criteria[index];
      selected.push(criterion);
      weight += Number(criterion.weight || 0);
    }
    if (weight >= threshold) subsets.push({ selected, weight });
  }

  subsets.sort((a, b) => a.selected.length - b.selected.length || a.weight - b.weight);
  const best = subsets[0] || { selected: criteria, weight: totalWeight };

  return {
    totalWeight,
    threshold,
    minimumCriteria: best.selected,
    minimumIds: new Set(best.selected.map((criterion) => criterion.id))
  };
}

function renderHelpCriterionList({
  criteria,
  tone,
  escapeHtml,
  formatNumber
}) {
  if (!criteria.length) {
    return '<p class="help-empty-state">Keine weiteren Angaben in diesem Block.</p>';
  }

  return `
    <ul class="help-checklist">
      ${criteria.map((criterion) => `
        <li class="help-checkitem ${tone}">
          <span class="help-checkweight">${formatNumber(criterion.weight || 0)}</span>
          <div>
            <div class="help-checkheadline">
              <strong>${escapeHtml(criterion.label)}</strong>
              <span class="help-severity-badge ${getHelpSeverityClass(criterion)}">${escapeHtml(getHelpSeverityLabel(criterion))}</span>
            </div>
            <small>${escapeHtml(criterion.recommendation || '')}</small>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderPreparedHelpCriterionList({
  criteria,
  escapeHtml
}) {
  if (!criteria.length) return '';
  return `
    <ul class="help-checklist prepared">
      ${criteria.map((criterion) => `
        <li class="help-checkitem prepared">
          <span class="help-checkweight muted">Spaeter</span>
          <div>
            <div class="help-checkheadline">
              <strong>${escapeHtml(criterion.label)}</strong>
              <span class="help-prepared-badge">Vorbereitet</span>
            </div>
            <small>${escapeHtml(criterion.recommendation || 'Diese Prüfung ist fachlich hinterlegt und wird später technisch nachgezogen.')}</small>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function getHelpSeverityClass(criterion) {
  const severity = getHelpCriterionSeverity(criterion);
  if (severity === 'critical') return 'critical';
  if (severity === 'error') return 'error';
  return 'optimization';
}

function getHelpSeverityLabel(criterion) {
  const severity = getHelpCriterionSeverity(criterion);
  if (severity === 'critical') return 'Kritischer Fehler';
  if (severity === 'error') return 'Fehler';
  return 'Leichte Optimierung';
}

function getHelpCriterionSeverity(criterion) {
  if (!criterion) return 'optimization';
  if (criterion.severity === 'critical' || criterion.severity === 'error' || criterion.severity === 'optimization') {
    return criterion.severity;
  }

  const priority = criterion.priority || '';
  const weight = Number(criterion.weight || 0);
  if (priority === 'hoch' || weight >= 8) return 'critical';
  if (priority === 'mittel' || weight >= 4) return 'error';
  return 'optimization';
}

function getHelpSeverityExamples(severity, qualityCriteria) {
  const labels = qualityCriteria
    .filter((criterion) => getHelpCriterionSeverity(criterion) === severity)
    .slice(0, 3)
    .map((criterion) => criterion.label);

  if (!labels.length) return 'Beispiele werden mit den aktiven Kriterien gefüllt.';
  return `Beispiele: ${labels.join(', ')}`;
}

function renderHelpTypeFooterSummary(autoCheckedCount, pendingCount, formatNumber) {
  if (pendingCount > 0) {
    return `${formatNumber(autoCheckedCount)} aktiv geprüft, ${formatNumber(pendingCount)} vorbereitet`;
  }
  return `${formatNumber(autoCheckedCount)} aktiv geprüft`;
}
