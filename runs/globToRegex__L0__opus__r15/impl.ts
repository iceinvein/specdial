/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`      any run of characters within one path segment (no `/`)
 * - `**`     any number of whole segments, including zero (`a/**\/b` matches `a/b`)
 * - `?`      exactly one character other than `/`
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`  alternation; may be nested and may contain other glob syntax
 * - `\x`     matches `x` literally
 *
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let i = 0
  let braceDepth = 0

  const parse = (): string => {
    let out = ''
    while (i < pattern.length) {
      const c = pattern[i]

      if (c === '\\' && i + 1 < pattern.length) {
        out += escapeRegex(pattern[i + 1])
        i += 2
      } else if (c === '*') {
        if (pattern[i + 1] === '*' && isSegmentStart(i) && isSegmentEnd(i + 2)) {
          i += 2
          if (pattern[i] === '/') {
            // `**/` - zero or more leading directories
            i++
            out += '(?:[^/]+/)*'
          } else if (out.endsWith('/')) {
            // `/**` at end - the directory itself or anything beneath it
            out = out.slice(0, -1) + '(?:/.*)?'
          } else {
            // bare `**` - anything
            out += '.*'
          }
        } else {
          // Collapse runs like `***` or non-segment `**` into a single `*`.
          while (pattern[i] === '*') i++
          out += '[^/]*'
        }
      } else if (c === '?') {
        out += '[^/]'
        i++
      } else if (c === '[') {
        const cls = parseClass()
        if (cls === null) {
          out += '\\['
          i++
        } else {
          out += cls
        }
      } else if (c === '{') {
        const start = i
        i++
        braceDepth++
        const alts: string[] = [parse()]
        while (pattern[i] === ',') {
          i++
          alts.push(parse())
        }
        braceDepth--
        if (pattern[i] === '}') {
          i++
          out += alts.length > 1 ? `(?:${alts.join('|')})` : `\\{${alts[0]}\\}`
        } else {
          // Unterminated brace: treat `{` literally and re-parse the rest.
          i = start + 1
          out += '\\{'
        }
      } else if (braceDepth > 0 && (c === ',' || c === '}')) {
        return out
      } else {
        out += escapeRegex(c)
        i++
      }
    }
    return out
  }

  const parseClass = (): string | null => {
    let j = i + 1
    let negate = false
    if (pattern[j] === '!' || pattern[j] === '^') {
      negate = true
      j++
    }
    let body = ''
    let first = true
    while (j < pattern.length && (pattern[j] !== ']' || first)) {
      let ch = pattern[j]
      if (ch === '\\' && j + 1 < pattern.length) {
        j++
        ch = pattern[j]
      }
      body += ch === '-' && !first && pattern[j + 1] !== ']' ? '-' : escapeClassChar(ch)
      first = false
      j++
    }
    if (j >= pattern.length) return null
    i = j + 1
    return negate ? `[^/${body}]` : `(?!/)[${body}]`
  }

  const isSegmentStart = (idx: number) => idx === 0 || pattern[idx - 1] === '/'
  const isSegmentEnd = (idx: number) => idx === pattern.length || pattern[idx] === '/'

  return new RegExp(`^${parse()}$`)
}

function escapeRegex(ch: string): string {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

function escapeClassChar(ch: string): string {
  return /[\]\\^-]/.test(ch) ? `\\${ch}` : ch
}
