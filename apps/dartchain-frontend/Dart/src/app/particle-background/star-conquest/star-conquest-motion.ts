/** Préférence d’accessibilité — ne change pas le gameplay, seulement le chrome animé. */

export function starConquestPrefersReducedMotion(
  query: { matches: boolean } | null = null
): boolean {
  if (query) return query.matches;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
