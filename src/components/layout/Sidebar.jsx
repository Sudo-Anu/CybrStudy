import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { buildTree } from '../../hooks/useSections';
import { useAuth } from '../../context/AuthContext';
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
  const hasChildren   = Boolean(node.children && node.children.length > 0);
  const isSelfActive  = currentSectionId === node.id;
  const isChildActive = hasActiveDescendant(node, currentSectionId);
  const isExpanded    = expandedIds.has(node.id);

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
  const { isAdmin } = useAuth();

  // expandedIds lives here — survives tree re-renders, never reset by React recycling
  const [expandedIds, setExpandedIds] = useState(() => new Set());

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

  const isBrowseRoot = pathname === '/browse';

  return (
    <aside
      className={`sidebar-container${isMobile ? ' sidebar-container--mobile' : ''}`}
      aria-label="Academic Sections Navigation"
    >
      {/* Mobile Drawer Header */}
      {isMobile && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
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

          {/* Mobile Quick Links Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', fontWeight: 600, paddingLeft: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              Menu
            </span>
            <Link
              to="/"
              onClick={onClose}
              className={`sidebar-root-link${pathname === '/' ? ' sidebar-root-link--active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Home</span>
            </Link>
            <Link
              to="/browse"
              onClick={onClose}
              className={`sidebar-root-link${isBrowseRoot ? ' sidebar-root-link--active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Browse All</span>
            </Link>
            {isAdmin && (
              <Link
                to={`${ADMIN_BASE}/dashboard`}
                onClick={onClose}
                className="sidebar-root-link"
                style={{ color: 'var(--color-accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Admin Dashboard</span>
              </Link>
            )}
          </div>
        </>
      )}

      {/* Header Label */}
      <div className="sidebar-header-row">
        <span className="sidebar-title">Academic Folders</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 500 }}>
          {sections.length} {sections.length === 1 ? 'folder' : 'folders'}
        </span>
      </div>

      {/* Quick Root Browse Link */}
      <Link
        to="/browse"
        className={`sidebar-root-link${isBrowseRoot ? ' sidebar-root-link--active' : ''}`}
        onClick={onClose}
        id="sidebar-browse-root-link"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
        <span>All Materials</span>
      </Link>

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 34, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div style={{ padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
            No folders created yet.
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

      {/* Sidebar Footer with Theme Switcher */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontWeight: 500 }}>
            Theme
          </span>
          <ThemeToggle showLabel id="sidebar-theme-toggle" />
        </div>

        <Link
          to="/"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', textDecoration: 'none' }}
          onClick={onClose}
        >
          Home
        </Link>
      </div>
    </aside>
  );
}
