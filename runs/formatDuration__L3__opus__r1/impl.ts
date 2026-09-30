export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "–";
  if (ms < 1000) return `${String(ms)}ms`;

  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;

  // Take the remainder with % (exact in floating point) so minutes and
  // remainder always agree, then round only the remainder.
  const remainderMs = ms % 60000;
  const minutes = Math.round((ms - remainderMs) / 60000);
  return `${minutes}m ${Math.round(remainderMs / 1000)}s`;
}
