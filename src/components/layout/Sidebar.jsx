import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { buildTree } from '../../hooks/useSections';
import ThemeToggle from '../ui/ThemeToggle';

// Check if a node contains the currently active section in its sub-tree
function hasActiveDescendant(node, currentId) {
  if (!currentId || !node.children) return false;
  return node.children.some(
    (child) => child.id === currentId || hasActiveDescendant(child, currentId)
  );
}

// Tree node component with toggleable expansion and clean hover/active states
function SidebarNode({ node, depth = 0, currentSectionId, onNavigate }) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isSelfActive = currentSectionId === node.id;
  const isChildActive = hasActiveDescendant(node, currentSectionId);

  // Expand by default if root level or contains active section
  const [isExpanded, setIsExpanded] = useState(() => depth === 0 || isSelfActive || isChildActive);

  // Auto-expand whenever active section changes into this branch
  useEffect(() => {
    if (isSelfActive || isChildActive) {
      setIsExpanded(true);
    }
  }, [isSelfActive, isChildActive]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded((v) => !v);
  };

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <li className="sidebar-node-item">
      <div className={`sidebar-node-row${isSelfActive ? ' sidebar-node-row--active' : ''}`}>
        {/* Expand / Collapse Chevron */}
        {hasChildren ? (
          <button
            type="button"
            className={`sidebar-node-toggle${isExpanded ? ' sidebar-node-toggle--expanded' : ''}`}
            onClick={handleToggle}
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
          onClick={handleLinkClick}
          title={node.name}
          id={`sidebar-section-${node.id}`}
        >
          {/* Folder Icon (open vs closed) */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isSelfActive ? 'var(--color-accent)' : 'currentColor'}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: isSelfActive ? 1 : 0.75 }}
          >
            {hasChildren && isExpanded ? (
              /* Open Folder */
              <>
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                <path d="M2 10h20" />
              </>
            ) : (
              /* Closed Folder */
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

  // Root browse link is active when on /browse without a specific sectionId
  const isBrowseRoot = pathname === '/browse';

  return (
    <aside
      className={`sidebar-container${isMobile ? ' sidebar-container--mobile' : ''}`}
      aria-label="Academic Sections Navigation"
    >
      {/* Mobile Drawer Header */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
              Navigation
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
