import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.jsx';
import { Skeleton } from './components/ui/Feedback.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ClientDetails } from './pages/ClientDetails.jsx';
import { Clients } from './pages/Clients.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { Payments } from './pages/Payments.jsx';
import { Settings } from './pages/Settings.jsx';
import { Tasks } from './pages/Tasks.jsx';

/**
 * Auth gate plus the persistent shell. Nesting the pages as routed children
 * keeps the sidebar mounted across navigations, so it never re-animates or
 * loses scroll position when moving between sections.
 */
function ProtectedShell() {
  const { session, loading } = useAuth();
  const [crumbLabel, setCrumbLabel] = useState(null);

  if (loading) {
    return (
      <div className="screen-center" aria-busy="true">
        <div className="stack" style={{ gap: 'var(--sp-3)', width: 260 }}>
          <Skeleton height={12} width="60%" />
          <Skeleton height={12} width="85%" />
          <Skeleton height={12} width="45%" />
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <AppShell crumbLabel={crumbLabel}>
      <Outlet context={{ setCrumbLabel }} />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetails />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
