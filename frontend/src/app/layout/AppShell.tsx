import { NavLink, Outlet } from 'react-router-dom';

import { ContextSummary } from '../../shared/ui/ContextSummary';

const navigationItems = [
  { to: '/', label: 'Übersicht', icon: 'home', end: true },
  { to: '/tasks', label: 'Pflegeaufgaben', icon: 'assignment' },
  { to: '/records', label: 'Datensätze', icon: 'storage' },
  { to: '/stats', label: 'Open-Data-Statistik', icon: 'bar_chart' },
  { to: '/help', label: 'Hilfe', icon: 'help_outline' }
];

export function AppShell() {
  return (
    <div className="statistik light-shell">
      <header className="app-header">
        <NavLink className="brand" to="/" aria-label="SaTourN Datenqualitäts-Monitor">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>SaTourN</strong>
            <small>Datenqualitäts-Monitor</small>
          </span>
        </NavLink>

        <ContextSummary />

        <div className="header-status">
          <button className="icon-button" type="button" aria-label="Daten aktualisieren">
            <span className="material-icons" aria-hidden="true">refresh</span>
          </button>
          <span>Framework-Preview</span>
        </div>
      </header>

      <div className="app-layout">
        <nav className="app-sidebar" aria-label="Datenqualitätsmonitor Navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="material-icons" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="records-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
