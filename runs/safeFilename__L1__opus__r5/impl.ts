// Characters that are unsafe in file paths on common platforms, plus control characters.
const UNSAFE_CHARS = /[\/\\:*?"<>|\x00-\x1f\x7f]/g;
const FALLBACK_NAME = "resume";
const MAX_NAME_LENGTH = 200;

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .replace(UNSAFE_CHARS, "")
    .trim()
    .replace(/\s+/g, "-")
    // Leading dots would make hidden files or ".." traversal segments.
    .replace(/^\.+/, "")
    .slice(0, MAX_NAME_LENGTH);

  if (name === "") {
    name = FALLBACK_NAME;
  }

  const ext = extension.replace(UNSAFE_CHARS, "").replace(/\s+/g, "").replace(/^\.+/, "");

  return ext === "" ? name : `${name}.${ext}`;
}
