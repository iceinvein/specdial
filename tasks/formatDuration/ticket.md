Job durations show up as raw millisecond counts in the UI. Add `formatDuration(ms: number | null | undefined): string` that formats a duration as a short human-readable string for display.

Example: `formatDuration(90000)` could show `1m 30s`.
