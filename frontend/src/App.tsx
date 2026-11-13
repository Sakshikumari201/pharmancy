import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { BatchesPage } from './pages/BatchesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { UsersPage } from './pages/UsersPage';
import { AuditPage } from './pages/AuditPage';
import { SalesPage } from './pages/SalesPage';
import { Role } from './types';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Route Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: Role[] }> = ({
  children,
  allowedRoles
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Validating authorization session..." fullHeight />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If cashier tries to access admin/reports, redirect to POS or Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking session..." fullHeight />;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Authenticated Dashboard Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="medicines" element={<MedicinesPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />

            {/* Admin & Pharmacist only routes */}
            <Route
              path="purchases"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <PurchasesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="adjustments"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <AdjustmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <AuditPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only routes */}
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Wildcard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
