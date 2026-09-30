const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|]/

function escapeChar(ch: string): string {
  return REGEX_SPECIAL.test(ch) ? '\\' + ch : ch
}

/**
 * Convert a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`      any run of characters except `/`
 * - `**`     any run of characters including `/`; as a full segment (`a/**\/b`,
 *            `**\/x`, `x/**`) it also matches zero directories
 * - `?`      exactly one character except `/`
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`  alternation (may nest and contain other glob syntax)
 * - `\x`     literal `x`
 */
export function globToRegex(pattern: string): RegExp {
  let i = 0
  let braceDepth = 0
  let out = ''

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '\\') {
      if (i + 1 < pattern.length) {
        out += escapeChar(pattern[i + 1])
        i += 2
      } else {
        out += '\\\\'
        i++
      }
      continue
    }

    if (ch === '*') {
      let j = i
      while (pattern[j] === '*') j++
      const isGlobstar = j - i >= 2
      if (!isGlobstar) {
        out += '[^/]*'
        i = j
        continue
      }
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      const atSegmentEnd = j === pattern.length || pattern[j] === '/'
      if (atSegmentStart && atSegmentEnd) {
        if (pattern[j] === '/') {
          // `**/` — zero or more whole directories
          out += '(?:[^/]*/)*'
          i = j + 1
        } else if (out.endsWith('/')) {
          // trailing `/**` — the directory itself or anything beneath it
          out = out.slice(0, -1) + '(?:/.*)?'
          i = j
        } else {
          // lone `**`
          out += '.*'
          i = j
        }
      } else {
        out += '.*'
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

  return new RegExp('^' + out + '$')
}

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
    if (ch === ']' && !first) {
      // Classes never match the path separator.
      const regex = negate ? `[^/${body}]` : `(?:(?!/)[${body}])`
      return { regex, end: i + 1 }
    }
    if (ch === '\\' && i + 1 < pattern.length) {
      body += '\\' + pattern[i + 1]
      i += 2
    } else {
      body += ch === '-' ? '-' : /[\\\]\[^]/.test(ch) ? '\\' + ch : ch
      i++
    }
    first = false
  }
  return null
}

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
