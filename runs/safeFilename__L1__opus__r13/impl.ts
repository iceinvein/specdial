const FALLBACK_NAME = 'resume'
const MAX_BASE_LENGTH = 200

// Characters that are invalid in Windows paths, path separators, and control characters.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

// Device names that Windows refuses to use as filenames, regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

function clean(text: string): string {
  return text
    .normalize('NFC')
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading/trailing dots and dashes produce hidden files, "..", or odd names.
    .replace(/^[.-]+|[.-]+$/g, '')
}

export function safeFilename(raw: string, extension: string): string {
  let base = clean(raw).slice(0, MAX_BASE_LENGTH).replace(/[.-]+$/, '')
  if (base === '' || WINDOWS_RESERVED.test(base)) {
    base = FALLBACK_NAME
  }

  const ext = clean(extension).replace(/\./g, '')
  return ext === '' ? base : `${base}.${ext}`
}
