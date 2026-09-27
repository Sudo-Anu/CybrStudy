import { useRef, useState } from 'react';
import MediaPreview from './MediaPreview';
import Modal from '../ui/Modal';
import { renameFile } from '../../services/firebase';
import { useToast } from '../../context/ToastContext';
import { formatBytes, timeAgo } from '../../utils/helpers';

// ---- Icon helpers ----
const IconPdf = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
);
const IconImg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

// ---- Rename Modal ----
function RenameModal({ file, onClose }) {
  const [name, setName] = useState(file.name);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === file.name) { onClose(); return; }
    setSaving(true);
    try {
      await renameFile(file.id, trimmed);
      addToast(`Renamed to "${trimmed}"`, 'success');
      onClose();
    } catch (err) {
      addToast('Rename failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Rename File">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="rename-file-input">File name</label>
          <input
            id="rename-file-input"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            placeholder="Enter a new name…"
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 4 }}>
            This renames the label in CybrStudy. The file on Google Drive is not affected.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()} id="rename-file-submit-btn">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---- File Card (Grid view) ----
function FileCardGrid({ file, onDelete, isAdmin }) {
  const [showPreview, setShowPreview] = useState(false);
  const [showRename, setShowRename]   = useState(false);
  const isPdf = file.type === 'pdf';

  return (
    <>
      <article
        className="file-card animate-fade-in"
        id={`file-card-${file.id}`}
      >
        {/* Top: icon + admin actions */}
        <div className="file-card-top">
          <div className={`file-card-icon file-card-icon--${isPdf ? 'pdf' : 'img'}`}>
            {isPdf ? <IconPdf /> : <IconImg />}
          </div>
          {isAdmin && (
            <div className="file-card-admin-actions">
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setShowRename(true)}
                title="Rename file"
                aria-label={`Rename ${file.name}`}
                id={`rename-btn-${file.id}`}
              >
                <IconEdit />
              </button>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => onDelete(file)}
                title="Delete file"
                aria-label={`Delete ${file.name}`}
                id={`delete-btn-${file.id}`}
                style={{ color: 'var(--color-error)' }}
              >
                <IconTrash />
              </button>
            </div>
          )}
        </div>

        {/* Name & meta */}
        <div className="file-card-meta">
          <h3 className="file-card-name" title={file.name}>{file.name}</h3>
          <div className="file-card-tags">
            <span className={isPdf ? 'badge badge-pdf' : 'badge badge-img'}>
              {isPdf ? 'PDF' : 'Image'}
            </span>
            {file.size && (
              <span className="file-card-info">{formatBytes(file.size)}</span>
            )}
            <span className="file-card-info">{timeAgo(file.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="file-card-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPreview(true)}
            id={`preview-btn-${file.id}`}
            aria-label={`Preview ${file.name}`}
          >
            <IconEye /> Preview
          </button>
          <a
            href={file.driveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            id={`download-btn-${file.id}`}
            aria-label={`Download ${file.name}`}
          >
            <IconDownload /> Download
          </a>
        </div>
      </article>

      {showPreview && <MediaPreview file={file} onClose={() => setShowPreview(false)} />}
      {showRename  && <RenameModal  file={file} onClose={() => setShowRename(false)} />}
    </>
  );
}

// ---- File Row (List view) ----
function FileRowList({ file, onDelete, isAdmin }) {
  const [showPreview, setShowPreview] = useState(false);
  const [showRename, setShowRename]   = useState(false);
  const isPdf = file.type === 'pdf';

  return (
    <>
      <div className="file-row animate-fade-in" id={`file-row-${file.id}`}>
        <div className={`file-row-icon file-card-icon--${isPdf ? 'pdf' : 'img'}`}>
          {isPdf ? <IconPdf /> : <IconImg />}
        </div>
        <div className="file-row-meta">
          <span className="file-row-name" title={file.name}>{file.name}</span>
          <div className="file-card-tags">
            <span className={isPdf ? 'badge badge-pdf' : 'badge badge-img'}>{isPdf ? 'PDF' : 'Image'}</span>
            {file.size && <span className="file-card-info">{formatBytes(file.size)}</span>}
            <span className="file-card-info">{timeAgo(file.createdAt)}</span>
          </div>
        </div>
        <div className="file-row-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPreview(true)} aria-label={`Preview ${file.name}`} id={`preview-btn-${file.id}`}>
            <IconEye /> <span>Preview</span>
          </button>
          <a href={file.driveDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" aria-label={`Download ${file.name}`} id={`download-btn-${file.id}`}>
            <IconDownload /> <span>Download</span>
          </a>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowRename(true)} title="Rename" aria-label={`Rename ${file.name}`} id={`rename-btn-${file.id}`}>
                <IconEdit />
              </button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(file)} title="Delete" aria-label={`Delete ${file.name}`} id={`delete-btn-${file.id}`} style={{ color: 'var(--color-error)' }}>
                <IconTrash />
              </button>
            </>
          )}
        </div>
      </div>
      {showPreview && <MediaPreview file={file} onClose={() => setShowPreview(false)} />}
      {showRename  && <RenameModal  file={file} onClose={() => setShowRename(false)} />}
    </>
  );
}

// ---- Main FileGrid export ----
export default function FileGrid({ files, loading, onDelete, isAdmin = false, viewMode = 'grid' }) {
  if (loading) {
    return viewMode === 'grid' ? (
      <div className="file-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <h3>No files here yet</h3>
        <p style={{ fontSize: 'var(--text-sm)' }}>Files uploaded to this section will appear here.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="file-list">
        {files.map((file) => (
          <FileRowList key={file.id} file={file} onDelete={onDelete} isAdmin={isAdmin} />
        ))}
      </div>
    );
  }

  return (
    <div className="file-grid">
      {files.map((file) => (
        <FileCardGrid key={file.id} file={file} onDelete={onDelete} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
