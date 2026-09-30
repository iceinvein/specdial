/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   *        any run of characters except `/`
 *   ?        exactly one character except `/`
 *   **       any run of characters including `/` (a full segment, e.g. `a/**\/b`,
 *            also matches zero segments, so it matches `a/b`)
 *   [abc]    character class; `[!abc]` / `[^abc]` negate. Never matches `/`
 *   {a,b}    alternation; may nest and contain other glob syntax
 *   \x       literal `x`
 *
 * Everything else is matched literally. Paths are expected to use `/` separators.
 */
export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**` is only a globstar when it forms a whole path segment.
        const atSegmentStart = i === 0 || pattern[i - 1] === '/'
        const next = pattern[i + 2]
        if (atSegmentStart && next === '/') {
          // `**/` — zero or more leading directories.
          re += '(?:[^/]+/)*'
          i += 3
          continue
        }
        if (atSegmentStart && next === undefined) {
          re += '.*'
          i += 2
          continue
        }
        // Not a full segment (e.g. `a**b`): behave like a single `*`.
        re += '[^/]*'
        i += 2
        while (pattern[i] === '*') i++
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
      const end = findClassEnd(pattern, i)
      if (end === -1) {
        // Unterminated class: treat `[` literally.
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
      // Escape everything that is special inside a JS class, except `-` ranges.
      const escaped = body.replace(/[\\\]^\[]/g, '\\$&')
      re += negate ? `[^/${escaped}]` : `(?!/)[${escaped}]`
      i = end + 1
      continue
    }

    if (c === '{') {
      if (hasClosingBrace(pattern, i)) {
        braceDepth++
        re += '(?:'
      } else {
        re += '\\{'
      }
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

  return new RegExp(`^${re}$`)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Index of the `]` closing the class opened at `start`, or -1. */
function findClassEnd(pattern: string, start: number): number {
  let j = start + 1
  if (pattern[j] === '!' || pattern[j] === '^') j++
  // A `]` immediately after the opening is a literal member.
  if (pattern[j] === ']') j++
  for (; j < pattern.length; j++) {
    if (pattern[j] === ']') return j
  }
  return -1
}

/** Whether the `{` at `start` has a matching `}` later in the pattern. */
function hasClosingBrace(pattern: string, start: number): boolean {
  let depth = 0
  for (let j = start; j < pattern.length; j++) {
    const c = pattern[j]
    if (c === '\\') j++
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return true
  }
  return false
}
