import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import SalesmanDashboard from './pages/SalesmanDashboard';
import CustomerList from './pages/CustomerList';
import CustomerDashboard from './pages/CustomerDashboard';
import InvoiceOutstanding from './pages/InvoiceOutstanding';
import DailyTasks from './pages/DailyTasks';
import CollectionEntry from './pages/CollectionEntry';
import WhatsappModule from './pages/WhatsappModule';
import MssqlImport from './pages/MssqlImport';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import SalesmanWiseDashboard from './pages/SalesmanWiseDashboard';
import Settings from './pages/Settings';

// Protected Route Wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4f46e5',
        fontWeight: 700
      }}>
        Initializing Payment Collection Portal...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Application */}
          <Route element={<ProtectedRoute><MainLayout pageTitle="Overall Dashboard" /></ProtectedRoute>}>
            <Route path="/dashboard" element={<SalesmanDashboard />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly={true}><MainLayout pageTitle="Salesman-Wise Dashboard" /></ProtectedRoute>}>
            <Route path="/salesmen-dashboard" element={<SalesmanWiseDashboard />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="My Customers" /></ProtectedRoute>}>
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="Invoice / Bill Outstanding" /></ProtectedRoute>}>
            <Route path="/invoices" element={<InvoiceOutstanding />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="My Daily Tasks" /></ProtectedRoute>}>
            <Route path="/daily-tasks" element={<DailyTasks />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="Collection Entry" /></ProtectedRoute>}>
            <Route path="/collections" element={<CollectionEntry />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="WhatsApp Communication" /></ProtectedRoute>}>
            <Route path="/whatsapp" element={<WhatsappModule />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly={true}><MainLayout pageTitle="MSSQL Data Import" /></ProtectedRoute>}>
            <Route path="/mssql-import" element={<MssqlImport />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="Reports & Analytics" /></ProtectedRoute>}>
            <Route path="/reports" element={<Reports />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly={true}><MainLayout pageTitle="User Management" /></ProtectedRoute>}>
            <Route path="/users" element={<UserManagement />} />
          </Route>

          <Route element={<ProtectedRoute><MainLayout pageTitle="Settings" /></ProtectedRoute>}>
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
