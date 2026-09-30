/**
 * Convert a path glob into an anchored RegExp that matches whole paths.
 *
 * Supported syntax:
 *   *       any run of characters within one path segment (no `/`)
 *   ?       exactly one character other than `/`
 *   **      as a whole segment, zero or more path segments
 *           (`a/**\/b` matches `a/b` and `a/x/y/b`; `a/**` matches `a` and everything below it)
 *   [abc]   character class; `[!abc]` / `[^abc]` negate; never matches `/`
 *   {a,b}   alternation; may nest and contain other glob syntax
 *   \x      matches `x` literally
 *
 * Any other character matches itself. Unclosed `[` or `{` are treated literally.
 */
export function globToRegex(pattern: string): RegExp {
  const braceClose = matchBraces(pattern)
  const stack: number[] = [] // closing indexes of the braces we're currently inside
  let re = ''
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]
    const atSegmentStart = i === 0 || pattern[i - 1] === '/'

    if (c === '\\' && i + 1 < pattern.length) {
      re += escapeRegex(pattern[i + 1])
      i += 2
    } else if (c === '*') {
      let j = i
      while (pattern[j] === '*') j++
      const globstar = j - i >= 2 && atSegmentStart
      if (globstar && pattern[j] === '/') {
        // `**/` — zero or more leading directories
        re += '(?:.*/)?'
        i = j + 1
      } else if (globstar && j === pattern.length) {
        if (i > 0) {
          // `/**` at the end — the directory itself or anything below it
          re = re.slice(0, -1) + '(?:/.*)?'
        } else {
          re += '.*'
        }
        i = j
      } else {
        re += '[^/]*'
        i = j
      }
    } else if (c === '?') {
      re += '[^/]'
      i++
    } else if (c === '[') {
      const cls = parseClass(pattern, i)
      if (cls) {
        re += cls.source
        i = cls.end
      } else {
        re += '\\['
        i++
      }
    } else if (c === '{' && braceClose.has(i)) {
      stack.push(braceClose.get(i)!)
      re += '(?:'
      i++
    } else if (c === ',' && stack.length > 0) {
      re += '|'
      i++
    } else if (c === '}' && stack.length > 0 && stack[stack.length - 1] === i) {
      stack.pop()
      re += ')'
      i++
    } else {
      re += escapeRegex(c)
      i++
    }
  }

  return new RegExp('^' + re + '$')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Map each `{` index to its matching `}` index; unmatched braces are omitted. */
function matchBraces(pattern: string): Map<number, number> {
  const result = new Map<number, number>()
  const open: number[] = []
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') {
      i++
    } else if (c === '[') {
      const cls = parseClass(pattern, i)
      if (cls) i = cls.end - 1
    } else if (c === '{') {
      open.push(i)
    } else if (c === '}' && open.length > 0) {
      result.set(open.pop()!, i)
    }
  }
  return result
}

/** Parse a `[...]` class starting at `start`; returns null if it is never closed. */
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
      if (body === '') return null
      return { source: negate ? `[^/${body}]` : `(?![/])[${body}]`, end: i + 1 }
    }
    if (c === '\\' && i + 1 < pattern.length) {
      body += '\\' + pattern[i + 1]
      i += 2
    } else {
      // keep `-` as a range operator; escape everything else that is special inside a class
      body += c === '-' ? c : c.replace(/[\]\\^[]/g, '\\$&')
      i++
    }
    first = false
  }
  return null
}
