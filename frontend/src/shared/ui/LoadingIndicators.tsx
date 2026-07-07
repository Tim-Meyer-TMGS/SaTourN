type LoadingTextProps = {
  children: string;
  className?: string;
};

export function MetricLoading() {
  return <span className="metric-loading" aria-hidden="true" />;
}

export function InlineLoading({ children, className = '' }: LoadingTextProps) {
  const classes = ['inline-loading', className].filter(Boolean).join(' ');
  return <span className={classes} role="status">{children}</span>;
}

export function LoadingLine({ children, className = '' }: LoadingTextProps) {
  const classes = ['loading-line', className].filter(Boolean).join(' ');
  return <span className={classes} role="status">{children}</span>;
}
