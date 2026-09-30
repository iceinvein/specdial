// Characters that are invalid in filenames on common filesystems, plus control characters.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const FALLBACK_NAME = 'resume';

export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would make hidden files or path segments like "..".
    .replace(/^\.+/, '');

  const ext = extension.replace(DISALLOWED, '').trim().replace(/^\.+/, '');

  const base = name || FALLBACK_NAME;
  return ext ? `${base}.${ext}` : base;
}
