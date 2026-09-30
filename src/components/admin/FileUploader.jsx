import { useCallback, useEffect, useRef, useState } from 'react';
import {
  uploadToDrive,
  deleteFromDrive,
  extractDriveFileId,
  getDriveEmbedUrl,
  getDriveDownloadUrl,
  getDriveFileInfo,
} from '../../services/driveService';
import { addFileRecord, deleteFileRecord, renameSection } from '../../services/firebase';
import { useToast } from '../../context/ToastContext';
import { getFileType, formatBytes } from '../../utils/helpers';
import FileGrid from '../files/FileGrid';
import { useFiles } from '../../hooks/useFiles';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
const MAX_DIRECT_UPLOAD_MB = 20;

function parseHumanSize(input) {
  if (!input) return 0;
  if (typeof input === 'number') return input;
  const str = String(input).trim();
  const match = str.match(/^([0-9.]+)\s*(b|kb|mb|gb)?$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = (match[2] || 'mb').toLowerCase();
  if (unit === 'b') return Math.round(val);
  if (unit === 'kb') return Math.round(val * 1024);
  if (unit === 'mb') return Math.round(val * 1024 * 1024);
  if (unit === 'gb') return Math.round(val * 1024 * 1024 * 1024);
  return Math.round(val * 1024 * 1024);
}

export default function FileUploader({ sectionId, sectionName }) {
  const [mode,            setMode]            = useState('upload'); // 'upload' | 'drive_link'
  const [uploading,       setUploading]       = useState(false);
  const [progress,        setProgress]        = useState(0);
  const [dragActive,      setDragActive]      = useState(false);
  const [editingSection,  setEditingSection]  = useState(false);
  const [newSectionName,  setNewSectionName]  = useState(sectionName || '');
  const [savingSection,   setSavingSection]   = useState(false);

  // Link Google Drive file form state
  const [linkInput,       setLinkInput]       = useState('');
  const [linkName,        setLinkName]        = useState('');
  const [linkType,        setLinkType]        = useState('pdf');
  const [linkSize,        setLinkSize]        = useState('');
  const [linkSubmitting,  setLinkSubmitting]  = useState(false);
  const [fetchingInfo,    setFetchingInfo]    = useState(false);

  const inputRef = useRef(null);
  const { addToast } = useToast();
  const { files, loading } = useFiles(sectionId);

  useEffect(() => {
    setNewSectionName(sectionName || '');
    setEditingSection(false);
  }, [sectionId, sectionName]);

  const handleRenameSection = async (e) => {
    e?.preventDefault();
    const trimmed = newSectionName.trim();
    if (!trimmed || trimmed === sectionName) {
      setEditingSection(false);
      return;
    }
    setSavingSection(true);
    try {
      await renameSection(sectionId, trimmed);
      addToast(`Folder renamed to "${trimmed}"`, 'success');
      setEditingSection(false);
    } catch (err) {
      addToast('Failed to rename folder: ' + err.message, 'error');
    } finally {
      setSavingSection(false);
    }
  };

  // Direct device upload handler
  const handleFiles = useCallback(async (fileList) => {
    if (!sectionId) {
      addToast('Select a section first.', 'error');
      return;
    }

    const validFiles = [];
    for (const file of Array.from(fileList)) {
      // If file exceeds direct transfer limit, route to Drive Link mode
      if (file.size > MAX_DIRECT_UPLOAD_MB * 1024 * 1024) {
        addToast(
          `"${file.name}" is ${formatBytes(file.size)}. Files over ${MAX_DIRECT_UPLOAD_MB} MB should be linked via Google Drive.`,
          'warning',
          6000
        );
        setLinkName(file.name);
        setLinkType(getFileType(file.type, file.name));
        setLinkSize(formatBytes(file.size));
        setMode('drive_link');
        continue;
      }

      const type = getFileType(file.type, file.name);
      if (type === 'other') {
        addToast(`"${file.name}" is not a supported file type.`, 'error');
        continue;
      }
      validFiles.push({ file, type });
    }

    for (const { file, type } of validFiles) {
      setUploading(true);
      setProgress(0);
      try {
        const driveResult = await uploadToDrive(file, '', (pct) => setProgress(pct));
        await addFileRecord({
          name:            file.name,
          type,
          sectionId,
          driveFileId:     driveResult.fileId,
          driveViewUrl:    driveResult.viewUrl,
          driveDownloadUrl: driveResult.downloadUrl,
          size:            file.size,
        });
        addToast(`"${file.name}" uploaded successfully.`, 'success');
      } catch (err) {
        addToast(`Upload failed: ${err.message}`, 'error', 6000);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
  }, [sectionId, addToast]);

  // Handler for adding material via Google Drive Link / ID
  const handleAddDriveLink = async (e) => {
    e.preventDefault();
    if (!sectionId) {
      addToast('Select a target section first.', 'error');
      return;
    }

    const cleanId = extractDriveFileId(linkInput);
    if (!cleanId) {
      addToast('Please enter a valid Google Drive share link or File ID.', 'error');
      return;
    }

    const trimmedName = linkName.trim();
    if (!trimmedName) {
      addToast('Please provide a name for this material.', 'error');
      return;
    }

    setLinkSubmitting(true);
    try {
      const parsedSize = parseHumanSize(linkSize);
      await addFileRecord({
        name:             trimmedName,
        type:             linkType,
        sectionId,
        driveFileId:      cleanId,
        driveViewUrl:     getDriveEmbedUrl(cleanId),
        driveDownloadUrl: getDriveDownloadUrl(cleanId),
        size:             parsedSize,
      });

      addToast(`"${trimmedName}" added successfully.`, 'success');
      setLinkInput('');
      setLinkName('');
      setLinkSize('');
    } catch (err) {
      addToast(`Failed to add material: ${err.message}`, 'error');
    } finally {
      setLinkSubmitting(false);
    }
  };

  // Auto-fetch file details from Drive via proxy
  const handleFetchInfo = async () => {
    const cleanId = extractDriveFileId(linkInput);
    if (!cleanId) {
      addToast('Enter a Google Drive link or ID first.', 'error');
      return;
    }

    setFetchingInfo(true);
    try {
      const info = await getDriveFileInfo(cleanId);
      if (info?.name && !linkName.trim()) {
        setLinkName(info.name);
      }
      if (info?.size && !linkSize) {
        setLinkSize(formatBytes(info.size));
      }
      if (info?.mimeType) {
        setLinkType(getFileType(info.mimeType, info.name));
      }
      addToast('File details retrieved from Drive.', 'success');
    } catch (err) {
      addToast(
        `Could not auto-fetch metadata (${err.message}). You can still enter the name manually.`,
        'info',
        5000
      );
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleDelete = useCallback(async (file) => {
    if (!window.confirm(`Delete "${file.name}"? This will remove it from CybrStudy and trash it from Google Drive.`)) return;
    try {
      // Remove from Drive (best-effort)
      await deleteFromDrive(file.driveFileId).catch(() => {});
      // Remove from Firestore
      await deleteFileRecord(file.id);
      addToast(`"${file.name}" deleted.`, 'success');
    } catch (err) {
      addToast(`Delete failed: ${err.message}`, 'error');
    }
  }, [addToast]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = () => setDragActive(false);

  const cleanExtractedId = extractDriveFileId(linkInput);

  if (!sectionId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>Select a section</h3>
        <p style={{ fontSize: 'var(--text-sm)' }}>Choose a section from the left panel to upload files into it.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Folder Title & In-Place Rename */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        {editingSection ? (
          <form onSubmit={handleRenameSection} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, maxWidth: 500 }}>
            <input
              className="input-field"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingSection(false); }}
              placeholder="Enter folder name…"
              style={{ fontSize: 'var(--text-base)', padding: '6px 12px' }}
              id="rename-folder-input"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingSection || !newSectionName.trim()} id="save-rename-folder-btn">
              {savingSection ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingSection(false); setNewSectionName(sectionName); }}>
              Cancel
            </button>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', margin: 0 }}>
                {sectionName}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => { setNewSectionName(sectionName); setEditingSection(true); }}
                title="Rename this folder"
                aria-label={`Rename folder ${sectionName}`}
                id="edit-folder-name-btn"
                style={{ color: 'var(--color-text-3)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginTop: 'var(--space-1)' }}>
              Add study materials to this folder via device upload or direct Google Drive link.
            </p>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="upload-mode-switcher" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={`upload-mode-btn${mode === 'upload' ? ' upload-mode-btn--active' : ''}`}
          onClick={() => setMode('upload')}
          id="mode-tab-upload"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          Upload from Device
          <span style={{ fontSize: '11px', opacity: 0.75 }}>(&le; {MAX_DIRECT_UPLOAD_MB} MB)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'drive_link'}
          className={`upload-mode-btn${mode === 'drive_link' ? ' upload-mode-btn--active' : ''}`}
          onClick={() => setMode('drive_link')}
          id="mode-tab-drive-link"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Link Google Drive File
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-accent-bg)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-border)',
          }}>
            No Size Limit
          </span>
        </button>
      </div>

      {/* MODE 1: Direct File Drop Zone */}
      {mode === 'upload' && (
        <div
          className={`dropzone${dragActive ? ' dropzone--active' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
          aria-label="File upload drop zone"
          id="file-dropzone"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) {
                handleFiles(e.target.files);
              }
              e.target.value = '';
            }}
            id="file-input"
          />

          {uploading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontWeight: 500 }}>
                  Uploading to Google Drive…
                </span>
              </div>
              <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto' }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                {progress}%
              </p>
            </div>
          ) : (
            <>
              <div className="dropzone-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
              </div>
              <h3>Drop files here</h3>
              <p>or click to browse · PDF & Images · Recommended up to {MAX_DIRECT_UPLOAD_MB} MB each</p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-accent)',
                    fontWeight: 500,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode('drive_link');
                  }}
                >
                  Have larger PDFs (&gt; {MAX_DIRECT_UPLOAD_MB} MB)? Add via Google Drive Link &rarr;
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODE 2: Link Google Drive File (Any size: 25MB, 50MB, 100MB+, 1GB+) */}
      {mode === 'drive_link' && (
        <div className="upload-drive-box animate-fade-in">
          {/* Guide tip banner */}
          <div style={{
            background: 'var(--color-accent-bg)',
            border: '1px solid var(--color-accent-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}>
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>💡</span>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              <strong>Bypass all file size limits:</strong>
              <ol style={{ paddingLeft: 'var(--space-4)', marginTop: 4 }}>
                <li>Upload your large PDF directly to your Google Drive.</li>
                <li>Right-click the file in Google Drive &rarr; <strong>Share</strong> &rarr; ensure General access is set to <strong>"Anyone with the link can view"</strong>.</li>
                <li>Copy the link and paste it below. CybrStudy will handle previewing and downloading automatically!</li>
              </ol>
            </div>
          </div>

          <form onSubmit={handleAddDriveLink} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Drive Link Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="drive-link-input">
                Google Drive Share Link or File ID <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <input
                  id="drive-link-input"
                  className="input-field"
                  placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  required
                  autoFocus
                  style={{ flex: '1 1 200px', minWidth: 0 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleFetchInfo}
                  disabled={fetchingInfo || !cleanExtractedId}
                  title="Auto-fill name & size from Drive"
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {fetchingInfo ? (
                    <>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      Checking…
                    </>
                  ) : (
                    'Auto-fetch Info'
                  )}
                </button>
              </div>

              {cleanExtractedId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
                    Detected File ID: {cleanExtractedId}
                  </span>
                </div>
              )}
            </div>

            {/* File Display Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="drive-link-name">
                Material Name / Label <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                id="drive-link-name"
                className="input-field"
                placeholder="e.g. Unit 3 - Advanced Distributed Systems.pdf"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                required
              />
            </div>

            {/* Type and Size row */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 180px' }}>
                <label className="form-label" htmlFor="drive-link-type">Material Type</label>
                <select
                  id="drive-link-type"
                  className="input-field"
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                >
                  <option value="pdf">PDF Document</option>
                  <option value="image">Image (PNG / JPEG / WebP / SVG)</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: '1 1 180px' }}>
                <label className="form-label" htmlFor="drive-link-size">
                  File Size <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optional display)</span>
                </label>
                <input
                  id="drive-link-size"
                  className="input-field"
                  placeholder="e.g. 45 MB or 120 KB"
                  value={linkSize}
                  onChange={(e) => setLinkSize(e.target.value)}
                />
              </div>
            </div>

            {/* Submit button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setLinkInput('');
                  setLinkName('');
                  setLinkSize('');
                  setMode('upload');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={linkSubmitting || !cleanExtractedId || !linkName.trim()}
                id="submit-drive-link-btn"
              >
                {linkSubmitting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Adding…
                  </>
                ) : (
                  'Add Material'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Files in this section */}
      <div>
        <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', marginBottom: 'var(--space-4)' }}>
          Files in this section
          {files.length > 0 && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', fontFamily: 'var(--font-sans)', fontWeight: 400, marginLeft: 'var(--space-2)' }}>
              ({files.length})
            </span>
          )}
        </h4>
        <FileGrid files={files} loading={loading} onDelete={handleDelete} isAdmin={true} />
      </div>
    </div>
  );
}

