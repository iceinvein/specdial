/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`      any run of characters except `/`
 * - `?`      exactly one character except `/`
 * - `**`     any number of path segments (including zero) when it is a whole
 *            segment, e.g. `src/**\/*.ts` matches `src/a.ts` and `src/x/y/a.ts`
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`  alternation, may be nested
 * - `\x`     escape a special character
 *
 * Paths are expected to use `/` as the separator.
 */
export function globToRegex(pattern: string): RegExp {
  let re = ''
  let i = 0
  let braceDepth = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '\\') {
      if (i + 1 < pattern.length) {
        re += escapeRegex(pattern[i + 1])
        i += 2
      } else {
        re += '\\\\'
        i++
      }
      continue
    }

    if (c === '*') {
      let j = i
      while (pattern[j] === '*') j++
      const count = j - i
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      const atSegmentEnd = j === pattern.length || pattern[j] === '/'

      if (count >= 2 && atSegmentStart && atSegmentEnd) {
        if (j === pattern.length) {
          // Trailing `**`: everything below (and including) this point.
          re += '.*'
          i = j
        } else {
          // `**/`: zero or more whole segments.
          re += '(?:[^/]*/)*'
          i = j + 1
        }
      } else {
        re += '[^/]*'
        i = j
      }
      continue
    }

    if (c === '?') {
      re += '[^/]'
      i++
      continue
    }

    if (c === '[') {
      const cls = parseClass(pattern, i)
      if (cls) {
        re += cls.source
        i = cls.end
      } else {
        re += '\\['
        i++
      }
      continue
    }

    if (c === '{' && hasClosingBrace(pattern, i)) {
      re += '(?:'
      braceDepth++
      i++
      continue
    }

    if (c === ',' && braceDepth > 0) {
      re += '|'
      i++
      continue
    }

    if (c === '}' && braceDepth > 0) {
      re += ')'
      braceDepth--
      i++
      continue
    }

    re += escapeRegex(c)
    i++
  }

  return new RegExp(`^${re}$`)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Parse a `[...]` class starting at `start`; returns null if unterminated. */
function parseClass(pattern: string, start: number): { source: string; end: number } | null {
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
      // Classes never match the path separator.
      const source = negate ? `[^/${body}]` : `(?:(?!/)[${body}])`
      return { source, end: i + 1 }
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

/** Whether the `{` at `start` has a matching `}` (so it forms a brace group). */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') {
      i++
    } else if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) return true
    }
  }
  return false
}
