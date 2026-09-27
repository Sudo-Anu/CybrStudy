import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadToDrive, deleteFromDrive } from '../../services/driveService';
import { addFileRecord, deleteFileRecord, renameSection } from '../../services/firebase';
import { useToast } from '../../context/ToastContext';
import { getFileType, formatBytes } from '../../utils/helpers';
import FileGrid from '../files/FileGrid';
import { useFiles } from '../../hooks/useFiles';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
const MAX_FILE_SIZE_MB = 20;

export default function FileUploader({ sectionId, sectionName }) {
  const [uploading,      setUploading]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [dragActive,     setDragActive]     = useState(false);
  const [editingSection, setEditingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState(sectionName || '');
  const [savingSection,  setSavingSection]  = useState(false);

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

  const handleFiles = useCallback(async (fileList) => {
    if (!sectionId) {
      addToast('Select a section first.', 'error');
      return;
    }
    const validFiles = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        addToast(`"${file.name}" is too large (max ${MAX_FILE_SIZE_MB} MB).`, 'error');
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
        addToast(`Upload failed: ${err.message}`, 'error');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
  }, [sectionId, addToast]);

  const handleDelete = useCallback(async (file) => {
    if (!window.confirm(`Delete "${file.name}"? This will also remove it from Google Drive.`)) return;
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
              Upload PDFs or images into this folder.
            </p>
          </div>
        )}
      </div>

      {/* Drop zone */}
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
          onChange={(e) => handleFiles(e.target.files)}
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
            <p>or click to browse · PDF & Images · Max {MAX_FILE_SIZE_MB} MB each</p>
          </>
        )}
      </div>

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
