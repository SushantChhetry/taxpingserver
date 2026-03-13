import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import ClientProfile from './pages/ClientProfile';
import Overview from './pages/Overview';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Messages from './pages/Messages';
import Season from './pages/Season';
import PublicQr from './pages/PublicQr';
import PublicSignup from './pages/PublicSignup';
import PublicLaunch from './pages/PublicLaunch';
import LandingPage from './pages/LandingPage';
import LandingTryText from './pages/LandingTryText';
import DashboardThemeProvider from './components/DashboardThemeProvider';

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

const DEFAULT_TITLE = 'TaxPing Dashboard';
const DEFAULT_DESCRIPTION = 'TaxPing helps tax preparers track client document collection, follow-ups, and seasonal workflow in one dashboard.';

function updateMetaDescription(content: string) {
  let element = document.querySelector('meta[name="description"]');

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', 'description');
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function AppMetadata() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESCRIPTION;

    if (/^\/dashboard\/[^/]+\/overview\/?$/.test(path)) {
      title = 'Overview | TaxPing Dashboard';
      description = 'View client workflow, response status, and the next actions for your TaxPing workspace.';
    } else if (/^\/dashboard\/[^/]+\/client\/[^/]+\/?$/.test(path)) {
      title = 'Client Profile | TaxPing Dashboard';
      description = 'Review one client record, message history, and document progress inside TaxPing.';
    } else if (/^\/dashboard\/[^/]+\/settings\/?$/.test(path)) {
      title = 'Settings | TaxPing Dashboard';
      description = 'Manage branding, reminder timing, and workspace preferences for your TaxPing dashboard.';
    } else if (/^\/dashboard\/[^/]+\/help\/?$/.test(path)) {
      title = 'Help | TaxPing Dashboard';
      description = 'Open the TaxPing workflow guide, setup instructions, and key dashboard actions.';
    } else if (/^\/dashboard\/[^/]+\/messages\/?$/.test(path)) {
      title = 'Messages | TaxPing Dashboard';
      description = 'Monitor client conversations and stay on top of document collection with TaxPing.';
    } else if (/^\/dashboard\/[^/]+\/season\/?$/.test(path)) {
      title = 'Season View | TaxPing Dashboard';
      description = 'Track seasonal tax prep activity, deadlines, and workspace momentum in TaxPing.';
    } else if (/^\/dashboard\/[^/]+\/?$/.test(path)) {
      title = 'Dashboard | TaxPing';
      description = 'Manage clients, requests, reminders, and document collection from the TaxPing dashboard.';
    } else if (/^\/public\/[^/]+\/qr\/?$/.test(path)) {
      title = 'Client QR Access | TaxPing';
      description = 'Share a simple QR entry point so clients can start their TaxPing document handoff quickly.';
    } else if (/^\/public\/[^/]+\/signup\/?$/.test(path)) {
      title = 'Client Signup | TaxPing';
      description = 'Collect a client name and phone number, then move them into the TaxPing messaging workflow.';
    } else if (/^\/public\/[^/]+\/connect\/?$/.test(path)) {
      title = 'Connect | TaxPing';
      description = 'Launch the client handoff experience and connect the conversation back into TaxPing.';
    } else if (/^\/landing\/try-text\/?$/.test(path)) {
      title = 'Text TaxPing | TaxPing';
      description = 'Open a prefilled text message to TaxPing from your phone.';
    } else if (/^\/landing\/?$/.test(path)) {
      title = 'TaxPing | Text-first Tax Prep Intake';
      description = 'See how TaxPing turns tax document collection into a smoother client flow with branded entry points, texting, reminders, and dashboard visibility.';
    }

    document.title = title;
    updateMetaDescription(description);
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <DashboardThemeProvider>
        <AppMetadata />
        <Routes>
          <Route path="/" element={<Navigate to={`/dashboard/${PILOT_PREPARER_ID}/overview`} replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/landing/try-text" element={<LandingTryText />} />
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
      </DashboardThemeProvider>
    </BrowserRouter>
  );
}
