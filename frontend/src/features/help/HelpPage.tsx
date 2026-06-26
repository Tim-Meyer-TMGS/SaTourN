import { DATA_TYPES } from '../../shared/config/constants';
import { getDomainCriteriaForType, qualityCriteria, type QualityCriterion } from '../../shared/legacy/quality';

type HelpSeverity = 'critical' | 'error' | 'optimization';

type SeverityGroup = {
  key: HelpSeverity;
  icon: string;
  iconClass: string;
  title: string;
  impact: string;
  body: string;
  action: string;
};

type TypeHelpModel = {
  type: string;
  threshold: number;
  activeCount: number;
  preparedCount: number;
  minimumCriteria: QualityCriterion[];
  extraCriteria: QualityCriterion[];
  preparedCriteria: QualityCriterion[];
};

const severityGroups: SeverityGroup[] = [
  {
    key: 'critical',
    icon: 'error',
    iconClass: 'red',
    title: 'Kritische Fehler',
    impact: 'Wirken stark auf Score, Nutzbarkeit oder Open-Data-Fähigkeit.',
    body: 'Diese Lücken solltest du zuerst schließen. Dazu gehören zentrale Angaben wie Lizenz, Beschreibung oder wesentliche Kontakt- und Buchungsinformationen.',
    action: 'Zuerst bearbeiten'
  },
  {
    key: 'error',
    icon: 'rule',
    iconClass: 'amber',
    title: 'Fehler',
    impact: 'Schwächen den Datensatz klar sichtbar.',
    body: 'Diese Angaben machen den Datensatz vollständiger und besser nutzbar. Sie sollten nach den kritischen Punkten gepflegt werden.',
    action: 'Danach bearbeiten'
  },
  {
    key: 'optimization',
    icon: 'auto_fix_high',
    iconClass: 'green',
    title: 'Leichte Optimierungen',
    impact: 'Verbessern Qualität, Komfort und Feinschliff.',
    body: 'Diese Angaben runden den Datensatz ab. Sie sind sinnvoll, aber nicht so dringend wie harte Lücken.',
    action: 'Zum Schluss optimieren'
  }
];

const severityLabel: Record<HelpSeverity, string> = {
  critical: 'Kritischer Fehler',
  error: 'Fehler',
  optimization: 'Leichte Optimierung'
};

export function HelpPage() {
  const activeCriteria = qualityCriteria.filter((criterion) => criterion.autoCheck !== false);
  const highImpactCount = activeCriteria.filter((criterion) => getCriterionSeverity(criterion) === 'critical').length;
  const typeModels = DATA_TYPES.map((type) => buildTypeHelpModel(type));

  return (
    <>
      <section className="help-hero">
        <h1>Score verstehen</h1>
        <p>
          Hier siehst du, was deinen Datensatz wirklich verbessert, welche Lücken zuerst geschlossen werden sollten
          und welche Angaben eher Feinschliff sind.
        </p>
      </section>

      <section className="help-score-grid" aria-label="Score-Status">
        <HelpScoreCard
          icon="calculate"
          title="Berechnung"
          text="Der Score vergleicht erfüllte Pflegepunkte mit den möglichen Punkten für den jeweiligen Datentyp."
          highlight="Erfüllte Punkte / mögliche Punkte"
        />
        <HelpScoreCard
          icon="check_circle"
          iconClass="green"
          title="Gut"
          text="Der Datensatz ist solide gepflegt und enthält die wichtigsten Angaben."
          highlight="80 bis 100 Punkte"
        />
        <HelpScoreCard
          icon="rule"
          iconClass="amber"
          title="Prüfen"
          text="Der Datensatz ist nutzbar, hat aber erkennbare Lücken."
          highlight="60 bis 79 Punkte"
        />
        <HelpScoreCard
          icon="error"
          iconClass="red"
          title="Kritisch"
          text="Wichtige Angaben fehlen. Diese Datensätze sollten zuerst bearbeitet werden."
          highlight="unter 60 Punkte"
        />
      </section>

      <section className="panel-card help-summary-card">
        <header className="panel-head">
          <h2>Was dein Score bedeutet</h2>
        </header>
        <p className="data-note">
          {activeCriteria.length} Pflegepunkte werden derzeit automatisch bewertet. Davon sind {highImpactCount}
          {' '}besonders wichtig für den ersten Bearbeitungsschritt.
        </p>
        <div className="help-score-rules">
          <article>
            <h3>Erst das Wichtige</h3>
            <p>Kritische Lücken haben den stärksten Einfluss. Sie sollten vor Detailoptimierungen bearbeitet werden.</p>
          </article>
          <article>
            <h3>Dann sauber ausbauen</h3>
            <p>Normale Fehler verbessern Vollständigkeit, Auffindbarkeit und Nutzbarkeit des Datensatzes.</p>
          </article>
          <article>
            <h3>Zwei Ebenen</h3>
            <p>Der Score beschreibt den Gesamtzustand. Die Fehler-Ebene beschreibt die Schwere einer einzelnen Lücke.</p>
          </article>
        </div>
      </section>

      <section className="help-severity-overview">
        <header className="panel-head">
          <div>
            <h2>Drei Ebenen der Datenqualität</h2>
            <p>Diese Einordnung hilft dir zu entscheiden, was zuerst gepflegt werden sollte.</p>
          </div>
        </header>
        <div className="help-score-grid help-severity-grid">
          {severityGroups.map((group) => (
            <article className="panel-card help-score-card help-severity-card" key={group.key}>
              <span className={`help-score-icon ${group.iconClass} material-icons`} aria-hidden="true">{group.icon}</span>
              <div>
                <h2>{group.title}</h2>
                <p><strong>{group.impact}</strong></p>
                <p>{group.body}</p>
                <div className="help-severity-examples">
                  <span className="help-severity-action">{group.action}</span>
                  <p>{getSeverityExamples(group.key)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="help-score-grid" aria-label="Was nicht als Fehler zählt">
        <HelpScoreCard
          icon="category"
          title="Nicht für jeden Typ nötig"
          text="Ein Hotel braucht andere Angaben als eine Tour oder eine Veranstaltung. Es wird nur bewertet, was fachlich passt."
        />
        <HelpScoreCard
          icon="tune"
          title="Nicht für jede Kategorie sinnvoll"
          text="Einige Angaben werden nur erwartet, wenn sie zur Kategorie passen. Unpassende Anforderungen ziehen den Score nicht herunter."
        />
        <HelpScoreCard
          icon="hourglass_empty"
          title="Noch nicht automatisch bewertet"
          text="Einige sinnvolle Angaben sind fachlich vorbereitet, zählen aber erst, wenn sie zuverlässig automatisch geprüft werden können."
        />
      </section>

      <section className="help-type-overview">
        <header className="panel-head">
          <div>
            <h2>Was du je Datentyp mindestens brauchst</h2>
            <p>Die Karten zeigen, welche Pflegepunkte zuerst zählen und was danach sinnvoll ergänzt werden kann.</p>
          </div>
        </header>

        <div className="help-type-grid">
          {typeModels.map((model) => (
            <TypeHelpCard key={model.type} model={model} />
          ))}
        </div>
      </section>
    </>
  );
}

function HelpScoreCard({
  icon,
  iconClass = '',
  title,
  text,
  highlight
}: {
  icon: string;
  iconClass?: string;
  title: string;
  text: string;
  highlight?: string;
}) {
  return (
    <article className="panel-card help-score-card">
      <span className={`help-score-icon ${iconClass} material-icons`} aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
        {highlight ? <p><strong>{highlight}</strong></p> : null}
      </div>
    </article>
  );
}

function TypeHelpCard({ model }: { model: TypeHelpModel }) {
  return (
    <article className="panel-card help-type-card">
      <header className="help-type-head">
        <div>
          <h3>{model.type}</h3>
          <p className="data-note">Ab {formatNumber(model.threshold)} Punkten liegt dieser Typ im guten Bereich.</p>
        </div>
        <span className="help-type-score">Ab {formatNumber(model.threshold)} Punkten gut</span>
      </header>

      <div className="help-type-columns">
        <section>
          <h4>Mindestens für einen guten Stand</h4>
          <CriterionList criteria={model.minimumCriteria} tone="required" />
        </section>
        <section>
          <h4>Danach sinnvoll optimieren</h4>
          <CriterionList criteria={model.extraCriteria} tone="optional" />
        </section>
      </div>

      {model.preparedCriteria.length ? (
        <section className="help-prepared-section">
          <h4>Fachlich sinnvoll, später automatisch bewertbar</h4>
          <CriterionList criteria={model.preparedCriteria} tone="prepared" />
        </section>
      ) : null}

      <footer className="help-type-footer">
        <span>Fehlende Angaben ziehen den Score direkt ab, wenn sie für diesen Typ relevant sind.</span>
        <span>
          {formatNumber(model.activeCount)} aktiv bewertet
          {model.preparedCount ? `, ${formatNumber(model.preparedCount)} vorbereitet` : ''}
        </span>
      </footer>
    </article>
  );
}

function CriterionList({ criteria, tone }: { criteria: QualityCriterion[]; tone: 'required' | 'optional' | 'prepared' }) {
  if (!criteria.length) {
    return <p className="help-empty-state">Keine weiteren Angaben in diesem Block.</p>;
  }

  return (
    <ul className={`help-checklist${tone === 'prepared' ? ' prepared' : ''}`}>
      {criteria.map((criterion) => {
        const severity = getCriterionSeverity(criterion);
        return (
          <li className={`help-checkitem ${tone}`} key={criterion.id}>
            <span className={`help-checkweight${tone === 'prepared' ? ' muted' : ''}`}>
              {tone === 'prepared' ? 'Später' : formatNumber(criterion.weight || 0)}
            </span>
            <div>
              <div className="help-checkheadline">
                <strong>{criterion.label}</strong>
                <span className={`help-severity-badge ${severity}`}>{severityLabel[severity]}</span>
              </div>
              <small>{criterion.recommendation || fallbackRecommendation(severity)}</small>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function buildTypeHelpModel(type: string): TypeHelpModel {
  const criteria = qualityCriteria
    .filter((criterion) => criterion.autoCheck !== false && (criterion.types || []).includes(type))
    .sort((a, b) => (
      priorityRank(b.priority) - priorityRank(a.priority) ||
      Number(b.weight || 0) - Number(a.weight || 0) ||
      a.label.localeCompare(b.label, 'de')
    ));

  const domainCriteria = getDomainCriteriaForType(type);
  const preparedCriteria = domainCriteria
    .filter((criterion) => criterion.status === 'needs_verification')
    .sort((a, b) => (
      priorityRank(b.uiPriority || b.priority) - priorityRank(a.uiPriority || a.priority) ||
      a.label.localeCompare(b.label, 'de')
    ))
    .slice(0, 4);

  const model = buildTypeScoreModel(criteria);
  const minimumCriteria = model.minimumCriteria.length ? model.minimumCriteria : criteria.slice(0, 1);
  const minimumIds = new Set(minimumCriteria.map((criterion) => criterion.id));

  return {
    type,
    threshold: model.threshold,
    activeCount: criteria.length,
    preparedCount: domainCriteria.filter((criterion) => criterion.status === 'needs_verification').length,
    minimumCriteria,
    extraCriteria: criteria.filter((criterion) => !minimumIds.has(criterion.id)).slice(0, 8),
    preparedCriteria
  };
}

function buildTypeScoreModel(criteria: readonly QualityCriterion[]) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  const threshold = Math.ceil(totalWeight * 0.8);
  const subsets: Array<{ selected: QualityCriterion[]; weight: number }> = [];

  if (!criteria.length) {
    return { threshold: 0, minimumCriteria: [] as QualityCriterion[] };
  }

  if (criteria.length > 20) {
    const selected = criteria.filter((criterion) => getCriterionSeverity(criterion) === 'critical');
    return { threshold, minimumCriteria: selected.length ? selected : criteria.slice(0, 4) };
  }

  for (let mask = 1; mask < (1 << criteria.length); mask += 1) {
    const selected: QualityCriterion[] = [];
    let weight = 0;

    for (let index = 0; index < criteria.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      const criterion = criteria[index];
      selected.push(criterion);
      weight += Number(criterion.weight || 0);
    }

    if (weight >= threshold) subsets.push({ selected, weight });
  }

  subsets.sort((a, b) => a.selected.length - b.selected.length || a.weight - b.weight);

  return {
    threshold,
    minimumCriteria: subsets[0]?.selected || criteria.slice(0, 1)
  };
}

function getCriterionSeverity(criterion: QualityCriterion): HelpSeverity {
  if (criterion.severity === 'critical' || criterion.severity === 'error' || criterion.severity === 'optimization') {
    return criterion.severity;
  }

  if (criterion.uiSeverity === 'critical') return 'critical';
  if (criterion.uiSeverity === 'warning') return 'error';

  const priority = criterion.priority || '';
  const weight = Number(criterion.weight || 0);
  if (priority === 'hoch' || weight >= 8) return 'critical';
  if (priority === 'mittel' || weight >= 4) return 'error';
  return 'optimization';
}

function getSeverityExamples(severity: HelpSeverity) {
  const labels = qualityCriteria
    .filter((criterion) => criterion.autoCheck !== false && getCriterionSeverity(criterion) === severity)
    .slice(0, 3)
    .map((criterion) => criterion.label);

  if (!labels.length) return 'Beispiele werden mit den aktiven Kriterien gefüllt.';
  return `Beispiele: ${labels.join(', ')}`;
}

function priorityRank(priority?: string) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  if (priority === 'niedrig') return 1;
  return 0;
}

function fallbackRecommendation(severity: HelpSeverity) {
  if (severity === 'critical') return 'Diese Angabe sollte zuerst gepflegt werden.';
  if (severity === 'error') return 'Diese Angabe verbessert die Nutzbarkeit des Datensatzes deutlich.';
  return 'Diese Angabe rundet den Datensatz zusätzlich ab.';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
}
