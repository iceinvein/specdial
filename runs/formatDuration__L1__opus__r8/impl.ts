const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–';

  if (Math.round(ms) < SECOND) return `${Math.round(ms)}ms`;

  // Round to the displayed precision before picking a unit, so values near a
  // boundary (e.g. 9990ms, 59600ms) don't render as "10.0s" or "60s".
  if (Math.round(ms / 100) < 100) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;

  const totalSeconds = Math.round(ms / SECOND);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  if (ms < HOUR) {
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}m ${totalSeconds % 60}s`;
  }

  const totalMinutes = Math.round(ms / MINUTE);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}
