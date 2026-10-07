/** Phase 22 — opt-in debug perf via localStorage ou ?perfDebug=1 */
export function isPerfDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('PERF_DEBUG') === '1') {
      return true;
    }
    return new URLSearchParams(window.location.search).get('perfDebug') === '1';
  } catch {
    return false;
  }
}
