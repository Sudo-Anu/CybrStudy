// =============================================================
// Google Drive Service — Communicates with the Apps Script Proxy
// =============================================================
// The actual OAuth credentials live ONLY inside Google Apps Script.
// This client only calls the published Web App URL.
// =============================================================

const PROXY_URL = import.meta.env.VITE_GDRIVE_PROXY_URL;

/**
 * Upload a file to Google Drive via the Apps Script proxy.
 * @param {File} file        - The browser File object
 * @param {string} folderId  - Optional Drive folder ID to upload into
 * @param {function} onProgress - Callback (0-100)
 * @returns {Promise<{fileId, viewUrl, downloadUrl, name}>}
 */
export async function uploadToDrive(file, folderId = '', onProgress = () => {}) {
  if (!PROXY_URL) throw new Error('Google Drive proxy URL is not configured.');

  // Read file as base64
  const base64 = await fileToBase64(file);
  onProgress(10);

  const payload = {
    action:   'upload',
    name:     file.name,
    mimeType: file.type,
    data:     base64,
    folderId,
  };

  onProgress(30);

  // NOTE: Do NOT set Content-Type: application/json here.
  // That triggers a CORS preflight OPTIONS request which Apps Script
  // does not handle, causing a NetworkError. Omitting it sends a
  // "simple request" (text/plain) that skips preflight entirely.
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  onProgress(90);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive upload failed: ${text}`);
  }

  const result = await response.json();
  if (result.error) throw new Error(result.error);

  onProgress(100);
  return {
    fileId:      result.fileId,
    viewUrl:     result.viewUrl,
    downloadUrl: result.downloadUrl,
    name:        file.name,
  };
}

/**
 * Delete a file from Google Drive via the proxy.
 * @param {string} fileId - Google Drive file ID
 */
export async function deleteFromDrive(fileId) {
  if (!PROXY_URL) throw new Error('Google Drive proxy URL is not configured.');

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', fileId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive delete failed: ${text}`);
  }

  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result;
}

// ---- Helper ----
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const res = reader.result || '';
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Build an embeddable Google Drive preview URL.
 * Works for both PDFs and images.
 */
export function getDriveEmbedUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Build a direct download URL for a Drive file.
 */
export function getDriveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
