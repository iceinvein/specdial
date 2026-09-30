/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   `*`       any run of characters except `/`
 *   `?`       one character except `/`
 *   `**`      as a whole path segment, zero or more directories
 *             (`a/**` + `/b` matches `a/b` and `a/x/y/b`; a trailing `/**` matches everything below)
 *   `[abc]`   character class; `[!abc]` or `[^abc]` negates it. Never matches `/`.
 *   `{a,b}`   alternation, may be nested
 *   `\x`      matches `x` literally
 * Every other character matches itself.
 */
export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        let end = i + 2
        while (pattern[end] === '*') end++
        const atSegmentStart = i === 0 || pattern[i - 1] === '/'
        const atSegmentEnd = end === pattern.length || pattern[end] === '/'
        if (atSegmentStart && atSegmentEnd) {
          if (end === pattern.length) {
            // `a/**` also matches `a` itself; a bare `**` matches anything.
            if (re.endsWith('/')) re = re.slice(0, -1) + '(?:/.*)?'
            else re += '.*'
            i = end
          } else {
            // `**/` matches zero or more leading directories.
            re += '(?:.*/)?'
            i = end + 1
          }
          continue
        }
        // `**` inside a segment behaves like `*`.
        re += '[^/]*'
        i = end
        continue
      }
      re += '[^/]*'
      i++
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

    if (c === '{') {
      braceDepth++
      re += '(?:'
      i++
      continue
    }
    if (c === '}' && braceDepth > 0) {
      braceDepth--
      re += ')'
      i++
      continue
    }
    if (c === ',' && braceDepth > 0) {
      re += '|'
      i++
      continue
    }

    if (c === '\\' && i + 1 < pattern.length) {
      re += escapeRegex(pattern[i + 1])
      i += 2
      continue
    }

    re += escapeRegex(c)
    i++
  }

  if (braceDepth > 0) {
    throw new SyntaxError(`Unclosed "{" in glob: ${pattern}`)
  }

  return new RegExp(`^${re}$`)
}

/** Parse `[...]` starting at `start`; returns null if the class is unterminated. */
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
    // A `]` immediately after `[` or `[!` is a literal member.
    if (c === ']' && !first) {
      const source = negate ? `[^/${body}]` : `(?![/])[${body}]`
      return { source, end: i + 1 }
    }
    if (c === '\\' && i + 1 < pattern.length) {
      body += pattern[i + 1].replace(/[\\\]^[-]/g, '\\$&')
      i += 2
    } else {
      // `-` keeps its range meaning; escape everything else that is special inside a class.
      body += c === '-' ? c : c.replace(/[\\\]^[]/g, '\\$&')
      i++
    }
    first = false
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
