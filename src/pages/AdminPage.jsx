import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { logoutAdmin } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useSections } from '../hooks/useSections';
import { createSection } from '../services/firebase';
import SectionManager from '../components/admin/SectionManager';
import FileUploader from '../components/admin/FileUploader';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';

const TABS = [
  { id: 'sections', label: 'Sections', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { id: 'upload',   label: 'Upload Files', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> },
];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { sections, tree, loading: sectionsLoading } = useSections();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab,          setActiveTab]          = useState('sections');
  const [selectedSectionId,  setSelectedSectionId]  = useState(null);
  const [mobileNavOpen,      setMobileNavOpen]      = useState(false);

  const handleQuickCreateFolder = async () => {
    const name = window.prompt('Enter new folder/section name:');
    if (!name?.trim()) return;
    try {
      const docRef = await createSection(name.trim(), null, sections.length);
      setSelectedSectionId(docRef.id);
      addToast(`Folder "${name.trim()}" created and selected.`, 'success');
    } catch (err) {
      addToast('Failed to create folder: ' + err.message, 'error');
    }
  };

  if (authLoading) return <Spinner center size="lg" />;

  // Guard: redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/admin-portal-xyz" replace />;
  }

  const handleLogout = async () => {
    await logoutAdmin();
    addToast('Signed out.', 'info');
    navigate('/admin-portal-xyz');
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar${mobileNavOpen ? ' admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar-logo">
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-md)' }}>CybrStudy</h2>
            <span>Admin Panel</span>
          </div>
        </div>

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

            {/* Section picker */}
            <div style={{
              background: 'var(--color-bg-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-2)' }}>
                  Target section:
                </span>
              </div>
              <select
                className="input-field"
                style={{ flex: 1, maxWidth: 400 }}
                value={selectedSectionId ?? ''}
                onChange={(e) => setSelectedSectionId(e.target.value || null)}
                id="section-picker-select"
              >
                <option value="">— Select a section —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.parentId ? `  ↳ ${s.name}` : s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickCreateFolder}
                id="quick-create-folder-btn"
                title="Create a new folder directly"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Folder
              </button>
            </div>

            <FileUploader
              sectionId={selectedSectionId}
              sectionName={selectedSection?.name ?? ''}
            />
          </div>
        )}
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
