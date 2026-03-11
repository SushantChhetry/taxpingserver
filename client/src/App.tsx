import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

const PILOT_PREPARER_ID = 'feb93713-91a6-474f-8d56-cebdd606ebff';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/dashboard/${PILOT_PREPARER_ID}`} replace />} />
        <Route path="/dashboard/:preparerId" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
