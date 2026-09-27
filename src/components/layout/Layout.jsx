import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSections } from '../../hooks/useSections';

export default function Layout({ children }) {
  const { sections, loading } = useSections();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .layout-sidebar  { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .layout-content  { padding: var(--space-4) !important; }
          /* Mobile overlay sidebar */
          .sidebar-mobile-overlay {
            position: fixed; inset: 0; z-index: 200;
            background: var(--color-overlay-bg);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          }
          .sidebar-mobile-panel {
            position: fixed; left: 0; top: 0;
            height: 100dvh; width: min(320px, 85vw);
            background: var(--color-surface);
            border-right: 1px solid var(--color-border);
            overflow-y: auto; z-index: 201;
            padding: var(--space-5) var(--space-4);
            box-shadow: var(--shadow-xl);
            animation: slideInLeft var(--transition-base) ease;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <Header
          onMenuClick={() => setMobileMenuOpen((v) => !v)}
          isMobileMenuOpen={mobileMenuOpen}
        />

        <div style={{ display: 'flex', flex: 1 }}>
          {/* Desktop sidebar */}
          <div className="layout-sidebar">
            <Sidebar sections={sections} loading={loading} />
          </div>

          {/* Mobile sidebar overlay */}
          {mobileMenuOpen && (
            <div
              className="sidebar-mobile-overlay"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="sidebar-mobile-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <Sidebar
                  sections={sections}
                  loading={loading}
                  isMobile
                  onClose={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Main content */}
          <main
            className="layout-content"
            style={{
              flex: 1,
              padding: 'var(--space-8) var(--space-6)',
              maxWidth: '100%',
              overflowX: 'hidden',
            }}
          >
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
}
