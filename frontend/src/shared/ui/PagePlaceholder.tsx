type PagePlaceholderProps = {
  title: string;
  summary: string;
  migrationStatus: string;
  nextStep: string;
};

export function PagePlaceholder({
  title,
  summary,
  migrationStatus,
  nextStep
}: PagePlaceholderProps) {
  return (
    <section className="content-panel">
      <header className="panel-header">
        <div>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
        <span className="status-chip">{migrationStatus}</span>
      </header>

      <div className="panel-body">
        <div className="placeholder-block">
          <h2>Aktueller Stand</h2>
          <p>Diese Seite ist im neuen Frontend-Grundgerüst angelegt, aber fachlich noch nicht migriert.</p>
        </div>

        <div className="placeholder-block">
          <h2>Nächster Schritt</h2>
          <p>{nextStep}</p>
        </div>
      </div>
    </section>
  );
}
