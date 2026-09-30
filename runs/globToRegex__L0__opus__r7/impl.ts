/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`      any run of characters except `/`
 * - `?`      any single character except `/`
 * - `**`     as a full path segment, zero or more segments (`a/**\/b` matches `a/b`)
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`  alternation, may be nested and contain other glob syntax
 * - `\x`     escapes `x` so it matches literally
 *
 * Everything else matches literally.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${translate(pattern)}$`)
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/]/

function escapeChar(ch: string): string {
  return REGEX_SPECIAL.test(ch) ? `\\${ch}` : ch
}

function translate(pattern: string): string {
  let out = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '\\') {
      // A trailing backslash matches a literal backslash.
      out += escapeChar(i + 1 < pattern.length ? pattern[i + 1] : '\\')
      i += 2
      continue
    }

    if (ch === '*') {
      let end = i
      while (pattern[end] === '*') end++
      const isGlobstar = end - i >= 2
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      const atSegmentEnd = end === pattern.length || pattern[end] === '/'

      if (isGlobstar && atSegmentStart && atSegmentEnd) {
        if (pattern[end] === '/') {
          // `**/` — zero or more whole segments, each followed by `/`.
          out += '(?:[^/]*/)*'
          i = end + 1
        } else {
          // Trailing `**` — anything, including further segments.
          out += '.*'
          i = end
        }
      } else {
        // `*`, or `**` embedded in a segment (e.g. `a**b`), stays within a segment.
        out += '[^/]*'
        i = end
      }
      continue
    }

    if (ch === '?') {
      out += '[^/]'
      i++
      continue
    }

    if (ch === '[') {
      const cls = parseClass(pattern, i)
      if (cls) {
        out += cls.regex
        i = cls.end
      } else {
        out += '\\['
        i++
      }
      continue
    }

    if (ch === '{' && hasClosingBrace(pattern, i)) {
      braceDepth++
      out += '(?:'
      i++
      continue
    }

    if (ch === ',' && braceDepth > 0) {
      out += '|'
      i++
      continue
    }

    if (ch === '}' && braceDepth > 0) {
      braceDepth--
      out += ')'
      i++
      continue
    }

    out += escapeChar(ch)
    i++
  }

  return out
}

/** Parse a `[...]` class starting at `start`; returns null if it is unterminated. */
function parseClass(pattern: string, start: number): { regex: string; end: number } | null {
  let i = start + 1
  let negate = false
  if (pattern[i] === '!' || pattern[i] === '^') {
    negate = true
    i++
  }

  let body = ''
  let first = true
  while (i < pattern.length) {
    const ch = pattern[i]
    // A `]` immediately after `[` or `[!` is a literal member.
    if (ch === ']' && !first) {
      if (body === '') return null
      // Classes never match `/`, so paths can't leak across segments.
      const regex = `(?!/)[${negate ? '^' : ''}${body}]`
      return { regex, end: i + 1 }
    }
    if (ch === '\\' && i + 1 < pattern.length) {
      body += escapeClassChar(pattern[i + 1])
      i += 2
    } else {
      // Keep `-` unescaped so ranges like `a-z` work.
      body += ch === '-' ? '-' : escapeClassChar(ch)
      i++
    }
    first = false
  }
  return null
}

function escapeClassChar(ch: string): string {
  return /[\\\]^\-[]/.test(ch) ? `\\${ch}` : ch
}

/** True if the `{` at `start` has a matching `}` (so it's alternation, not a literal). */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\') {
      i++
    } else if (ch === '[') {
      const cls = parseClass(pattern, i)
      if (cls) i = cls.end - 1
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return true
    }
  }
  return false
}
