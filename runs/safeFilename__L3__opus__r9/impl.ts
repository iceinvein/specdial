const FORBIDDEN = /[\\/:*?"<>|]/g;
const FALLBACK = "resume";

export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .trim()
    .replace(FORBIDDEN, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const suffix = extension.startsWith(".") ? extension : `.${extension}`;
  return (base === "" ? FALLBACK : base) + suffix;
}
