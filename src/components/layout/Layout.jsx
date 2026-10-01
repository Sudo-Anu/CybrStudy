import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSections } from '../../hooks/useSections';

export default function Layout({ children }) {
  const { sections, loading } = useSections();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="layout-root">
      <Header
        onMenuClick={() => setMobileMenuOpen((v) => !v)}
        isMobileMenuOpen={mobileMenuOpen}
      />

      <div className="layout-body">
        {/* Desktop sidebar: continuous full-height left column */}
        <aside className="layout-sidebar" aria-label="Sidebar Navigation">
          <Sidebar sections={sections} loading={loading} />
        </aside>

        {/* Mobile sidebar overlay drawer */}
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

        {/* Right content column containing Page Content & Footer */}
        <div className="layout-main-wrapper">
          <main className="layout-content">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
