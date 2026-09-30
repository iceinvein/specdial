export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "");

  return `${name || "resume"}.${extension.replace(/^\./, "")}`;
}
