// =============================================================
// Google Drive Service — Communicates with the Apps Script Proxy
// =============================================================
// The actual OAuth credentials live ONLY inside Google Apps Script.
// This client only calls the published Web App URL.
// =============================================================

const PROXY_URL = import.meta.env.VITE_GDRIVE_PROXY_URL;

/**
 * Safely parse a response from the Google Apps Script Web App proxy.
 * Prevents "JSON.parse: unexpected character at line 1 column 1" when Google returns HTML error pages.
 */
async function parseProxyResponse(response, context = 'Drive request') {
  const rawText = await response.text();

  if (!rawText || !rawText.trim()) {
    throw new Error(`${context} failed: Empty response from Google Drive proxy. The file may exceed server payload limits.`);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    // Detect Google HTML error pages (e.g. 413 Payload Too Large, 504 Timeout, memory quota)
    const isHtml = /<!DOCTYPE|<html|<body/i.test(rawText);
    if (isHtml) {
      const lower = rawText.toLowerCase();
      if (lower.includes('exceeded') || lower.includes('too large') || response.status === 413) {
        throw new Error(
          'File is too large for direct web script upload. Please use the "Link Google Drive File" tab to add files of any size without transfer limits.'
        );
      }
      if (lower.includes('timed out') || lower.includes('time out') || response.status === 504) {
        throw new Error(
          'Upload timed out on Google servers. For large or slow uploads, please use the "Link Google Drive File" tab.'
        );
      }
      throw new Error(
        `Google Drive proxy returned an HTML error (HTTP ${response.status}). The file may be too large for direct web script upload. Please use the "Link Google Drive File" option.`
      );
    }
    throw new Error(`${context} failed: Invalid response from Google Drive proxy (${rawText.slice(0, 120)}).`);
  }

  if (!response.ok) {
    throw new Error(result.error || `${context} failed with HTTP ${response.status}`);
  }

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

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
  onProgress(15);

  const payload = {
    action:   'upload',
    name:     file.name,
    mimeType: file.type,
    data:     base64,
    folderId,
  };

  onProgress(35);

  // NOTE: Do NOT set Content-Type: application/json here.
  // That triggers a CORS preflight OPTIONS request which Apps Script
  // does not handle, causing a NetworkError. Omitting it sends a
  // "simple request" (text/plain) that skips preflight entirely.
  let response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    throw new Error(
      `Network error connecting to Google Drive proxy: ${netErr.message}. If the file is large, consider using "Link Google Drive File".`
    );
  }

  onProgress(85);

  const result = await parseProxyResponse(response, 'Drive upload');
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

  return parseProxyResponse(response, 'Drive delete');
}

/**
 * Query metadata for an existing Google Drive file via the proxy.
 * @param {string} fileId - Google Drive file ID
 */
export async function getDriveFileInfo(fileId) {
  if (!PROXY_URL) throw new Error('Google Drive proxy URL is not configured.');

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'info', fileId }),
  });

  return parseProxyResponse(response, 'Drive file info');
}

/**
 * Extract a clean Google Drive file ID from any URL or string.
 * Supports:
 * - https://drive.google.com/file/d/1A2B3C.../view?usp=sharing
 * - https://drive.google.com/open?id=1A2B3C...
 * - https://drive.google.com/uc?id=1A2B3C...
 * - Raw alphanumeric ID string (20+ chars)
 */
export function extractDriveFileId(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // /file/d/<fileId>
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // ?id=<fileId> or &id=<fileId>
  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Direct raw file ID (standard Google Drive IDs are 25-45 base64url characters)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(str)) {
    return str;
  }

  return null;
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

