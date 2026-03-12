import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClientProfile from './pages/ClientProfile';
import Overview from './pages/Overview';
import Settings from './pages/Settings';
import PublicQr from './pages/PublicQr';
import PublicSignup from './pages/PublicSignup';
import PublicLaunch from './pages/PublicLaunch';

const PILOT_PREPARER_ID = 'feb93713-91a6-474f-8d56-cebdd606ebff';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/dashboard/${PILOT_PREPARER_ID}/overview`} replace />} />
        <Route path="/dashboard/:preparerId/overview" element={<Overview />} />
        <Route path="/dashboard/:preparerId" element={<Dashboard />} />
        <Route path="/dashboard/:preparerId/client/:clientId" element={<ClientProfile />} />
        <Route path="/dashboard/:preparerId/settings" element={<Settings />} />
        <Route path="/public/:preparerId/qr" element={<PublicQr />} />
        <Route path="/public/:preparerId/signup" element={<PublicSignup />} />
        <Route path="/public/:preparerId/connect" element={<PublicLaunch />} />
      </Routes>
    </BrowserRouter>
  );
}
