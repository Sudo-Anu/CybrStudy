/** Format bytes to human-readable */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || bytes < 0 || isNaN(bytes)) return '';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  if (i < 0) return `${bytes} B`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

/** Detect file type from MIME type or extension */
export function getFileType(mimeType = '', name = '') {
  if (mimeType.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf';
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) return 'image';
  return 'other';
}

/** Format a Firestore timestamp or Date to relative string */
export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Truncate a string to maxLen characters */
export function truncate(str, maxLen = 40) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

