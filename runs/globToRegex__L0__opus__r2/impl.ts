/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   *        any run of characters except `/`
 *   **       any number of path segments (only when it is a whole segment,
 *            e.g. `a/**\/b`, `**\/x`, `x/**`); elsewhere it behaves like `*`
 *   ?        exactly one character except `/`
 *   [abc]    character class; `[!abc]` / `[^abc]` negate; never matches `/`
 *   {a,b}    alternation (may nest and contain other glob syntax)
 *   \x       literal `x`
 */
export function globToRegex(pattern: string): RegExp {
  let i = 0
  let braceDepth = 0

  const parse = (): string => {
    let out = ''
    while (i < pattern.length) {
      const c = pattern[i]

      if (c === '\\') {
        i++
        if (i < pattern.length) out += escapeRegex(pattern[i++])
        else out += '\\\\'
        continue
      }

      if (c === '*') {
        let j = i
        while (pattern[j] === '*') j++
        const isGlobstar =
          j - i >= 2 &&
          (i === 0 || pattern[i - 1] === '/') &&
          (j === pattern.length ||
            pattern[j] === '/' ||
            (braceDepth > 0 && (pattern[j] === ',' || pattern[j] === '}')))
        if (isGlobstar) {
          if (pattern[j] === '/') {
            // `**/` matches zero or more leading segments.
            out += '(?:[^/]*/)*'
            i = j + 1
          } else if (i > 0) {
            // Trailing `/**` matches the directory itself and everything under it.
            out = out.slice(0, -1) + '(?:/.*)?'
            i = j
          } else {
            out += '.*'
            i = j
          }
        } else {
          out += '[^/]*'
          i = j
        }
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
          out += cls.source
          i = cls.end
        } else {
          out += '\\['
          i++
        }
        continue
      }

      if (c === '{') {
        const close = findBraceClose(pattern, i)
        if (close === -1) {
          out += '\\{'
          i++
          continue
        }
        i++
        braceDepth++
        const alts: string[] = [parse()]
        while (pattern[i] === ',') {
          i++
          alts.push(parse())
        }
        braceDepth--
        i++ // skip '}'
        out += '(?:' + alts.join('|') + ')'
        continue
      }

      if (braceDepth > 0 && (c === ',' || c === '}')) return out

      out += escapeRegex(c)
      i++
    }
    return out
  }

  return new RegExp('^' + parse() + '$')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Parse a `[...]` class starting at `start`; returns null if unterminated. */
function parseClass(
  pattern: string,
  start: number,
): { source: string; end: number } | null {
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
      // Classes never match `/`, so exclude it in both forms.
      const source = negate ? `[^/${body}]` : `(?:(?!/)[${body}])`
      return { source, end: i + 1 }
    }
    if (c === '\\' && i + 1 < pattern.length) {
      body += '\\' + pattern[i + 1]
      i += 2
    } else {
      // `-` is kept as a range operator; escape everything else that is special in a class.
      body += c === '-' ? c : c.replace(/[\]\\^]/, '\\$&')
      i++
    }
    first = false
  }
  return null
}

/** Index of the `}` closing the `{` at `start`, or -1 if there is none. */
function findBraceClose(pattern: string, start: number): number {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') i++
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return -1
}
