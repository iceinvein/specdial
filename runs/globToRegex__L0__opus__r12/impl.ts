/**
 * Convert a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`      any run of characters except `/`
 * - `?`      one character except `/`
 * - `**`     any number of path segments (including zero) when it forms a
 *            whole segment, e.g. `src/**\/*.ts` matches `src/a.ts`
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`  alternation (may be nested and contain other glob syntax)
 * - `\x`     escapes `x` literally
 */
export function globToRegex(pattern: string): RegExp {
  let i = 0
  let braceDepth = 0

  const escape = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

  const parse = (): string => {
    let out = ''
    while (i < pattern.length) {
      const ch = pattern[i]

      if (ch === '\\') {
        i++
        if (i < pattern.length) out += escape(pattern[i++])
        else out += '\\\\'
        continue
      }

      if (ch === '*') {
        let stars = 0
        while (pattern[i] === '*') {
          stars++
          i++
        }
        const prev = pattern[i - stars - 1]
        const next = pattern[i]
        const segmentStart = prev === undefined || prev === '/'
        if (stars >= 2 && segmentStart && next === '/') {
          // `**/` — zero or more whole segments
          i++
          out += '(?:[^/]+/)*'
        } else if (stars >= 2 && segmentStart && (next === undefined || (braceDepth > 0 && (next === ',' || next === '}')))) {
          // trailing `**` — everything below this point
          out += '.*'
        } else {
          out += '[^/]*'
        }
        continue
      }

      if (ch === '?') {
        out += '[^/]'
        i++
        continue
      }

      if (ch === '[') {
        const end = findClassEnd(i)
        if (end === -1) {
          out += '\\['
          i++
          continue
        }
        let body = pattern.slice(i + 1, end)
        let negate = false
        if (body[0] === '!' || body[0] === '^') {
          negate = true
          body = body.slice(1)
        }
        body = body.replace(/\\(.)/g, '$1').replace(/[\\\]^]/g, '\\$&')
        out += negate ? `(?!/)[^${body}]` : `(?!/)[${body}]`
        i = end + 1
        continue
      }

      if (ch === '{') {
        const close = findBraceEnd(i)
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
        i++ // skip `}`
        braceDepth--
        out += `(?:${alts.join('|')})`
        continue
      }

      if (braceDepth > 0 && (ch === ',' || ch === '}')) return out

      out += escape(ch)
      i++
    }
    return out
  }

  // Index of the `]` closing a class opened at `start`, or -1.
  const findClassEnd = (start: number): number => {
    let j = start + 1
    if (pattern[j] === '!' || pattern[j] === '^') j++
    if (pattern[j] === ']') j++ // leading `]` is literal
    for (; j < pattern.length; j++) {
      if (pattern[j] === '\\') j++
      else if (pattern[j] === ']') return j
      else if (pattern[j] === '/') return -1
    }
    return -1
  }

  // Index of the `}` matching the `{` at `start`, or -1.
  const findBraceEnd = (start: number): number => {
    let depth = 0
    for (let j = start; j < pattern.length; j++) {
      const c = pattern[j]
      if (c === '\\') j++
      else if (c === '[') {
        const end = findClassEnd(j)
        if (end !== -1) j = end
      } else if (c === '{') depth++
      else if (c === '}' && --depth === 0) return j
    }
    return -1
  }

  return new RegExp(`^${parse()}$`)
}
