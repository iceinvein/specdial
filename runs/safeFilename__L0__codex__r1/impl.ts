// Apply the filename restrictions shared by Windows, macOS, and Linux.
function sanitizePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g, '_')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '')
}

/** Build a download filename, appending the sanitized extension when nonempty. */
export function safeFilename(raw: string, extension: string): string {
  let name = sanitizePart(raw) || 'download'
  const suffix = sanitizePart(extension)

  // Windows device names remain reserved even when followed by an extension.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?: *\.| *$)/i.test(name)) {
    name = `_${name}`
  }

  return suffix ? `${name}.${suffix}` : name
}
