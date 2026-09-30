/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`     any run of characters except `/`
 * - `**`    as a full path segment, zero or more segments (`a/**\/b` matches `a/b`)
 * - `?`     exactly one character except `/`
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}` alternation, may be nested and contain other glob syntax
 * - `\x`    matches `x` literally
 *
 * Every other character matches itself.
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${convert(pattern)}$`)
}

const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|/]/

function escapeChar(ch: string): string {
  return REGEX_SPECIAL.test(ch) ? `\\${ch}` : ch
}

function convert(pattern: string): string {
  let out = ''
  // One entry per open `{`: true if it is an alternation, false if it is a literal brace.
  const braces: boolean[] = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '\\' && i + 1 < pattern.length) {
      out += escapeChar(pattern[i + 1])
      i += 2
      continue
    }

    if (ch === '*') {
      let end = i
      while (pattern[end] === '*') end++
      const isGlobstar =
        end - i >= 2 &&
        (i === 0 || pattern[i - 1] === '/') &&
        (end === pattern.length || pattern[end] === '/')

      if (!isGlobstar) {
        out += '[^/]*'
        i = end
      } else if (end === pattern.length) {
        // Trailing `**` (or the whole pattern): anything, including nothing.
        out += '.*'
        i = end
      } else {
        // `**/`: zero or more complete segments.
        out += '(?:[^/]*/)*'
        i = end + 1
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
        continue
      }
      out += '\\['
      i++
      continue
    }

    if (ch === '{') {
      const isAlternation = hasClosingBrace(pattern, i)
      braces.push(isAlternation)
      out += isAlternation ? '(?:' : '\\{'
      i++
      continue
    }

    if (ch === ',' && braces[braces.length - 1]) {
      out += '|'
      i++
      continue
    }

    if (ch === '}' && braces.length > 0) {
      out += braces.pop() ? ')' : '\\}'
      i++
      continue
    }

    out += escapeChar(ch)
    i++
  }

  return out
}

/** Parse `[...]` starting at `start`. Returns null if the bracket is unterminated. */
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
    // A `]` immediately after the opening (or negation) is a literal member.
    if (ch === ']' && !first) {
      if (body === '') return null
      const regex = negate ? `(?!/)[^${body}]` : `(?!/)[${body}]`
      return { regex, end: i + 1 }
    }
    if (ch === '\\' && i + 1 < pattern.length) {
      body += `\\${pattern[i + 1]}`
      i += 2
    } else {
      // `-` stays unescaped so ranges work; escape the rest that are special inside a class.
      body += ch === '-' ? '-' : /[\\\]^[]/.test(ch) ? `\\${ch}` : ch
      i++
    }
    first = false
  }
  return null
}

/** True if the `{` at `start` has a matching `}` containing a top-level `,`. */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  let sawComma = false
  for (let i = start; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\') {
      i++
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return sawComma
    } else if (ch === ',' && depth === 1) {
      sawComma = true
    }
  }
  return false
}
