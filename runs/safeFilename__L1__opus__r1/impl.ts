// Characters Windows/macOS/Linux reject in filenames, plus ASCII control chars.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_BASE_LENGTH = 200;
const FALLBACK = "resume";

export function safeFilename(raw: string, extension: string): string {
  let base = raw
    .replace(DISALLOWED, "")
    .trim()
    .replace(/\s+/g, "-")
    // Leading dots would hide the file or allow "." / ".." traversal names.
    .replace(/^\.+/, "")
    // Trailing dots and spaces are stripped by Windows.
    .replace(/[.\s]+$/, "")
    .slice(0, MAX_BASE_LENGTH);

  if (base === "" || WINDOWS_RESERVED.test(base)) {
    base = FALLBACK;
  }

  const ext = extension.replace(DISALLOWED, "").replace(/\s+/g, "").replace(/^\.+/, "");
  return ext ? `${base}.${ext}` : base;
}
