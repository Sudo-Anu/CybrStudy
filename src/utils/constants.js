// Global constants and configuration values

const rawRoute = import.meta.env.VITE_ADMIN_ROUTE || '/login';
export const ADMIN_BASE = rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`;
