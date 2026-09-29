import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import HomePage        from './pages/HomePage';
import BrowsePage      from './pages/BrowsePage';
import AdminLoginPage  from './pages/AdminLoginPage';
import AdminPage       from './pages/AdminPage';
import UserLoginPage   from './pages/UserLoginPage';
import { ADMIN_BASE }  from './utils/constants';

// HashRouter is required for GitHub Pages static hosting.
// All routes use /#/ prefix automatically.
//
// Admin route base is configurable via VITE_ADMIN_ROUTE in .env, defaults to '/login'.

/**
 * Wraps any route that requires a logged-in user.
 * - While Firebase resolves auth state → shows a centered spinner.
 * - Logged in  → renders children normally.
 * - Logged out → redirects to /user-login.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/user-login" replace />;
  }

  return children;
}

/**
 * Wraps any route that requires a verified admin.
 * - While Firebase resolves auth state → shows a centered spinner.
 * - Logged in AND isAdmin → renders children.
 * - Logged in but NOT admin → redirects to admin login (prevents escalation).
 * - Logged out → redirects to admin login.
 */
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                {/* ---- Protected main site (login required) ---- */}
                <Route path="/" element={
                  <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
                } />
                <Route path="/browse" element={
                  <ProtectedRoute><Layout><BrowsePage /></Layout></ProtectedRoute>
                } />
                <Route path="/browse/:sectionId" element={
                  <ProtectedRoute><Layout><BrowsePage /></Layout></ProtectedRoute>
                } />

                {/* ---- User login (public) ---- */}
                <Route path="/user-login" element={<UserLoginPage />} />

                {/* ---- Admin routes (no layout wrapper) ---- */}
                <Route path="/login"           element={<AdminLoginPage />} />
                {/* AdminRoute enforces both authentication AND admin role at the router level */}
                <Route path="/login/dashboard" element={<AdminRoute><AdminPage /></AdminRoute>} />

                {/* If a custom ADMIN_BASE is specified, support it too */}
                {ADMIN_BASE !== '/login' && (
                  <>
                    <Route path={ADMIN_BASE}                element={<AdminLoginPage />} />
                    <Route path={`${ADMIN_BASE}/dashboard`} element={<AdminRoute><AdminPage /></AdminRoute>} />
                  </>
                )}

                {/* Convenience & legacy redirects */}
                <Route path="/admin-portal-xyz"  element={<Navigate to="/login" replace />} />
                <Route path="/admin-portal-xyz/*" element={<Navigate to="/login" replace />} />
                <Route path="/admin"   element={<Navigate to="/login" replace />} />
                <Route path="/admin/*" element={<Navigate to="/login" replace />} />

                {/* ---- Fallback ---- */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

