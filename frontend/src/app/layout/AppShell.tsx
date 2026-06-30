import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { AREAS, DATA_TYPES } from '../../shared/config/constants';
import { useContextStore } from '../../shared/state/context-store';
import type { DataType, WorkContext } from '../../shared/types/context';
import { ContextSummary } from '../../shared/ui/ContextSummary';

const navigationItems = [
  { to: '/', label: 'Übersicht', icon: 'home', end: true },
  { to: '/tasks', label: 'Pflegeaufgaben', icon: 'assignment' },
  { to: '/records', label: 'Datensätze', icon: 'storage' },
  { to: '/stats', label: 'Open-Data-Statistik', icon: 'bar_chart' },
  { to: '/help', label: 'Hilfe', icon: 'help_outline' }
];

type ThemeMode = 'light' | 'dark';
type ServerWarmupState = 'idle' | 'warming' | 'ready' | 'failed';

const THEME_STORAGE_KEY = 'satourn.frontend.theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  } catch {
    // Theme persistence is optional.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getMainClassName(pathname: string) {
  if (pathname.startsWith('/record-detail')) return 'record-detail-main';
  if (pathname.startsWith('/tasks')) return 'tasks-main';
  if (pathname.startsWith('/stats')) return 'stats-main';
  if (pathname.startsWith('/help')) return 'help-main';
  return 'records-main';
}

function getServerWarmupLabel(state: ServerWarmupState) {
  if (state === 'warming') return 'Server startet';
  if (state === 'ready') return 'Server bereit';
  if (state === 'failed') return 'Server prüfen';
  return 'Server';
}

function persistTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable in privacy-restricted environments.
  }
}

export function AppShell() {
  const location = useLocation();
  const { context, setContext } = useContextStore();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [draftContext, setDraftContext] = useState<WorkContext>(context);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [serverWarmupState, setServerWarmupState] = useState<ServerWarmupState>('idle');

  useEffect(() => {
    if (isContextOpen) setDraftContext(context);
  }, [context, isContextOpen]);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function wakeServer() {
      setServerWarmupState('warming');

      try {
        const runtime = getRuntimeConfig();
        const response = await fetch(runtime.warmupApiBase, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        });

        if (!active) return;
        setServerWarmupState(response.ok ? 'ready' : 'failed');
      } catch {
        if (!active || controller.signal.aborted) return;
        setServerWarmupState('failed');
      }
    }

    void wakeServer();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  function closeContextDialog() {
    setIsContextOpen(false);
  }

  function applyContextDialog() {
    setContext(draftContext);
    setIsContextOpen(false);
  }

  const mainClassName = getMainClassName(location.pathname);

  return (
    <div className={`statistik ${theme}-shell`}>
      <header className="app-header">
        <NavLink className="brand" to="/" aria-label="SaTourN Datenqualitäts-Monitor">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>SaTourN</strong>
            <small>Datenqualitäts-Monitor</small>
          </span>
        </NavLink>

        <ContextSummary onEdit={() => setIsContextOpen(true)} />

        <div className="header-status">
          <button
            className="icon-button"
            type="button"
            aria-label={theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
            title={theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
            onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
          >
            <span className="material-icons" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button className="icon-button" type="button" aria-label="Daten aktualisieren">
            <span className="material-icons" aria-hidden="true">refresh</span>
          </button>
          <span className={`server-status server-status-${serverWarmupState}`}>
            {getServerWarmupLabel(serverWarmupState)}
          </span>
          <span className="preview-chip">Preview</span>
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

        <main className={mainClassName}>
          <Outlet />
        </main>
      </div>

      {isContextOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="context-dialog" role="dialog" aria-modal="true" aria-labelledby="context-dialog-title">
            <header>
              <h2 id="context-dialog-title">Arbeitskontext ändern</h2>
              <button className="icon-button" type="button" aria-label="Schließen" onClick={closeContextDialog}>
                <span className="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <label>
              Gebiet
              <select
                value={draftContext.area}
                onChange={(event) => setDraftContext((current) => ({ ...current, area: event.target.value }))}
              >
                {AREAS.map(([label, value]) => (
                  <option key={value || 'all'} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              Ort
              <input
                type="text"
                value={draftContext.city}
                placeholder="Alle Orte"
                onChange={(event) => setDraftContext((current) => ({ ...current, city: event.target.value }))}
              />
            </label>

            <label>
              Datentyp
              <select
                value={draftContext.type}
                onChange={(event) => setDraftContext((current) => ({ ...current, type: event.target.value as DataType }))}
              >
                <option value="">Alle Datentypen</option>
                {DATA_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <footer>
              <button type="button" onClick={closeContextDialog}>Abbrechen</button>
              <button className="primary" type="button" onClick={applyContextDialog}>Übernehmen</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
