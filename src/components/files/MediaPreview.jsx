import { useEffect, useState, useRef } from 'react';
import { getDriveEmbedUrl } from '../../services/driveService';
import { formatBytes } from '../../utils/helpers';
import Spinner from '../ui/Spinner';

export default function MediaPreview({ file, onClose }) {
  const isImage = file?.type === 'image';
  const isPdf   = file?.type === 'pdf';

  // Image zoom and rotation state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgSrcIdx, setImgSrcIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  const scrollAreaRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!file) return null;

  const embedUrl = getDriveEmbedUrl(file.driveFileId);
  const downloadUrl = file.driveDownloadUrl || `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
  const driveViewUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`;

  // High-res image sources with cascading fallbacks
  const imageSources = [
    `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w2500`,
    `https://lh3.googleusercontent.com/d/${file.driveFileId}`,
    `https://drive.google.com/uc?export=view&id=${file.driveFileId}`,
  ];

  const currentImgSrc = imageSources[imgSrcIdx] || imageSources[0];

  const handleImageError = () => {
    if (imgSrcIdx < imageSources.length - 1) {
      setImgSrcIdx((i) => i + 1);
    } else {
      setImgFailed(true);
      setImgLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.5, +(z + 0.35).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.6, +(z - 0.35).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleDoubleTap = () => {
    setZoom((z) => (z > 1 ? 1 : 2));
  };

  return (
    <div
      className="preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${file.name}`}
    >
      {/* Top Toolbar */}
      <div className="preview-toolbar">
        {/* Left: Badge, Title & Size */}
        <div className="preview-title-group">
          <span className={isPdf ? 'badge badge-pdf' : 'badge badge-img'}>
            {isPdf ? 'PDF' : 'IMG'}
          </span>
          <h2 className="preview-title" title={file.name}>
            {file.name}
          </h2>
          {file.size && (
            <span className="preview-file-size" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', flexShrink: 0 }}>
              ({formatBytes(file.size)})
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="preview-toolbar-actions">
          {/* Popout / Fullscreen Button */}
          <a
            href={isPdf ? embedUrl : driveViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            title="Open in full standalone tab"
            aria-label="Open full screen in new tab"
            id="preview-popout-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span className="preview-btn-text">Full Screen</span>
          </a>

          {/* Download button */}
          <a
            href={downloadUrl}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            title="Download file"
            aria-label="Download file"
            id="preview-download-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="preview-btn-text">Download</span>
          </a>

          {/* Close preview button */}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close preview"
            title="Close (Esc)"
            id="preview-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Preview Content Body */}
      <div className="preview-body" onClick={onClose}>
        <div
          className="preview-content-wrapper"
          onClick={(e) => e.stopPropagation()}
        >
          {/* PDF Preview: Edge-to-edge on mobile, perfectly constrained on desktop */}
          {isPdf && (
            <iframe
              src={embedUrl}
              className="preview-pdf-frame"
              title={`Preview: ${file.name}`}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}

          {/* Image Preview: High-res with responsive zoom & pan */}
          {isImage && (
            <div
              className="preview-image-scroll-area"
              ref={scrollAreaRef}
              onDoubleClick={handleDoubleTap}
            >
              {imgLoading && !imgFailed && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Spinner size="lg" />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}>
                    Loading high resolution…
                  </span>
                </div>
              )}

              {imgFailed ? (
                /* Fallback to Drive iframe if direct images are restricted */
                <iframe
                  src={embedUrl}
                  className="preview-pdf-frame"
                  title={`Preview: ${file.name}`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <img
                  src={currentImgSrc}
                  alt={file.name}
                  className="preview-image"
                  onLoad={() => setImgLoading(false)}
                  onError={handleImageError}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    cursor: zoom > 1 ? 'grab' : 'zoom-in',
                    opacity: imgLoading ? 0 : 1,
                  }}
                  id="preview-active-image"
                />
              )}

              {/* Floating Zoom & Orientation Controls for Images */}
              {!imgFailed && (
                <div className="preview-zoom-bar" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="preview-zoom-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    aria-label="Zoom Out"
                    disabled={zoom <= 0.6}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="preview-zoom-label"
                    onClick={handleResetZoom}
                    title="Reset Zoom to 100%"
                    aria-label="Reset Zoom"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {Math.round(zoom * 100)}%
                  </button>

                  <button
                    type="button"
                    className="preview-zoom-btn"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    aria-label="Zoom In"
                    disabled={zoom >= 3.5}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>

                  <div style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 2px' }} />

                  <button
                    type="button"
                    className="preview-zoom-btn"
                    onClick={handleRotate}
                    title="Rotate 90° Clockwise"
                    aria-label="Rotate 90 degrees clockwise"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
