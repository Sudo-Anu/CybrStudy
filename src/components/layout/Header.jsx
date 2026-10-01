import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_BASE } from '../../utils/constants';
import SearchModal from '../ui/SearchModal';
import ThemeToggle from '../ui/ThemeToggle';

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/browse',  label: 'Browse' },
];

export default function Header({ onMenuClick, isMobileMenuOpen }) {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Global Ctrl+K / Cmd+K / / shortcut and custom event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((v) => !v);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    const handleOpenSearch = () => setSearchModalOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search-modal', handleOpenSearch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search-modal', handleOpenSearch);
    };
  }, []);

  const isActive = (to) => {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  };

  return (
    <>
      <header
        className="site-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 'var(--header-height)',
          background: 'var(--color-header-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          transition: 'background-color var(--transition-base), border-color var(--transition-base)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 'var(--content-max-width)',
            margin: '0 auto',
            gap: 'var(--space-4)',
          }}
        >
          {/* Left: Brand Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            aria-label="CybrStudy Home"
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--color-accent-muted)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: 'var(--text-lg)',
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}
            >
              CybrStudy
            </span>
          </Link>

          {/* Center: Global Search Bar trigger (Desktop) */}
          <div style={{ flex: 1, maxWidth: 360, display: 'flex', justifyContent: 'center' }} className="header-search-container">
            <button
              type="button"
              className="header-search-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search study materials"
              title="Search materials (Ctrl+K or /)"
              id="header-search-trigger-btn"
              style={{ width: '100%' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="header-search-placeholder">Search materials, subjects…</span>
              <kbd className="header-search-kbd">⌘K</kbd>
            </button>
          </div>

          {/* Right: Navigation Links & Mobile Toggles */}
          <nav
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            aria-label="Main navigation"
          >
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon mobile-search-trigger-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search study materials"
              id="mobile-header-search-btn"
              style={{ color: 'var(--color-text-2)', display: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--fw-medium)',
                    textDecoration: 'none',
                    color: isActive(to) ? 'var(--color-accent)' : 'var(--color-text-2)',
                    background: isActive(to) ? 'var(--color-accent-bg)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to={`${ADMIN_BASE}/dashboard`}
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--fw-semibold)',
                    textDecoration: 'none',
                    color: 'var(--color-accent)',
                    background: 'var(--color-accent-muted)',
                    border: '1px solid var(--color-accent-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    marginLeft: 'var(--space-2)',
                  }}
                  title="Signed in as Admin - Go to Dashboard"
                  id="header-admin-link"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Admin
                </Link>
              )}
            </div>

            {/* Dark/Light Theme Toggle */}
            <ThemeToggle id="header-theme-toggle" />

            {/* Mobile menu toggle button */}
            <button
              onClick={onMenuClick}
              aria-label="Toggle mobile navigation"
              aria-expanded={isMobileMenuOpen}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-2)',
                color: 'var(--color-text-2)',
                borderRadius: 'var(--radius-md)',
              }}
              className="mobile-menu-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {isMobileMenuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile media query tweaks */}
      <style>{`
        @media (max-width: 768px) {
          .header-search-container { display: none !important; }
          .mobile-search-trigger-btn { display: flex !important; }
          .desktop-nav-links { display: none !important; }
        }
      `}</style>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
