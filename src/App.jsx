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

// HashRouter is required for GitHub Pages static hosting.
// All routes use /#/ prefix automatically.
//
// HIDDEN ADMIN ROUTE: /admin-portal-xyz
// This path is NOT linked anywhere in the public UI.
// Only accessible by typing the full URL manually.
// Change VITE_ADMIN_ROUTE in .env to customize it.

const ADMIN_BASE = import.meta.env.VITE_ADMIN_ROUTE || '/admin-portal-xyz';

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

                {/* ---- Hidden Admin routes (no layout wrapper) ---- */}
                <Route path={ADMIN_BASE}             element={<AdminLoginPage />} />
                <Route path={`${ADMIN_BASE}/dashboard`} element={<AdminPage />} />

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
