import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSections, buildTree } from '../hooks/useSections';
import { useFiles, useAllFiles } from '../hooks/useFiles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { renameSection, deleteFileRecord } from '../services/firebase';
import { deleteFromDrive } from '../services/driveService';
import FileGrid from '../components/files/FileGrid';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

// Recursive breadcrumb builder
function buildBreadcrumbs(sectionId, sections) {
  const crumbs = [];
  let current = sections.find((s) => s.id === sectionId);
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? sections.find((s) => s.id === current.parentId) : null;
  }
  return crumbs;
}

// Get breadcrumb text string
function getBreadcrumbText(sectionId, sections) {
  const crumbs = buildBreadcrumbs(sectionId, sections);
  return crumbs.map((c) => c.name).join(' › ') || 'Root';
}

// Subsection card with optional path display
function SubsectionCard({ node, sections }) {
  const path = sections ? getBreadcrumbText(node.id, sections) : null;

  return (
    <Link
      to={`/browse/${node.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        textDecoration: 'none',
        transition: 'all var(--transition-fast)',
        color: 'var(--color-text)',
      }}
      className="card card--interactive"
      id={`subsection-link-${node.id}`}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {path ? path : `${node.children?.length ?? 0} subfolder${node.children?.length !== 1 ? 's' : ''}`}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </Link>
  );
}

// Modal for renaming folder/section
function RenameFolderModal({ section, onClose }) {
  const [name, setName] = useState(section?.name || '');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === section.name) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await renameSection(section.id, trimmed);
      addToast(`Folder renamed to "${trimmed}"`, 'success');
      onClose();
    } catch (err) {
      addToast('Failed to rename folder: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Rename Folder">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="browse-rename-folder-input">Folder Name</label>
          <input
            id="browse-rename-folder-input"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            placeholder="Enter new folder name…"
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()} id="save-rename-modal-btn">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function BrowsePage() {
  const { sectionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const { sections, tree, loading: sectionsLoading } = useSections();
  const { files: sectionFiles, loading: sectionFilesLoading } = useFiles(sectionId ?? null);
  const { files: allFiles, loading: allFilesLoading } = useAllFiles();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = !!user;

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [searchScope, setSearchScope] = useState('section'); // 'section' | 'all'
  const [filterType,  setFilterType]  = useState('all');    // 'all' | 'pdf' | 'img'
  const [sortBy,      setSortBy]      = useState('newest'); // 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc'
  const [viewMode,    setViewMode]    = useState('grid');   // 'grid' | 'list'
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // Sync search query from URL parameter if updated
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (value.trim()) {
      setSearchParams({ q: value.trim() });
    } else {
      setSearchParams({});
    }
  };

  // Admin delete file
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.name}"? This will also remove it from Google Drive.`)) return;
    try {
      await deleteFromDrive(file.driveFileId).catch(() => {});
      await deleteFileRecord(file.id);
      addToast(`"${file.name}" deleted.`, 'success');
    } catch (err) {
      addToast('Delete failed: ' + err.message, 'error');
    }
  };

  // Determine active files pool depending on whether we are in a section or searching globally
  const activePool = useMemo(() => {
    if (!sectionId || searchScope === 'all') {
      return allFiles;
    }
    return sectionFiles;
  }, [sectionId, searchScope, allFiles, sectionFiles]);

  // Filtered & sorted files
  const filteredFiles = useMemo(() => {
    let result = [...activePool];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((f) => f.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => {
        const nameMatch = (f.name || '').toLowerCase().includes(q);
        const typeMatch = (f.type || '').toLowerCase().includes(q);
        const secName = sections.find((s) => s.id === f.sectionId)?.name || '';
        const secMatch = secName.toLowerCase().includes(q);
        return nameMatch || typeMatch || secMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      }
      if (sortBy === 'oldest') {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'size_desc') {
        return (b.size || 0) - (a.size || 0);
      }
      return 0;
    });

    return result;
  }, [activePool, filterType, searchQuery, sortBy, sections]);

  // Filtered matching sections (across all levels of hierarchy)
  const matchingSections = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return sections.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const breadcrumb = getBreadcrumbText(s.id, sections).toLowerCase();
      return nameMatch || breadcrumb.includes(q);
    });
  }, [sections, searchQuery]);

  // Check if matches exist elsewhere when section search yields 0
  const globalMatchCount = useMemo(() => {
    if (!searchQuery.trim() || !sectionId || searchScope === 'all') return 0;
    const q = searchQuery.toLowerCase().trim();
    return allFiles.filter((f) => (f.name || '').toLowerCase().includes(q)).length;
  }, [searchQuery, sectionId, searchScope, allFiles]);

  if (sectionsLoading || (sectionId && sectionFilesLoading) || (!sectionId && allFilesLoading)) {
    return <Spinner center size="lg" />;
  }

  // =========================================================================
  // ROOT VIEW (/browse with no sectionId)
  // =========================================================================
  if (!sectionId) {
    const isSearching = Boolean(searchQuery.trim());

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            {isSearching ? `Search results for "${searchQuery}"` : 'Browse Materials'}
          </h1>
          <p style={{ color: 'var(--color-text-2)' }}>
            {isSearching
              ? `Found ${filteredFiles.length} material${filteredFiles.length !== 1 ? 's' : ''} and ${matchingSections.length} folder${matchingSections.length !== 1 ? 's' : ''}.`
              : 'Select a folder or subject below to view notes, slides, and study resources.'}
          </p>
        </div>

        {/* Global Search Bar */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 280px' }}>
              <div className="search-bar">
                <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search all notes, PDFs, topics, subjects…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  id="browse-root-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => handleSearchChange('')}
                    aria-label="Clear search"
                    style={{ display: 'flex' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontWeight: 500 }}>
                  Sort:
                </span>
                <select
                  className="input-field"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ fontSize: 'var(--text-xs)', padding: '6px 10px', height: 36, minWidth: 140 }}
                  id="browse-root-sort-select"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name (A–Z)</option>
                  <option value="name_desc">Name (Z–A)</option>
                  <option value="size_desc">Size (Largest)</option>
                </select>

                <div className="view-toggle" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={`view-toggle-btn${viewMode === 'grid' ? ' view-toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Chips when searching */}
          {isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip${filterType === 'all' ? ' chip--active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All materials ({allFiles.length})
                </button>
                <button
                  type="button"
                  className={`chip${filterType === 'pdf' ? ' chip--active' : ''}`}
                  onClick={() => setFilterType('pdf')}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-error)' }} />
                  PDFs ({allFiles.filter(f => f.type === 'pdf').length})
                </button>
                <button
                  type="button"
                  className={`chip${filterType === 'img' ? ' chip--active' : ''}`}
                  onClick={() => setFilterType('img')}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                  Images ({allFiles.filter(f => f.type === 'img').length})
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { handleSearchChange(''); setFilterType('all'); }}
                style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
              >
                Reset search
              </button>
            </div>
          )}
        </div>

        {/* Not searching: Default Tree of Sections */}
        {!isSearching && (
          <div>
            {tree.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3>No sections yet</h3>
                <p style={{ fontSize: 'var(--text-sm)' }}>Content will appear here once uploaded by the admin.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                {tree.map((node) => <SubsectionCard key={node.id} node={node} />)}
              </div>
            )}
          </div>
        )}

        {/* Searching: Show Matching Folders and Matching Files */}
        {isSearching && (
          <div>
            {matchingSections.length === 0 && filteredFiles.length === 0 ? (
              <div className="empty-state animate-fade-in">
                <div className="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <h3>No matches found</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                  We couldn't find any materials or folders matching "{searchQuery}".
                </p>
                <button className="btn btn-secondary btn-sm" onClick={() => handleSearchChange('')} style={{ marginTop: 'var(--space-3)' }}>
                  Clear search
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {/* Matching Folders */}
                {matchingSections.length > 0 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', color: 'var(--color-text-2)' }}>
                      Matching Folders ({matchingSections.length})
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
                      {matchingSections.map((sec) => (
                        <SubsectionCard key={sec.id} node={sec} sections={sections} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Materials */}
                {filteredFiles.length > 0 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', color: 'var(--color-text-2)' }}>
                      Matching Study Materials ({filteredFiles.length})
                    </h2>
                    <FileGrid
                      files={filteredFiles}
                      loading={allFilesLoading}
                      onDelete={handleDeleteFile}
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // SECTION VIEW (/browse/:sectionId)
  // =========================================================================
  const currentSection = sections.find((s) => s.id === sectionId);
  if (!currentSection) {
    return (
      <div className="empty-state animate-fade-in">
        <h3>Section not found</h3>
        <Link to="/browse" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>
          Back to Browse
        </Link>
      </div>
    );
  }

  const breadcrumbs = buildBreadcrumbs(sectionId, sections);
  const sectionTree = buildTree(sections);
  const currentNode = findNode(sectionTree, sectionId);
  const children    = currentNode?.children ?? [];

  // Filter child subsections by query
  const filteredChildren = children.filter((child) => {
    if (!searchQuery.trim()) return true;
    return child.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="animate-fade-in">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-6)' }}>
        <ol style={{ listStyle: 'none', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-1)', padding: 0 }}>
          <li>
            <Link to="/browse" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', textDecoration: 'none' }}>
              Browse
            </Link>
          </li>
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {i === breadcrumbs.length - 1 ? (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', fontWeight: 500 }}>
                  {crumb.name}
                </span>
              ) : (
                <Link to={`/browse/${crumb.id}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', textDecoration: 'none' }}>
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Page header with Admin Rename folder action */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: 0 }}>
              {currentSection.name}
            </h1>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setRenameModalOpen(true)}
                title="Rename this folder"
                aria-label={`Rename folder ${currentSection.name}`}
                id="browse-rename-folder-btn"
                style={{ color: 'var(--color-accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginTop: 'var(--space-1)' }}>
            {sectionFiles.length} material{sectionFiles.length !== 1 ? 's' : ''} {children.length > 0 ? `· ${children.length} subfolder${children.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        {/* View toggle (grid / list) */}
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'grid' ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
            id="view-toggle-grid"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
            aria-label="List view"
            id="view-toggle-list"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Subsections if any and not searching globally */}
      {searchScope === 'section' && children.length > 0 && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', color: 'var(--color-text-2)' }}>
            Subsections {children.length > 0 && `(${children.length})`}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            {filteredChildren.map((child) => <SubsectionCard key={child.id} node={child} />)}
          </div>
          <div className="divider" style={{ marginBlock: 'var(--space-6)' }} />
        </div>
      )}

      {/* Search, Filter, Sort, and Scope Bar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ flex: '1 1 260px' }}>
            <div className="search-bar">
              <svg className="search-bar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="input-field"
                placeholder={searchScope === 'section' ? `Search inside ${currentSection.name}…` : 'Search across all folders…'}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                id="section-files-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                  style={{ display: 'flex' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Scope Selector: This Section vs All Sections */}
          <div className="scope-switch" role="group" aria-label="Search scope">
            <button
              type="button"
              className={`scope-switch-btn${searchScope === 'section' ? ' scope-switch-btn--active' : ''}`}
              onClick={() => setSearchScope('section')}
              title="Search only this folder"
            >
              This folder
            </button>
            <button
              type="button"
              className={`scope-switch-btn${searchScope === 'all' ? ' scope-switch-btn--active' : ''}`}
              onClick={() => setSearchScope('all')}
              title="Search across all academic folders"
            >
              All folders
            </button>
          </div>

          {/* Sort dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontWeight: 500 }}>
              Sort:
            </span>
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: 'var(--text-xs)', padding: '6px 10px', height: 36, minWidth: 130 }}
              id="file-sort-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
              <option value="size_desc">Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${filterType === 'all' ? ' chip--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({activePool.length})
            </button>
            <button
              type="button"
              className={`chip${filterType === 'pdf' ? ' chip--active' : ''}`}
              onClick={() => setFilterType('pdf')}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-error)' }} />
              PDFs ({activePool.filter(f => f.type === 'pdf').length})
            </button>
            <button
              type="button"
              className={`chip${filterType === 'img' ? ' chip--active' : ''}`}
              onClick={() => setFilterType('img')}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
              Images ({activePool.filter(f => f.type === 'img').length})
            </button>
          </div>

          {(searchQuery || filterType !== 'all' || searchScope !== 'section') && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { handleSearchChange(''); setFilterType('all'); setSearchScope('section'); }}
              style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Helpful callout if 0 matches in this folder but matches exist elsewhere */}
      {searchScope === 'section' && searchQuery.trim() && filteredFiles.length === 0 && globalMatchCount > 0 && (
        <div
          style={{
            background: 'var(--color-accent-bg)',
            border: '1px solid var(--color-accent-muted)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4) var(--space-5)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', margin: 0 }}>
                Found {globalMatchCount} matching material{globalMatchCount !== 1 ? 's' : ''} in other folders
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', margin: 0 }}>
                "{searchQuery}" doesn't exist in {currentSection.name}, but was found elsewhere.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setSearchScope('all')}
          >
            Search Everywhere
          </button>
        </div>
      )}

      {/* Files List / Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--color-text-2)', margin: 0 }}>
            {searchScope === 'all' ? 'Materials (All Folders)' : 'Materials'}
            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--color-text-3)', marginLeft: 'var(--space-2)' }}>
              ({filteredFiles.length}{filteredFiles.length !== activePool.length ? ` of ${activePool.length}` : ''})
            </span>
          </h2>
        </div>

        {activePool.length > 0 && filteredFiles.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h3>No materials match your filter</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
              Try searching with broader terms or clear your active filters.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { handleSearchChange(''); setFilterType('all'); }}
              >
                Clear filters
              </button>
              {searchScope === 'section' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setSearchScope('all')}
                >
                  Search Everywhere
                </button>
              )}
            </div>
          </div>
        ) : (
          <FileGrid
            files={filteredFiles}
            loading={searchScope === 'all' ? allFilesLoading : sectionFilesLoading}
            onDelete={handleDeleteFile}
            isAdmin={isAdmin}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* Rename folder modal */}
      {renameModalOpen && (
        <RenameFolderModal
          section={currentSection}
          onClose={() => setRenameModalOpen(false)}
        />
      )}
    </div>
  );
}

function findNode(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children ?? [], id);
    if (found) return found;
  }
  return null;
}
