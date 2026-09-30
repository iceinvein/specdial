/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`        any run of characters within a single path segment (not `/`)
 * - `?`        exactly one character other than `/`
 * - `**`       as a full segment, any number of segments (including zero):
 *              `src/**\/*.ts` matches `src/a.ts` and `src/x/y/a.ts`,
 *              `src/**` matches `src` and everything below it
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`   character classes (never match `/`)
 * - `{a,b,c}`  alternation, may be nested and contain other glob syntax
 * - `\x`       the literal character `x`
 *
 * Unterminated `[` or `{` are treated as literal characters.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${translate(pattern)}$`)
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/]/g

function escapeRegex(s: string): string {
  return s.replace(REGEX_SPECIAL, '\\$&')
}

function translate(pattern: string): string {
  let out = ''
  // Number of currently open `{` groups (only counted when terminated).
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '\\') {
      // Escaped literal; a trailing backslash matches a literal backslash.
      const next = pattern[i + 1]
      out += escapeRegex(next ?? '\\')
      i += next === undefined ? 1 : 2
      continue
    }

    if (c === '*') {
      let j = i
      while (pattern[j] === '*') j++
      const isGlobstar = j - i >= 2
      const atSegmentStart = i === 0 || pattern[i - 1] === '/' || isBoundary(pattern, i - 1)
      const atSegmentEnd = j === pattern.length || pattern[j] === '/' || isBoundary(pattern, j)

      if (isGlobstar && atSegmentStart && atSegmentEnd) {
        if (pattern[j] === '/') {
          // `**/` — zero or more directories; the slash is consumed here.
          out += '(?:[^/]+/)*'
          i = j + 1
          continue
        }
        if (out.endsWith('\\/') && (j === pattern.length || isBoundary(pattern, j))) {
          // `/**` at the end of a branch — the directory itself or anything below it.
          out = out.slice(0, -2) + '(?:/.*)?'
        } else {
          out += '.*'
        }
      } else {
        out += '[^/]*'
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

    if (c === '{' && findBraceClose(pattern, i) !== -1) {
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

    out += escapeRegex(c)
    i++
  }

  return out
}

/** Whether pattern[idx] is a brace delimiter, which also bounds a path segment. */
function isBoundary(pattern: string, idx: number): boolean {
  const c = pattern[idx]
  return (c === '{' || c === ',' || c === '}') && pattern[idx - 1] !== '\\'
}

/** Index of the `}` closing the `{` at `start`, or -1 if unterminated. */
function findBraceClose(pattern: string, start: number): number {
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
      if (depth === 0) return i
    }
  }
  return -1
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
    const c = pattern[i]
    // A `]` immediately after the opening bracket is a literal member.
    if (c === ']' && !first) {
      if (body === '') return null
      // Classes never match the path separator.
      return { regex: negate ? `[^/${body}]` : `(?!/)[${body}]`, end: i + 1 }
    }
    if (c === '\\' && i + 1 < pattern.length) {
      body += '\\' + pattern[i + 1]
      i += 2
    } else {
      body += c === '\\' || c === ']' || c === '[' || c === '^' ? '\\' + c : c
      i++
    }
    first = false
  }
  return null
}
