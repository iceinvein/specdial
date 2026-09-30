export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "-") || "resume";

  return `${name}.${extension.replace(/^\./, "")}`;
}
