import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { NewRequestWizard } from './pages/student/NewRequestWizard';
import { RequestDetail } from './pages/student/RequestDetail';

// Staff Pages
import { StaffQueue } from './pages/staff/StaffQueue';
import { StaffProcessRequest } from './pages/staff/StaffProcessRequest';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDepartmentHealth } from './pages/admin/AdminDepartmentHealth';
import { AdminBottlenecks } from './pages/admin/AdminBottlenecks';
import { AdminAllRequests } from './pages/admin/AdminAllRequests';
import { AdminTrends } from './pages/admin/AdminTrends';

// Route Guard Component
const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Initializing InsightFlow session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to their default workspace if accessing an unauthorized route
    if (role === 'student') return <Navigate to="/student/requests" replace />;
    if (role === 'staff') return <Navigate to="/staff/queue" replace />;
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root Redirect Component
const RootRedirect = () => {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (role === 'student') return <Navigate to="/student/requests" replace />;
  if (role === 'staff') return <Navigate to="/staff/queue" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Application Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Student Routes */}
              <Route
                path="/student/requests"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/new-request"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <NewRequestWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <RequestDetail />
                  </ProtectedRoute>
                }
              />

              {/* Staff Routes */}
              <Route
                path="/staff/queue"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/queue/:id"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffProcessRequest />
                  </ProtectedRoute>
                }
              />

              {/* Admin Analytics Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/department-health"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDepartmentHealth />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bottlenecks"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminBottlenecks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/all-requests"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAllRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/trends"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminTrends />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
