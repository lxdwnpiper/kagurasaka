/**
 * Base-path helper for a GitHub Pages project site.
 * Every internal href/src/assets URL must go through this, otherwise
 * links and assets 404 under `/kagurasaka/` in production.
 */

/** Normalised site base, e.g. `/kagurasaka` (no trailing slash, `''` when unset). */
export const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

/**
 * Prefix an absolute site path with the deployment base, without doubling slashes.
 * withBase('/research') -> '/kagurasaka/research'
 * withBase('/')         -> '/kagurasaka/'
 */
export function withBase(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!BASE) return p;
  if (p === '/') return `${BASE}/`;
  return `${BASE}${p}`;
}

/** Absolute URL for canonical / OG tags. Falls back to a root-relative path. */
export function absoluteUrl(path = '/'): string {
  const site = import.meta.env.SITE;
  return site ? new URL(withBase(path), site).href : withBase(path);
}
