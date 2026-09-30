/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   `*`       any run of characters except `/`
 *   `?`       exactly one character except `/`
 *   `**`      any number of path segments (as a whole segment only, e.g. `a/**\/b`)
 *   `[abc]`   character class; `[!abc]` or `[^abc]` negates. Never matches `/`
 *   `{a,b}`   alternation (may nest and contain other glob syntax)
 *   `\x`      literal `x`
 *
 * Paths are expected to use `/` as the separator.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${convert(pattern)}$`)
}

const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|/]/

function escapeChar(c: string): string {
  return REGEX_SPECIAL.test(c) ? `\\${c}` : c
}

function convert(pattern: string): string {
  let out = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '\\') {
      // Escaped literal; a trailing backslash is treated as a literal backslash.
      out += escapeChar(pattern[i + 1] ?? '\\')
      i += 2
      continue
    }

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        let end = i
        while (pattern[end] === '*') end++
        const atSegmentStart = i === 0 || pattern[i - 1] === '/'
        const atSegmentEnd = end === pattern.length || pattern[end] === '/'
        if (atSegmentStart && atSegmentEnd) {
          if (pattern[end] === '/') {
            // `**/` matches zero or more whole directories.
            out += '(?:[^/]*/)*'
            i = end + 1
            // Collapse repeated `**/**/`.
            while (pattern.startsWith('**/', i)) i += 3
          } else if (i > 0) {
            // Trailing `/**` matches the directory itself and anything beneath it.
            out = out.slice(0, -2) // drop the escaped `/` we just emitted
            out += '(?:/.*)?'
            i = end
          } else {
            // Pattern is just `**`.
            out += '.*'
            i = end
          }
          continue
        }
        // `**` not forming a whole segment behaves like `*`.
        out += '[^/]*'
        i = end
        continue
      }
      out += '[^/]*'
      i++
      continue
    }

    if (c === '?') {
      out += '[^/]'
      i++
      continue
    }

    if (c === '[') {
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

    if (c === '{' && hasClosingBrace(pattern, i)) {
      out += '(?:'
      braceDepth++
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

    out += escapeChar(c)
    i++
  }

  return out
}

/** Parse `[...]` starting at `start`; returns null if it is not a valid class. */
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
    const c = pattern[i]
    if (c === ']' && !first) {
      if (body === '') return null
      return { regex: `[${negate ? '^' : ''}${body}${negate ? '/' : ''}]`, end: i + 1 }
    }
    first = false
    if (c === '\\' && i + 1 < pattern.length) {
      body += `\\${pattern[i + 1]}`
      i += 2
      continue
    }
    if (c === '/') return null // a class can never span a separator
    body += c === '^' || c === '[' || c === ']' ? `\\${c}` : c
    i++
  }
  return null
}

/** True if the `{` at `start` has a matching `}` (so it should be treated as alternation). */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') {
      i++
    } else if (c === '[') {
      const cls = parseClass(pattern, i)
      if (cls) i = cls.end - 1
    } else if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) return true
    }
  }
  return false
}
