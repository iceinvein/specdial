export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const suffix = extension.replace(/^\./, "");

  return `${name || "resume"}.${suffix}`;
}
