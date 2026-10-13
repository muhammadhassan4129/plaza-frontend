import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ShopsPage from './pages/ShopsPage';
import TenantsPage from './pages/TenantsPage';
import AgreementsPage from './pages/AgreementsPage'; 
import InvoicesPage from './pages/InvoicesPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { getCurrentAdmin } from './services/authService';

const ProtectedRoute = ({ children, pageKey }) => {
  const user = getCurrentAdmin();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.role === 'admin';
  const allowedPages = user.allowedPages || [];

  if (pageKey === 'settings' && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // 3. Page Access Check for Manager
  if (!isSuperAdmin && pageKey && !allowedPages.includes(pageKey)) {

    const firstAllowedPage = allowedPages[0];
    if (firstAllowedPage) {
      const redirectPath = firstAllowedPage === 'dashboard' ? '/' : `/${firstAllowedPage}`;
      return <Navigate to={redirectPath} replace />;
    }
    
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const RootRedirect = () => {
  const user = getCurrentAdmin();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.role === 'admin';
  const allowedPages = user.allowedPages || [];

  if (isSuperAdmin || allowedPages.includes('dashboard')) {
    return (
      <ProtectedRoute pageKey="dashboard">
        <DashboardPage />
      </ProtectedRoute>
    );
  }

  if (allowedPages.length > 0) {
    const firstPage = allowedPages[0];
    return <Navigate to={`/${firstPage}`} replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root Route with Smart Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Protected Permission-Based Routes */}
        <Route
          path="/shops"
          element={
            <ProtectedRoute pageKey="shops">
              <ShopsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute pageKey="tenants">
              <TenantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agreements"
          element={
            <ProtectedRoute pageKey="agreements">
              <AgreementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute pageKey="invoices">
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute pageKey="expenses">
              <ExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute pageKey="reports">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute pageKey="settings">
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;