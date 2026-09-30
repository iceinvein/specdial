const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/

const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t' }

export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const match = LINE.exec(line)
    if (!match) continue

    const [, key, raw] = match
    result[key] = parseValue(raw)
  }

  return result
}

function parseValue(raw: string): string {
  // Double-quoted values support common escapes; single-quoted are literal.
  const double = /^"((?:\\.|[^"\\])*)"/.exec(raw)
  if (double) {
    return double[1].replace(/\\(.)/g, (_, c: string) => ESCAPES[c] ?? c)
  }
  const single = /^'([^']*)'/.exec(raw)
  if (single) return single[1]

  // Unquoted: strip an inline comment (a `#` preceded by whitespace).
  const comment = raw.search(/\s#/)
  return (comment === -1 ? raw : raw.slice(0, comment)).trim()
}
