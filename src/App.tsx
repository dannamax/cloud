import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServersPage } from './pages/ServersPage';
import { ServerDetailPage } from './pages/ServerDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { CabinetsPage } from './pages/CabinetsPage';
import { ConfigPage } from './pages/ConfigPage';
import { AuditPage } from './pages/AuditPage';
import { VersionsPage } from './pages/VersionsPage';
import { useAppStore } from './stores/appStore';
import { userApi } from './services/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function App() {
  const { setUser, isAuthenticated, logout } = useAppStore();

  useEffect(() => {
    // 验证 persisted 的登录状态是否仍然有效
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      userApi.me()
        .then(user => {
          setUser(user);
        })
        .catch(() => {
          // token 无效，清除登录状态
          logout();
        });
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/servers" element={
          <ProtectedRoute>
            <ServersPage />
          </ProtectedRoute>
        } />
        <Route path="/servers/:id" element={
          <ProtectedRoute>
            <ServerDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/cabinets" element={
          <ProtectedRoute>
            <CabinetsPage />
          </ProtectedRoute>
        } />
        <Route path="/config" element={
          <ProtectedRoute>
            <ConfigPage />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute>
            <AuditPage />
          </ProtectedRoute>
        } />
        <Route path="/versions" element={
          <ProtectedRoute>
            <VersionsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
