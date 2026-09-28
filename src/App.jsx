import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import HomePage        from './pages/HomePage';
import BrowsePage      from './pages/BrowsePage';
import AdminLoginPage  from './pages/AdminLoginPage';
import AdminPage       from './pages/AdminPage';
import { ADMIN_BASE }  from './utils/constants';

// HashRouter is required for GitHub Pages static hosting.
// All routes use /#/ prefix automatically.
//
// Admin route base is configurable via VITE_ADMIN_ROUTE in .env, defaults to '/login'.

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                {/* ---- Public routes (with sidebar layout) ---- */}
                <Route path="/" element={<Layout><HomePage /></Layout>} />
                <Route path="/browse" element={<Layout><BrowsePage /></Layout>} />
                <Route path="/browse/:sectionId" element={<Layout><BrowsePage /></Layout>} />

                {/* ---- Admin routes (no layout wrapper) ---- */}
                <Route path="/login"                    element={<AdminLoginPage />} />
                <Route path="/login/dashboard"          element={<AdminPage />} />

                {/* If a custom ADMIN_BASE is specified, support it too */}
                {ADMIN_BASE !== '/login' && (
                  <>
                    <Route path={ADMIN_BASE}                element={<AdminLoginPage />} />
                    <Route path={`${ADMIN_BASE}/dashboard`} element={<AdminPage />} />
                  </>
                )}

                {/* Convenience & legacy redirects */}
                <Route path="/admin-portal-xyz" element={<Navigate to="/login" replace />} />
                <Route path="/admin-portal-xyz/*" element={<Navigate to="/login" replace />} />
                <Route path="/admin" element={<Navigate to="/login" replace />} />
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
