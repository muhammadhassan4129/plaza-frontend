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
import { getCurrentAdmin } from './services/authService';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const admin = getCurrentAdmin();
  if (!admin) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Route (Layout ke baghair) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (Layout ke sath) */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/shops" element={<ProtectedRoute><ShopsPage /></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><TenantsPage /></ProtectedRoute>} />
        <Route path="/agreements" element={<ProtectedRoute><AgreementsPage /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;