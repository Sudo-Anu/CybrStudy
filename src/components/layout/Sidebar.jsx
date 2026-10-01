import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { buildTree } from '../../hooks/useSections';
import { useAllFiles } from '../../hooks/useFiles';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ADMIN_BASE } from '../../utils/constants';
import ThemeToggle from '../ui/ThemeToggle';

// Check if a node contains the currently active section in its sub-tree
function hasActiveDescendant(node, currentId) {
  if (!currentId || !node.children) return false;
  return node.children.some(
    (child) => child.id === currentId || hasActiveDescendant(child, currentId)
  );
}

// Tree node — expansion state is owned by the parent via expandedIds Set
function SidebarNode({ node, depth = 0, currentSectionId, onNavigate, expandedIds, onToggle }) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isSelfActive = currentSectionId === node.id;
  const isExpanded = expandedIds.has(node.id);

  return (
    <li className="sidebar-node-item">
      <div className={`sidebar-node-row${isSelfActive ? ' sidebar-node-row--active' : ''}`}>
        {/* Expand / Collapse Chevron */}
        {hasChildren ? (
          <button
            type="button"
            className={`sidebar-node-toggle${isExpanded ? ' sidebar-node-toggle--expanded' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(node.id); }}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            title={isExpanded ? 'Collapse subfolders' : 'Expand subfolders'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span style={{ width: 20, flexShrink: 0 }} />
        )}

        {/* Folder Link */}
        <Link
          to={`/browse/${node.id}`}
          className={`sidebar-node-link${isSelfActive ? ' sidebar-node-link--active' : ''}`}
          onClick={() => { if (onNavigate) onNavigate(); }}
          title={node.name}
          id={`sidebar-section-${node.id}`}
        >
          {/* Folder Icon (open vs closed) */}
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={isSelfActive ? 'var(--color-accent)' : 'currentColor'}
            strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: isSelfActive ? 1 : 0.75 }}
          >
            {hasChildren && isExpanded ? (
              <>
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                <path d="M2 10h20" />
              </>
            ) : (
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            )}
          </svg>

          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>

          {/* Child count badge */}
          {hasChildren && (
            <span className="sidebar-node-badge" title={`${node.children.length} subfolders`}>
              {node.children.length}
            </span>
          )}
        </Link>
      </div>

      {/* Children branches */}
      {hasChildren && isExpanded && (
        <ul className="sidebar-children-list">
          {node.children.map((child) => (
            <SidebarNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentSectionId={currentSectionId}
              onNavigate={onNavigate}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ sections = [], loading = false, isMobile = false, onClose }) {
  const tree = buildTree(sections);
  const { pathname } = useLocation();
  const { sectionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { addToast } = useToast();
  const { files = [] } = useAllFiles();

  const handleSignOut = async () => {
    try {
      if (isMobile && onClose) onClose();
      if (logout) await logout();
      addToast('Signed out successfully.', 'info');
      navigate('/login');
    } catch (err) {
      addToast('Failed to sign out: ' + err.message, 'error');
    }
  };

  // Compute live resource counts
  const totalFiles = files.length;
  const pdfCount = useMemo(() => files.filter((f) => f.type === 'pdf').length, [files]);
  const imgCount = useMemo(() => files.filter((f) => f.type === 'img').length, [files]);

  // expandedIds lives here — survives tree re-renders, never reset by React recycling
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Collect all folder IDs that have children for expand/collapse all
  const allParentIds = useMemo(() => {
    const ids = [];
    const collect = (nodes) => {
      for (const node of nodes) {
        if (node.children?.length) {
          ids.push(node.id);
          collect(node.children);
        }
      }
    };
    collect(tree);
    return ids;
  }, [tree]);

  const areAllExpanded = allParentIds.length > 0 && expandedIds.size >= allParentIds.length;

  const handleToggleAll = () => {
    if (areAllExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(allParentIds));
    }
  };

  // When active section changes, expand all its ancestors automatically
  useEffect(() => {
    if (!sectionId || tree.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const expandAncestors = (nodes) => {
        for (const node of nodes) {
          if (node.id === sectionId || hasActiveDescendant(node, sectionId)) {
            next.add(node.id);
          }
          if (node.children?.length) expandAncestors(node.children);
        }
      };
      expandAncestors(tree);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, sections]);

  const handleToggle = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isBrowseRoot = pathname === '/browse' && !searchParams.get('type');
  const isPdfActive = pathname === '/browse' && searchParams.get('type') === 'pdf';
  const isImgActive = pathname === '/browse' && searchParams.get('type') === 'img';

  return (
    <aside
      className={`sidebar-container${isMobile ? ' sidebar-container--mobile' : ''}`}
      aria-label="Academic Navigation"
    >
      {/* Mobile Drawer Top Bar (only displayed when inside the mobile slide drawer) */}
      {isMobile && (
        <div className="sidebar-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
              CybrStudy
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            id="mobile-sidebar-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="sidebar-scroll-area">
        {/* Quick Search Trigger */}
        <button
          type="button"
          className="sidebar-search-btn"
          onClick={() => {
            if (isMobile && onClose) onClose();
            window.dispatchEvent(new CustomEvent('open-search-modal'));
          }}
          aria-label="Search study materials"
          id="sidebar-quick-search-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="sidebar-search-label">Quick search…</span>
          <kbd className="sidebar-search-kbd">⌘K</kbd>
        </button>

        {/* Main Navigation Section */}
        <div className="sidebar-group">
          <span className="sidebar-group-heading">Navigation</span>
          <nav className="sidebar-nav-list" aria-label="Main links">
            <Link
              to="/"
              onClick={onClose}
              className={`sidebar-root-link${pathname === '/' ? ' sidebar-root-link--active' : ''}`}
              id="sidebar-nav-home"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="sidebar-link-text">Home</span>
            </Link>

            <Link
              to="/browse"
              onClick={onClose}
              className={`sidebar-root-link${isBrowseRoot ? ' sidebar-root-link--active' : ''}`}
              id="sidebar-nav-browse"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span className="sidebar-link-text">All Materials</span>
              {totalFiles > 0 && (
                <span className="sidebar-node-badge" title={`${totalFiles} total materials`}>
                  {totalFiles}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link
                to={`${ADMIN_BASE}/dashboard`}
                onClick={onClose}
                className={`sidebar-root-link${pathname.includes('/dashboard') ? ' sidebar-root-link--active' : ''}`}
                style={{ color: 'var(--color-accent)' }}
                id="sidebar-nav-admin"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="sidebar-link-text">Admin Panel</span>
                <span className="sidebar-badge-admin">Admin</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Quick Study Resources */}
        <div className="sidebar-group">
          <span className="sidebar-group-heading">Resource Types</span>
          <div className="sidebar-nav-list">
            <Link
              to="/browse?type=pdf"
              onClick={onClose}
              className={`sidebar-root-link${isPdfActive ? ' sidebar-root-link--active' : ''}`}
              id="sidebar-filter-pdf"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="1.75" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="sidebar-link-text">PDF Documents</span>
              {pdfCount > 0 && <span className="sidebar-node-badge">{pdfCount}</span>}
            </Link>

            <Link
              to="/browse?type=img"
              onClick={onClose}
              className={`sidebar-root-link${isImgActive ? ' sidebar-root-link--active' : ''}`}
              id="sidebar-filter-img"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.75" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="sidebar-link-text">Diagrams & Images</span>
              {imgCount > 0 && <span className="sidebar-node-badge">{imgCount}</span>}
            </Link>
          </div>
        </div>

        {/* Academic Folders Section */}
        <div className="sidebar-group sidebar-group--folders">
          <div className="sidebar-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="sidebar-title">Academic Folders</span>
              <span className="sidebar-counter-tag">
                {sections.length}
              </span>
            </div>

            {allParentIds.length > 0 && (
              <button
                type="button"
                className="sidebar-collapse-all-btn"
                onClick={handleToggleAll}
                title={areAllExpanded ? 'Collapse all subfolders' : 'Expand all subfolders'}
                aria-label={areAllExpanded ? 'Collapse all subfolders' : 'Expand all subfolders'}
              >
                {areAllExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>

          {/* Loading Skeletons */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-1) 0' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 32, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                No academic folders created yet.
              </p>
            </div>
          ) : (
            /* Recursive Folder Tree */
            <ul className="sidebar-tree">
              {tree.map((node) => (
                <SidebarNode
                  key={node.id}
                  node={node}
                  depth={0}
                  currentSectionId={sectionId}
                  onNavigate={onClose}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Batch & System Info Card */}
        <div className="sidebar-info-card">
          <div className="sidebar-info-card-header">
            <div className="sidebar-status-dot" aria-hidden="true" />
            <span className="sidebar-info-card-title">CybrStudy • 2026</span>
          </div>
          {user?.email && (
            <p className="sidebar-info-card-email" title={user.email}>
              {user.email}
            </p>
          )}
          <p className="sidebar-info-card-text">
            From Class of 2025 – 2029 • Cyber Security
          </p>
          <div className="sidebar-info-card-footer">
            <span>Drive Sync Active</span>
            <span className="sidebar-info-chip">v1.5.5</span>
          </div>
        </div>
      </div>

      {/* Pinned Bottom Footer with Theme Switcher & Sign Out */}
      <div className="sidebar-footer">
        <ThemeToggle showLabel id="sidebar-theme-toggle" />
        {user ? (
          <button
            type="button"
            className="sidebar-signout-btn"
            onClick={handleSignOut}
            title={`Signed in as ${user.email} — Click to sign out`}
            aria-label="Sign out"
            id="sidebar-signout-btn"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        ) : (
          <span className="sidebar-footer-hint">
            Press <kbd>/</kbd>
          </span>
        )}
      </div>
    </aside>
  );
}
