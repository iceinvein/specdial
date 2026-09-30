/**
 * Converts a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`       any run of characters except `/`
 * - `?`       a single character except `/`
 * - `**`      as a full path segment, zero or more segments (`a/**\/b` matches `a/b`)
 * - `[abc]`   character class; `[!abc]` / `[^abc]` negates; ranges like `[a-z]` work
 * - `{a,b}`   alternation, may be nested
 * - `\x`      escapes `x`
 *
 * Every other character matches literally. Neither `*`, `?` nor a class ever
 * matches `/`.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${translate(pattern)}$`)
}

const SPECIAL = /[.*+?^${}()|[\]\\\/]/g

function escapeLiteral(s: string): string {
  return s.replace(SPECIAL, '\\$&')
}

function translate(glob: string): string {
  let out = ''
  let i = 0
  let braceDepth = 0

  while (i < glob.length) {
    const c = glob[i]

    if (c === '\\') {
      // Trailing backslash matches a literal backslash.
      out += escapeLiteral(i + 1 < glob.length ? glob[i + 1] : '\\')
      i += 2
      continue
    }

    if (c === '*') {
      let j = i
      while (glob[j] === '*') j++
      const isGlobstar =
        j - i >= 2 &&
        (i === 0 || glob[i - 1] === '/' || glob[i - 1] === '{' || glob[i - 1] === ',') &&
        (j === glob.length || glob[j] === '/' || glob[j] === '}' || glob[j] === ',')

      if (!isGlobstar) {
        out += '[^/]*'
      } else if (glob[j] === '/') {
        // `**/` — zero or more whole segments, each followed by a slash.
        out += '(?:[^/]*/)*'
        j++
      } else if (out.endsWith('\\/')) {
        // Trailing `/**` — the directory itself or anything beneath it.
        out = out.slice(0, -2) + '(?:/.*)?'
      } else {
        // Bare `**` — anything at all.
        out += '.*'
      }
      i = j
      continue
    }

    if (c === '?') {
      out += '[^/]'
      i++
      continue
    }

    if (c === '[') {
      const cls = parseClass(glob, i)
      if (cls) {
        out += cls.regex
        i = cls.end
      } else {
        out += '\\['
        i++
      }
      continue
    }

    if (c === '{') {
      if (hasClosingBrace(glob, i)) {
        out += '(?:'
        braceDepth++
      } else {
        out += '\\{'
      }
      i++
      continue
    }

    if (c === ',' && braceDepth > 0) {
      out += '|'
      i++
      continue
    }

    if (c === '}' && braceDepth > 0) {
      out += ')'
      braceDepth--
      i++
      continue
    }

    out += escapeLiteral(c)
    i++
  }

  return out
}

function hasClosingBrace(glob: string, start: number): boolean {
  let depth = 0
  for (let i = start; i < glob.length; i++) {
    const c = glob[i]
    if (c === '\\') i++
    else if (c === '[') {
      const cls = parseClass(glob, i)
      if (cls) i = cls.end - 1
    } else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return true
  }
  return false
}

/** Parses `[...]` starting at `start`; returns null if it is unterminated. */
function parseClass(glob: string, start: number): { regex: string; end: number } | null {
  let i = start + 1
  let negate = false
  if (glob[i] === '!' || glob[i] === '^') {
    negate = true
    i++
  }

  let body = ''
  let first = true
  while (i < glob.length) {
    let c = glob[i]
    let escaped = false
    if (c === ']' && !first) {
      // Classes never match `/`, in either polarity.
      const regex = negate ? `[^/${body}]` : `(?!/)[${body}]`
      return { regex, end: i + 1 }
    }
    if (c === '\\' && i + 1 < glob.length) {
      i++
      c = glob[i]
      escaped = true
    }
    // `-` between two characters is a range; everything else is literal.
    body += c === '-' && !escaped && !first && glob[i + 1] !== ']' ? '-' : c.replace(/[\\\]^\-]/, '\\$&')
    first = false
    i++
  }
  return null
}
