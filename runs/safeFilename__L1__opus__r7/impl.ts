// Characters that are reserved in Windows/Unix paths, plus ASCII control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const FALLBACK_NAME = "resume";

function clean(text: string): string {
  return text
    .replace(UNSAFE_CHARS, "")
    .trim()
    .replace(/\s+/g, "-")
    // Leading dots would create hidden files or "." / ".." path segments.
    .replace(/^\.+/, "")
    // Trailing dots and dashes are stripped by Windows or look broken.
    .replace(/[.-]+$/, "");
}

export function safeFilename(raw: string, extension: string): string {
  const name = clean(raw) || FALLBACK_NAME;
  const ext = clean(extension);
  return ext ? `${name}.${ext}` : name;
}
