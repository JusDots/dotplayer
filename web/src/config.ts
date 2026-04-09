const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If API base already points to a /api root (e.g. Firebase function URL ending in /api),
  // avoid duplicating /api in request paths.
  if (API_BASE.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }
  return `${API_BASE}${normalizedPath}`;
};
