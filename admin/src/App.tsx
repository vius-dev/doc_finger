import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import DashboardLayout from './layouts/DashboardLayout'
import AdminDashboard from './pages/AdminDashboard'
import InstitutionList from './pages/InstitutionList'
import InstitutionDetails from './pages/InstitutionDetails'
import KeyManagement from './pages/KeyManagement'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { adminService } from './api/adminService'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const user = await adminService.getCurrentUser();
            setIsAuthenticated(!!user);
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) return <div className="loading-screen">Authenticating...</div>;
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/institutions" element={<InstitutionList />} />
                <Route path="/institutions/:id" element={<InstitutionDetails />} />
                <Route path="/keys" element={<KeyManagement />} />
                <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}

export default App
