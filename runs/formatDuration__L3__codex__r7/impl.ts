export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return "–";
  }

  if (ms < 1000) {
    return `${String(ms)}ms`;
  }

  if (ms < 10000) {
    return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;
  }

  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms - minutes * 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
