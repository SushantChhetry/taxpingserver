import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ClientProfile from './pages/ClientProfile';
import Overview from './pages/Overview';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Messages from './pages/Messages';
import Season from './pages/Season';
import PublicQr from './pages/PublicQr';
import PublicSignup from './pages/PublicSignup';
import PublicLaunch from './pages/PublicLaunch';

const PILOT_PREPARER_ID = 'feb93713-91a6-474f-8d56-cebdd606ebff';

function LoadingRoute({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#F7F8FC',
        color: '#475569',
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function MissingDashboard() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#F7F8FC',
      }}
    >
      <div
        style={{
          width: 'min(100%, 540px)',
          borderRadius: 20,
          border: '1px solid #E2E8F0',
          background: 'white',
          padding: 24,
          boxShadow: '0 18px 60px rgba(15,23,42,0.08)',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: '#111827' }}>
          Dashboard unavailable
        </div>
        <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
          This worktree is missing the dashboard page file, so the dashboard route is showing a fallback instead. The public demo routes still work.
        </div>
      </div>
    </div>
  );
}

const Dashboard = lazy(async () => {
  try {
    const dashboardModulePath = './pages/Dashboard.tsx';
    return await import(/* @vite-ignore */ dashboardModulePath);
  } catch {
    return { default: MissingDashboard };
  }
});

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/dashboard/${PILOT_PREPARER_ID}/overview`} replace />} />
        <Route path="/dashboard/:preparerId/overview" element={<Overview />} />
        <Route
          path="/dashboard/:preparerId"
          element={
            <Suspense fallback={<LoadingRoute label="Loading dashboard…" />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="/dashboard/:preparerId/client/:clientId" element={<ClientProfile />} />
        <Route path="/dashboard/:preparerId/settings" element={<Settings />} />
        <Route path="/dashboard/:preparerId/help" element={<Help />} />
        <Route path="/dashboard/:preparerId/messages" element={<Messages />} />
        <Route path="/dashboard/:preparerId/season" element={<Season />} />
        <Route path="/public/:preparerId/qr" element={<PublicQr />} />
        <Route path="/public/:preparerId/signup" element={<PublicSignup />} />
        <Route path="/public/:preparerId/connect" element={<PublicLaunch />} />
      </Routes>
    </BrowserRouter>
  );
}
