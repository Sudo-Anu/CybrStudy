import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSections } from '../../hooks/useSections';
import { useAllFiles } from '../../hooks/useFiles';
import { formatBytes } from '../../utils/helpers';
import MediaPreview from '../files/MediaPreview';

// Helper to highlight matching text
function HighlightMatch({ text, query }) {
  if (!query?.trim() || !text) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return <>{text}</>;

  const before = text.slice(0, index);
  const match  = text.slice(index, index + q.length);
  const after  = text.slice(index + q.length);

  return (
    <>
      {before}
      <span className="search-highlight">{match}</span>
      <HighlightMatch text={after} query={query} />
    </>
  );
}

// Build breadcrumb string for a section
function getSectionBreadcrumb(sectionId, sections) {
  const parts = [];
  const visited = new Set();
  let curr = sections.find((s) => s.id === sectionId);
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    parts.unshift(curr.name);
    curr = curr.parentId ? sections.find((s) => s.id === curr.parentId) : null;
  }
  return parts.join(' › ') || 'Root';
}

export default function SearchModal({ isOpen, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'files' | 'sections'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { sections } = useSections();
  const { files: allFiles } = useAllFiles();

  // Reset or focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  // Handle global Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewFile) {
          setPreviewFile(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, previewFile, onClose]);

  // Search filtering
  const { matchingFiles, matchingSections, combinedResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { matchingFiles: [], matchingSections: [], combinedResults: [] };
    }

    // 1. Match files
    const mFiles = allFiles.filter((file) => {
      const nameMatch = (file.name || '').toLowerCase().includes(q);
      const typeMatch = (file.type || '').toLowerCase().includes(q);
      const secName = sections.find((s) => s.id === file.sectionId)?.name || '';
      const secMatch = secName.toLowerCase().includes(q);
      return nameMatch || typeMatch || secMatch;
    });

    // 2. Match sections (all levels)
    const mSections = sections.filter((sec) => {
      const nameMatch = (sec.name || '').toLowerCase().includes(q);
      const breadcrumb = getSectionBreadcrumb(sec.id, sections).toLowerCase();
      return nameMatch || breadcrumb.includes(q);
    });

    // 3. Combined items for keyboard navigation
    let combined = [];
    if (activeTab === 'all') {
      combined = [
        ...mSections.map((s) => ({ type: 'section', data: s })),
        ...mFiles.map((f) => ({ type: 'file', data: f })),
      ];
    } else if (activeTab === 'files') {
      combined = mFiles.map((f) => ({ type: 'file', data: f }));
    } else if (activeTab === 'sections') {
      combined = mSections.map((s) => ({ type: 'section', data: s }));
    }

    return {
      matchingFiles: mFiles,
      matchingSections: mSections,
      combinedResults: combined,
    };
  }, [query, allFiles, sections, activeTab]);

  // Keyboard navigation through results
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (combinedResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % (combinedResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedResults.length > 0) {
        const item = combinedResults[selectedIndex] || combinedResults[0];
        handleSelectItem(item);
      }
    }
  };

  const handleSelectItem = (item) => {
    if (!item) return;
    if (item.type === 'section') {
      navigate(`/browse/${item.data.id}`);
      onClose();
    } else if (item.type === 'file') {
      setPreviewFile(item.data);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="search-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Search study materials"
      >
        <div
          className="search-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="search-modal-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="search-modal-input"
              placeholder="Search all notes, PDFs, topics, subjects…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleInputKeyDown}
              id="global-search-palette-input"
            />
            {query ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            ) : (
              <kbd className="header-search-kbd" style={{ fontSize: 11 }}>ESC</kbd>
            )}
          </div>

          {/* Filter Tabs if query present */}
          {query.trim() && (
            <div className="search-modal-tabs">
              <button
                type="button"
                className={`search-modal-tab${activeTab === 'all' ? ' search-modal-tab--active' : ''}`}
                onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
              >
                All Results ({matchingFiles.length + matchingSections.length})
              </button>
              <button
                type="button"
                className={`search-modal-tab${activeTab === 'files' ? ' search-modal-tab--active' : ''}`}
                onClick={() => { setActiveTab('files'); setSelectedIndex(0); }}
              >
                Materials ({matchingFiles.length})
              </button>
              <button
                type="button"
                className={`search-modal-tab${activeTab === 'sections' ? ' search-modal-tab--active' : ''}`}
                onClick={() => { setActiveTab('sections'); setSelectedIndex(0); }}
              >
                Folders ({matchingSections.length})
              </button>
            </div>
          )}

          {/* Results List */}
          <div className="search-modal-body">
            {!query.trim() ? (
              // Empty search state with suggestions
              <div style={{ padding: 'var(--space-4) var(--space-3)' }}>
                <p className="search-modal-section-title" style={{ paddingLeft: 0 }}>
                  Academic Folders
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'var(--space-2)' }}>
                  {sections.slice(0, 5).map((sec) => (
                    <div
                      key={sec.id}
                      className="search-modal-item"
                      onClick={() => { navigate(`/browse/${sec.id}`); onClose(); }}
                    >
                      <div className="search-modal-item-icon" style={{ background: 'var(--color-accent-muted)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div className="search-modal-item-meta">
                        <span className="search-modal-item-title">{sec.name}</span>
                        <span className="search-modal-item-sub">{getSectionBreadcrumb(sec.id, sections)}</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                    💡 <strong>Search Tip:</strong> Type any subject code, unit title, topic keyword, or filename (e.g. <em>Calculus</em>, <em>Network</em>, or <em>.pdf</em>).
                  </p>
                </div>
              </div>
            ) : combinedResults.length === 0 ? (
              // No results
              <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--color-bg-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', marginBottom: 'var(--space-1)' }}>
                  No matches for "{query}"
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                  Check the spelling or try searching for a broader term.
                </p>
              </div>
            ) : (
              // Matching results
              <div>
                {/* Sections / Folders Group */}
                {(activeTab === 'all' || activeTab === 'sections') && matchingSections.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="search-modal-section-title">
                      Folders ({matchingSections.length})
                    </div>
                    {matchingSections.map((sec, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={sec.id}
                          className={`search-modal-item${isSelected ? ' search-modal-item--selected' : ''}`}
                          onClick={() => { navigate(`/browse/${sec.id}`); onClose(); }}
                        >
                          <div className="search-modal-item-icon" style={{ background: 'var(--color-accent-muted)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                          </div>
                          <div className="search-modal-item-meta">
                            <span className="search-modal-item-title">
                              <HighlightMatch text={sec.name} query={query} />
                            </span>
                            <span className="search-modal-item-sub">
                              {getSectionBreadcrumb(sec.id, sections)}
                            </span>
                          </div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 500 }}>
                            Open Folder →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Materials Group */}
                {(activeTab === 'all' || activeTab === 'files') && matchingFiles.length > 0 && (
                  <div>
                    <div className="search-modal-section-title">
                      Materials ({matchingFiles.length})
                    </div>
                    {matchingFiles.map((file, idx) => {
                      const offset = (activeTab === 'all') ? matchingSections.length : 0;
                      const isSelected = selectedIndex === (offset + idx);
                      const sec = sections.find((s) => s.id === file.sectionId);
                      const isPdf = file.type === 'pdf';

                      return (
                        <div
                          key={file.id}
                          className={`search-modal-item${isSelected ? ' search-modal-item--selected' : ''}`}
                          onClick={() => setPreviewFile(file)}
                        >
                          <div
                            className="search-modal-item-icon"
                            style={{
                              background: isPdf ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
                              color: isPdf ? 'var(--color-error)' : 'var(--color-success)',
                            }}
                          >
                            {isPdf ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                            )}
                          </div>

                          <div className="search-modal-item-meta">
                            <span className="search-modal-item-title">
                              <HighlightMatch text={file.name} query={query} />
                            </span>
                            <span className="search-modal-item-sub">
                              {sec ? getSectionBreadcrumb(sec.id, sections) : 'General'} {file.size ? `· ${formatBytes(file.size)}` : ''}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                              style={{ padding: '3px 8px', fontSize: 'var(--text-xs)' }}
                            >
                              Preview
                            </button>
                            <a
                              href={file.driveDownloadUrl || (file.driveFileId ? `https://drive.google.com/uc?export=download&id=${file.driveFileId}` : '#')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => e.stopPropagation()}
                              style={{ padding: '3px 8px', fontSize: 'var(--text-xs)' }}
                              title="Download"
                            >
                              ↓
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer with Shortcuts */}
          <div className="search-modal-footer">
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
              <span><kbd>↵</kbd> to open</span>
              <span><kbd>ESC</kbd> to close</span>
            </div>
            <span>{allFiles.length} materials total</span>
          </div>
        </div>
      </div>

      {/* Active File Preview if clicked */}
      {previewFile && (
        <MediaPreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
