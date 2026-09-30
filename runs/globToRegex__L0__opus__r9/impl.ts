/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   *        any run of characters except `/`
 *   **       any run of characters including `/` (when it is a whole segment)
 *   ** /     zero or more directories, e.g. `src/** /*.ts` matches `src/a.ts`
 *   ?        exactly one character except `/`
 *   [abc]    character class; `[!abc]` / `[^abc]` negate; never matches `/`
 *   {a,b}    alternation, may be nested and may contain other glob syntax
 *   \x       literal `x`
 *
 * Everything else is matched literally.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${translate(pattern)}$`)
}

const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|/]/

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
      // Trailing backslash is treated as a literal backslash.
      out += escapeChar(i + 1 < pattern.length ? pattern[i + 1] : '\\')
      i += 2
      continue
    }

    if (ch === '*') {
      let j = i
      while (pattern[j] === '*') j++
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      const atSegmentEnd = j === pattern.length || pattern[j] === '/'

      if (j - i >= 2 && atSegmentStart && atSegmentEnd) {
        if (pattern[j] === '/') {
          // `**/` — zero or more whole directories.
          out += '(?:[^/]+/)*'
          i = j + 1
        } else {
          // Trailing `**` — anything, including nested paths.
          out += '.*'
          i = j
        }
      } else {
        // `*` (or `**` not forming a whole segment) stays within a segment.
        out += '[^/]*'
        i = j
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

    if (ch === '{') {
      if (hasClosingBrace(pattern, i)) {
        braceDepth++
        out += '(?:'
      } else {
        out += '\\{'
      }
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

/** Parse a `[...]` class starting at `start`; returns null if unterminated. */
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
      // Character classes never match the path separator.
      const regex = negate ? `[^/${body}]` : `(?![/])[${body}]`
      return { regex, end: i + 1 }
    }
    if (ch === '\\' && i + 1 < pattern.length) {
      body += `\\${pattern[i + 1]}`
      i += 2
    } else {
      body += ch === '\\' || ch === ']' || ch === '[' || ch === '^' ? `\\${ch}` : ch
      i++
    }
    first = false
  }
  return null
}

/** True if the `{` at `start` has a matching `}` (respecting nesting/escapes). */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\') {
      i++
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return true
    }
  }
  return false
}
