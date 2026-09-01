import type { ReactNode } from 'react';

type PageGuidanceProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: string;
};

export function PageGuidance({
  title,
  children,
  action,
  icon = 'assistant_direction'
}: PageGuidanceProps) {
  return (
    <section className="page-guidance" aria-label="Orientierung für diese Seite">
      <span className="page-guidance-icon material-icons" aria-hidden="true">{icon}</span>
      <div className="page-guidance-copy">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      {action ? <div className="page-guidance-action">{action}</div> : null}
    </section>
  );
}
