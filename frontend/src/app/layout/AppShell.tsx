import { NavLink, Outlet } from 'react-router-dom';

import { ContextSummary } from '../../shared/ui/ContextSummary';

const navigationItems = [
  { to: '/', label: 'Übersicht', end: true },
  { to: '/tasks', label: 'Pflegeaufgaben' },
  { to: '/records', label: 'Datensätze' },
  { to: '/stats', label: 'Open-Data-Statistik' },
  { to: '/help', label: 'Hilfe' }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge" aria-hidden="true">S</div>
          <div>
            <div className="brand-title">SaTourN</div>
            <div className="brand-subtitle">Datenqualitätsmonitor</div>
          </div>
        </div>
        <ContextSummary />
      </header>

      <div className="layout-grid">
        <aside className="sidebar">
          <nav className="sidebar-nav" aria-label="Hauptnavigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
