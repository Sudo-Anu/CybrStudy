import { useState, useMemo } from 'react';
import { createSection } from '../../services/firebase';
import { useToast } from '../../context/ToastContext';

/**
 * Flattens the hierarchical section tree using Depth-First Search (DFS)
 * so that children always appear directly underneath their respective parents,
 * with accurate depth indentation and full breadcrumb path resolution.
 */
function flattenTreeHierarchical(tree, allSections = []) {
  const result = [];
  const visited = new Set();

  function traverse(nodes, depth = 0, pathParts = []) {
    for (const node of nodes) {
      if (!node || visited.has(node.id)) continue;
      visited.add(node.id);
      const currentPath = [...pathParts, node.name];
      result.push({
        ...node,
        depth,
        path: currentPath.join(' › '),
        parentPath: pathParts.join(' › '),
        breadcrumbs: currentPath,
        childCount: node.children?.length ?? 0,
      });

      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1, currentPath);
      }
    }
  }

  if (Array.isArray(tree)) {
    traverse(tree);
  }

  // Safety fallback: capture any orphaned or unlinked sections that weren't in the tree
  if (Array.isArray(allSections)) {
    const unvisited = allSections.filter((s) => !visited.has(s.id));
    if (unvisited.length > 0) {
      unvisited.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const node of unvisited) {
        result.push({
          ...node,
          depth: 0,
          path: node.name,
          parentPath: '',
          breadcrumbs: [node.name],
          childCount: 0,
          isOrphan: true,
        });
      }
    }
  }

  return result;
}

export default function TargetSectionSelector({
  sections = [],
  tree = [],
  selectedSectionId = null,
  onSelectSection,
  onSwitchToSectionsTab,
}) {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);

  // Flatten the tree into an organized depth-first list
  const organizedList = useMemo(() => {
    return flattenTreeHierarchical(tree, sections);
  }, [tree, sections]);

  // Find currently selected section details
  const selectedItem = useMemo(() => {
    return organizedList.find((s) => s.id === selectedSectionId) ||
           sections.find((s) => s.id === selectedSectionId) || null;
  }, [organizedList, sections, selectedSectionId]);

  // Filter sections if search term is provided
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return organizedList;
    const term = searchTerm.toLowerCase().trim();
    return organizedList.filter(
      (item) => item.name.toLowerCase().includes(term) || item.path.toLowerCase().includes(term)
    );
  }, [organizedList, searchTerm]);

  // Handle creating a new root folder
  const handleCreateRoot = async () => {
    const name = window.prompt('Enter name for new root section / folder:');
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const rootCount = tree.length;
      const docRef = await createSection(name.trim(), null, rootCount);
      onSelectSection(docRef.id);
      addToast(`Folder "${name.trim()}" created and selected.`, 'success');
    } catch (err) {
      addToast('Failed to create folder: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle creating a subfolder inside the currently selected section
  const handleCreateSubfolder = async () => {
    if (!selectedItem) {
      addToast('Please select a parent folder first.', 'warning');
      return;
    }
    const name = window.prompt(`New subfolder inside "${selectedItem.name}":`);
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const childCount = selectedItem.childCount || 0;
      const docRef = await createSection(name.trim(), selectedItem.id, childCount);
      onSelectSection(docRef.id);
      addToast(`Subfolder "${name.trim()}" created inside "${selectedItem.name}".`, 'success');
    } catch (err) {
      addToast('Failed to create subfolder: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="target-section-box">
      {/* Box Header */}
      <div className="target-section-box-header">
        <div className="target-section-box-title">
          <div className="target-section-icon-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-semibold)', margin: 0, color: 'var(--color-text)' }}>
              Target Section
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', margin: '2px 0 0' }}>
              Choose where uploaded files will be stored and organized
            </p>
          </div>
        </div>

        <div className="target-section-counts">
          <span className="target-section-pill">
            {sections.length} {sections.length === 1 ? 'folder' : 'folders'} total
          </span>
        </div>
      </div>

      {/* Main Selector & Search Row */}
      <div className="target-section-controls-row">
        {/* Hierarchical Dropdown */}
        <div className="target-section-select-col" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <label htmlFor="section-picker-select" className="target-section-label">
            Select Folder Hierarchy:
          </label>
          <div className="target-section-select-wrapper">
            <select
              className="input-field target-section-select"
              value={selectedSectionId ?? ''}
              onChange={(e) => onSelectSection(e.target.value || null)}
              id="section-picker-select"
            >
              <option value="">— Select a folder destination —</option>
              {filteredList.map((item) => {
                // Generate indentation & tree branch indicators for clear hierarchy
                const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(item.depth);
                const prefix = item.depth === 0 ? '📁 ' : `${indent}└── 📂 `;
                const contextHint = item.parentPath ? `  (in ${item.parentPath})` : '';

                return (
                  <option key={item.id} value={item.id}>
                    {prefix}{item.name}{contextHint}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Filter Input */}
        <div className="target-section-search-col" style={{ flex: '0 1 240px', minWidth: 0 }}>
          <label htmlFor="target-section-search-input" className="target-section-label">
            Filter Folders:
          </label>
          <div className="target-section-search-wrapper">
            <svg
              className="target-section-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="target-section-search-input"
              type="text"
              className="input-field target-section-search-input"
              placeholder="Search by name or path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="target-section-search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="target-section-actions-wrapper">
          <label className="target-section-label" style={{ visibility: 'hidden' }}>Actions</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCreateRoot}
              disabled={creating}
              id="quick-create-folder-btn"
              title="Create a new top-level folder"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Root
            </button>

            {selectedItem && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCreateSubfolder}
                disabled={creating}
                id="quick-create-subfolder-btn"
                title={`Create a new subfolder directly inside "${selectedItem.name}"`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                + Subfolder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search result indicator if searching */}
      {searchTerm && (
        <div className="target-section-search-notice">
          Showing <strong>{filteredList.length}</strong> matching {filteredList.length === 1 ? 'folder' : 'folders'} for &ldquo;{searchTerm}&rdquo;
          {filteredList.length === 0 && ' — Try another keyword or clear the search.'}
        </div>
      )}

      {/* Active Target Breadcrumb Banner */}
      {selectedItem ? (
        <div className="target-section-breadcrumb-bar">
          <div className="target-section-breadcrumb-label">
            <span className="target-section-breadcrumb-tag">Active Destination:</span>
            <div className="target-section-crumbs">
              {selectedItem.breadcrumbs ? (
                selectedItem.breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="target-section-crumb-item">
                    {idx === 0 ? '📁 ' : '📂 '}
                    <strong style={{ color: idx === selectedItem.breadcrumbs.length - 1 ? 'var(--color-accent)' : 'inherit' }}>
                      {crumb}
                    </strong>
                    {idx < selectedItem.breadcrumbs.length - 1 && (
                      <span className="target-section-crumb-sep">›</span>
                    )}
                  </span>
                ))
              ) : (
                <span>📁 {selectedItem.name}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {onSwitchToSectionsTab && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={onSwitchToSectionsTab}
                title="View and edit this folder in the Sections tree tab"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                View in Tree
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-xs target-section-clear-btn"
              onClick={() => onSelectSection(null)}
              title="Deselect folder"
              aria-label="Clear selection"
            >
              Clear ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="target-section-empty-notice">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Please select a destination folder above before dropping or linking files.
          </span>
        </div>
      )}
    </div>
  );
}
