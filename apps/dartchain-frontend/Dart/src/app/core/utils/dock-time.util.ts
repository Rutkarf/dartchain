export function formatDockRelativeTime(value?: number | null): string {
  if (!value) {
    return '';
  }

  const ts = value > 1_000_000_000_000 ? value : value * 1000;
  const diffMs = Date.now() - ts;

  if (diffMs < 5_000) {
    return "à l'instant";
  }
  if (diffMs < 60_000) {
    return `il y a ${Math.floor(diffMs / 1000)} s`;
  }
  if (diffMs < 3_600_000) {
    return `il y a ${Math.floor(diffMs / 60_000)} min`;
  }

  return `il y a ${Math.floor(diffMs / 3_600_000)} h`;
}

export function shortDockHash(value?: string | null, head = 8, tail = 4): string {
  if (!value) {
    return '—';
  }

  return value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;
}
