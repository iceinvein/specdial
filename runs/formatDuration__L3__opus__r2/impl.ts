export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "–";
  if (ms < 1000) return `${String(ms)}ms`;
  if (ms < 10000) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  // ms % 60000 is exact, so whole minutes and the remainder don't pick up float error.
  const remainder = ms % 60000;
  const minutes = (ms - remainder) / 60000;
  return `${minutes}m ${Math.round(remainder / 1000)}s`;
}
