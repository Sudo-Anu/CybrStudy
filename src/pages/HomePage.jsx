import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSections, buildTree } from '../hooks/useSections';
import { subscribeToAllFiles } from '../services/firebase';
import NotificationBanner from '../components/ui/NotificationBanner';

function SectionCard({ node }) {
  const childCount = countDescendants(node);
  return (
    <Link
      to={`/browse/${node.id}`}
      className="card card--interactive"
      style={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        transition: 'all var(--transition-base)',
      }}
      id={`section-card-${node.id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="badge badge-accent" style={{ fontSize: 'var(--text-xs)' }}>
          {node.children?.length ?? 0} {node.children?.length === 1 ? 'subfolder' : 'subfolders'}
        </span>
      </div>

      <div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          {node.name}
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', lineHeight: 1.5 }}>
          {childCount > 0 ? `${childCount} nested folder${childCount !== 1 ? 's' : ''}` : 'Direct study collection'}
        </p>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-accent)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
        Browse materials
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

function countDescendants(node, visited = new Set()) {
  if (!node || !node.children || visited.has(node.id)) return 0;
  visited.add(node.id);
  let count = node.children.length;
  node.children.forEach((c) => { count += countDescendants(c, visited); });
  return count;
}

export default function HomePage() {
  const { sections, loading: sectionsLoading } = useSections();
  const tree = buildTree(sections);
  const [totalFiles, setTotalFiles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAllFiles((files) => {
      setTotalFiles(files.length);
    });
    return unsub;
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      navigate('/browse');
      return;
    }
    navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-bg-alt) 0%, var(--color-accent-bg) 100%)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'clamp(var(--space-8), 6vw, var(--space-16)) clamp(var(--space-6), 5vw, var(--space-12))',
          marginBottom: 'var(--space-12)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Ambient background blur elements */}
        <div style={{
          position: 'absolute', width: 340, height: 340, borderRadius: '50%',
          background: 'var(--color-accent-muted)', opacity: 0.45,
          top: -120, right: -80, pointerEvents: 'none', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'var(--color-accent-muted)', opacity: 0.35,
          bottom: -90, left: -60, pointerEvents: 'none', filter: 'blur(40px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, marginInline: 'auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <span className="badge badge-new">
              Study Smart 📚
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontWeight: 500 }}>
              Curated Academic Repository
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: 700,
              color: 'var(--color-text)',
              lineHeight: 1.2,
              marginBottom: 'var(--space-4)',
              letterSpacing: '-0.02em',
            }}
          >
            All your study materials, beautifully organised.
          </h1>

          <p
            style={{
              fontSize: 'clamp(var(--text-sm), 2vw, var(--text-md))',
              color: 'var(--color-text-2)',
              maxWidth: 580,
              marginInline: 'auto',
              marginBottom: 'var(--space-8)',
              lineHeight: 1.65,
            }}
          >
            Instant access to notes, syllabi, past questions, and lecture slides. Read PDFs and view diagrams straight inside your browser with zero friction.  - CY B (2025 - 2029)
          </p>

          {/* Quick Hero Search Input */}
          <form
            onSubmit={handleHeroSearch}
            className="hero-search-form"
            style={{
              maxWidth: 540,
              marginInline: 'auto',
              marginBottom: 'var(--space-8)',
              display: 'flex',
              gap: 'var(--space-2)',
              background: 'var(--color-surface)',
              padding: '6px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search subjects, notes, past papers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  paddingLeft: 38,
                  paddingRight: 12,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-sans)',
                }}
                id="hero-search-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" id="hero-search-submit-btn">
              Search
            </button>
          </form>

          {/* Live Stats Row */}
          <div
            className="stats-row"
            style={{
              justifyContent: 'center',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--color-accent-border)',
            }}
          >
            <div className="stat-item" style={{ alignItems: 'center' }}>
              <span className="stat-value">{sections.length}</span>
              <span className="stat-label">Folders & Sections</span>
            </div>
            <div className="stat-divider" style={{ width: 1, height: 32, background: 'var(--color-border)', alignSelf: 'center' }} />
            <div className="stat-item" style={{ alignItems: 'center' }}>
              <span className="stat-value">{totalFiles}</span>
              <span className="stat-label">Study Materials</span>
            </div>
            <div className="stat-divider" style={{ width: 1, height: 32, background: 'var(--color-border)', alignSelf: 'center' }} />
            <div className="stat-item" style={{ alignItems: 'center' }}>
              <span className="stat-value">100%</span>
              <span className="stat-label">In-Browser Preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Banner — shown between hero and Academic Sections */}
      <NotificationBanner />

      {/* Sections Grid Section */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              Academic Sections
            </h2>
            <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Browse folders by semester, department, or topic.
            </p>
          </div>
          <Link to="/browse" className="btn btn-secondary btn-sm" id="home-view-all-btn">
            View All Folders
          </Link>
        </div>

        {sectionsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>No sections yet</h3>
            <p style={{ fontSize: 'var(--text-sm)' }}>Sections will appear here once the administrator adds them.</p>
          </div>
        ) : (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}
            className="animate-fade-in"
          >
            {tree.map((node) => <SectionCard key={node.id} node={node} />)}
          </div>
        )}
      </section>

      {/* Feature Strip */}
      <section
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-10) var(--space-8)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-8)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-accent-muted)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>In-Browser Preview</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Read multi-page PDFs and inspect diagrams directly without filling up your storage.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-accent-muted)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>One-Click Downloads</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Save resources offline whenever you need to prepare for exams or study on the go.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-accent-muted)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>Structured Folders</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Nested sections keep syllabus, notes, and question banks neatly categorized.
          </p>
        </div>
      </section>
    </div>
  );
}
