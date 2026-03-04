import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Documents from './pages/dashboard/Documents';
import DocumentDetails from './pages/dashboard/DocumentDetails';
import Register from './pages/dashboard/Register';
import Analytics from './pages/dashboard/Analytics';
import Keys from './pages/dashboard/Keys';
import Settings from './pages/dashboard/Settings';
import ManageTemplates from './pages/dashboard/ManageTemplates';
import BulkUpload from './pages/dashboard/BulkUpload';
import Verify from './pages/public/Verify';
import Pricing from './pages/public/Pricing';
import Apply from './pages/public/Apply';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/apply" element={<Apply />} />

          {/* Dashboard routes (protected by DashboardLayout) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Documents />} />
            <Route path="documents/:id" element={<DocumentDetails />} />
            <Route path="register" element={<Register />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="keys" element={<Keys />} />
            <Route path="settings" element={<Settings />} />
            <Route path="templates" element={<ManageTemplates />} />
            <Route path="bulk-upload" element={<BulkUpload />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
