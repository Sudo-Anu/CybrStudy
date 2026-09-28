// Global constants and configuration values

// Default admin base route is '/login'.
// If a legacy GitHub secret or env var has 'admin-portal-xyz', map it to '/login'.
const raw = (import.meta.env.VITE_ADMIN_ROUTE || '/login').trim();
const normalized = raw.startsWith('/') ? raw : `/${raw}`;
export const ADMIN_BASE = (normalized === '/admin-portal-xyz') ? '/login' : normalized;
