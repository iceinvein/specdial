// One assignment: optional `export`, a key, `=`, then a single-, double- or
// backtick-quoted value (which may span lines) or an unquoted value ending at
// a line break or ` #` comment.
const LINE =
  /^[ \t]*(?:export[ \t]+)?([A-Za-z_][\w.-]*)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^\n]*)?[ \t]*(?:#[^\n]*)?$/gm

/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored, as are lines that
 *   are not `KEY=value` assignments.
 * - An optional leading `export ` is allowed.
 * - Unquoted values are trimmed; a `#` preceded by whitespace starts a comment.
 * - Quoted values (`'`, `"` or `` ` ``) are taken literally and may span
 *   multiple lines; inside double quotes, `\n`, `\r`, `\t`, `\"` and `\\` are
 *   unescaped.
 * - When a key appears more than once, the last value wins.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const src = text.replace(/\r\n?/g, '\n')

  for (const [, key, raw = ''] of src.matchAll(LINE)) {
    // defineProperty so keys like `__proto__` become ordinary properties.
    Object.defineProperty(result, key, {
      value: parseValue(raw),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return result
}

function parseValue(raw: string): string {
  const quote = raw[0]
  if ((quote === '"' || quote === "'" || quote === '`') && raw.length >= 2 && raw.endsWith(quote)) {
    const inner = raw.slice(1, -1)
    if (quote !== '"') return inner.replaceAll(`\\${quote}`, quote)
    return inner.replace(/\\([nrt"\\])/g, (_, c: string) =>
      c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
    )
  }
  // Unquoted: strip an inline comment (`#` at start or after whitespace).
  return raw.replace(/(?:^|[ \t])#.*$/, '').trim()
}
