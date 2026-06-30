import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';

import { AppShell } from '../layout/AppShell';
import { HelpPage } from '../../features/help/HelpPage';
import { OverviewPage } from '../../features/overview/OverviewPage';
import { RecordDetailPage } from '../../features/record-detail/RecordDetailPage';
import { RecordsPage } from '../../features/records/RecordsPage';
import { StatsPage } from '../../features/stats/StatsPage';
import { TasksPage } from '../../features/tasks/TasksPage';

function NotFoundPage() {
  return (
    <section className="content-panel">
      <h1>Seite nicht gefunden</h1>
      <p>Die angeforderte Route existiert im neuen Frontend noch nicht.</p>
      <NavLink className="inline-link" to="/">Zur Übersicht</NavLink>
    </section>
  );
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/record-detail" element={<RecordDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
