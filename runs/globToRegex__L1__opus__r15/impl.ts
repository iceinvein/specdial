/**
 * Convert a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `**` matches any number of path segments, including none (`a/**\/b` matches `a/b`)
 * - `*` matches any run of characters within a single segment (never `/`)
 * - `?` matches exactly one character other than `/`
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      const next = pattern[i + 2]
      if (atSegmentStart && next === '/') {
        // `**/` — zero or more leading directories
        source += '(?:.*/)?'
        i += 3
      } else if (atSegmentStart && next === undefined) {
        // trailing `**` — everything below this point
        source += '.*'
        i += 2
      } else {
        // `**` inside a segment behaves like `*`
        source += '[^/]*'
        i += 2
      }
    } else if (ch === '*') {
      source += '[^/]*'
      i++
    } else if (ch === '?') {
      source += '[^/]'
      i++
    } else {
      source += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i++
    }
  }
  return new RegExp(`^${source}$`)
}
