import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <div className="site-footer-brand-name">CybrStudy</div>
            <div className="site-footer-copy">© {year} · Study Smart</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }} aria-label="Footer navigation">
          <Link to="/"       style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', textDecoration: 'none' }}>Home</Link>
          <Link to="/browse" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', textDecoration: 'none' }}>Browse</Link>
        </nav>
      </div>
    </footer>
  );
}
