import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { logoutAdmin } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useSections } from '../hooks/useSections';
import SectionManager from '../components/admin/SectionManager';
import TargetSectionSelector from '../components/admin/TargetSectionSelector';
import FileUploader from '../components/admin/FileUploader';
import UserManager from '../components/admin/UserManager';
import NotificationManager from '../components/admin/NotificationManager';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';

const TABS = [
  { id: 'sections',      label: 'Sections',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { id: 'upload',        label: 'Upload Files',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> },
  { id: 'notifications', label: 'Notifications', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { id: 'users',         label: 'Users',         icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
];

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { sections, tree, loading: sectionsLoading } = useSections();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab,          setActiveTab]          = useState('sections');
  const [selectedSectionId,  setSelectedSectionId]  = useState(null);
  const [mobileNavOpen,      setMobileNavOpen]      = useState(false);

  if (authLoading) return <Spinner center size="lg" />;

  // Guard: not logged in → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Guard: logged in but NOT an admin → back to main study portal
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = async () => {
    await logoutAdmin();
    addToast('Signed out successfully.', 'info');
    navigate('/login');
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar${mobileNavOpen ? ' admin-sidebar--open' : ''}`}>
        <Link
          to="/"
          className="admin-sidebar-logo"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          title="Go to Homepage"
          id="admin-logo-home-link"
        >
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background var(--transition-fast)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-md)', color: 'var(--color-text)' }}>CybrStudy</h2>
            <span style={{ color: 'var(--color-text-3)' }}>Admin Panel</span>
          </div>
        </Link>

        {/* Navigation tabs */}
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-nav-item${activeTab === tab.id ? ' admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setMobileNavOpen(false); }}
            id={`admin-nav-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* User info & Theme */}
        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
          <ThemeToggle showLabel id="admin-sidebar-theme-toggle" style={{ width: '100%', justifyContent: 'flex-start' }} />
          <button className="admin-nav-item" onClick={handleLogout} id="admin-logout-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-content">
        {/* Mobile header */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-light)',
        }} className="admin-mobile-header">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>Admin Panel</h1>
          <ThemeToggle id="admin-mobile-theme-toggle" style={{ marginLeft: 'auto' }} />
        </div>

        {/* Sections tab */}
        {activeTab === 'sections' && (
          <div>
            <div className="admin-page-header">
              <h1>Manage Sections</h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                Create, rename, or delete sections and subsections. Click a section to select it for file upload.
              </p>
            </div>
            {sectionsLoading ? (
              <Spinner center />
            ) : (
              <SectionManager
                tree={tree}
                onSelectSection={(id) => { setSelectedSectionId(id); setActiveTab('upload'); }}
                selectedSectionId={selectedSectionId}
              />
            )}
          </div>
        )}

        {/* Upload tab */}
        {activeTab === 'upload' && (
          <div>
            <div className="admin-page-header">
              <h1>Upload Files</h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                Upload PDFs or images. Files are stored on Google Drive and linked here.
              </p>
            </div>

            {/* Hierarchical Target Section Selector */}
            <TargetSectionSelector
              sections={sections}
              tree={tree}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onSwitchToSectionsTab={() => setActiveTab('sections')}
            />

            <FileUploader
              sectionId={selectedSectionId}
              sectionName={selectedSection?.name ?? ''}
            />
          </div>
        )}

        {/* Users tab */}
        {activeTab === 'users' && <UserManager />}

        {/* Notifications tab */}
        {activeTab === 'notifications' && <NotificationManager />}
      </div>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'var(--color-overlay-bg)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 99,
          }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
