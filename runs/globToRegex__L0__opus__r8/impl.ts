/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 * - `*`       any run of characters except `/`
 * - `?`       any single character except `/`
 * - `**`      as a whole path segment, zero or more directories
 *             (`src/**\/*.ts` matches `src/a.ts` and `src/a/b/c.ts`)
 * - `[abc]`, `[a-z]`, `[!abc]` / `[^abc]`  character classes (never match `/`)
 * - `{a,b}`   alternation, may be nested
 * - `\x`      matches `x` literally
 *
 * Unclosed `[` or `{` are treated as literal characters.
 */
export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '\\') {
      i++
      if (i < pattern.length) re += escapeRegex(pattern[i])
      else re += '\\\\'
      i++
      continue
    }

    if (c === '*') {
      let stars = 0
      while (pattern[i] === '*') {
        stars++
        i++
      }
      const prev = pattern[i - stars - 1]
      const next = pattern[i]
      const atSegmentStart = prev === undefined || prev === '/'
      const atSegmentEnd = next === undefined || next === '/'

      if (stars >= 2 && atSegmentStart && atSegmentEnd) {
        if (next === '/') {
          // `**/` — zero or more leading directories
          re += '(?:[^/]*/)*'
          i++ // consume the slash
        } else if (prev === '/') {
          // trailing `/**` — the directory itself or anything beneath it
          re = re.slice(0, -1) + '(?:/.*)?'
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
      continue
    }

    if (c === '?') {
      re += '[^/]'
      i++
      continue
    }

    if (c === '[') {
      const end = findClassEnd(pattern, i)
      if (end === -1) {
        re += '\\['
        i++
        continue
      }
      let body = pattern.slice(i + 1, end)
      let negate = false
      if (body[0] === '!' || body[0] === '^') {
        negate = true
        body = body.slice(1)
      }
      let escaped = ''
      for (let j = 0; j < body.length; j++) {
        let ch = body[j]
        const isEscape = ch === '\\' && j + 1 < body.length
        if (isEscape) ch = body[++j]
        // Keep `-` as a range operator unless it was escaped.
        escaped += ch === '\\' || ch === ']' || ch === '^' || (isEscape && ch === '-') ? '\\' + ch : ch
      }
      re += negate ? `(?!/)[^${escaped}]` : `(?!/)[${escaped}]`
      i = end + 1
      continue
    }

    if (c === '{' && findBraceEnd(pattern, i) !== -1) {
      braceDepth++
      re += '(?:'
      i++
      continue
    }

    if (c === ',' && braceDepth > 0) {
      re += '|'
      i++
      continue
    }

    if (c === '}' && braceDepth > 0) {
      braceDepth--
      re += ')'
      i++
      continue
    }

    re += escapeRegex(c)
    i++
  }

  return new RegExp(`^${re}$`)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Index of the `]` closing the class opened at `start`, or -1. */
function findClassEnd(pattern: string, start: number): number {
  let i = start + 1
  if (pattern[i] === '!' || pattern[i] === '^') i++
  // A `]` right after the opener is a literal member of the class.
  if (pattern[i] === ']') i++
  for (; i < pattern.length; i++) {
    if (pattern[i] === '\\') i++
    else if (pattern[i] === ']') return i
  }
  return -1
}

/** Index of the `}` closing the brace group opened at `start`, or -1. */
function findBraceEnd(pattern: string, start: number): number {
  let depth = 0
  for (let i = start; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') i++
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return -1
}
