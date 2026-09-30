/**
 * Converts a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `**` matches any number of path segments (including none), e.g. `**\/x` matches `x`
 * - `*` matches any characters except `/`
 * - `?` matches exactly one character except `/`
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      if (atSegmentStart && pattern[i + 2] === '/') {
        // "**/" matches zero or more leading directories
        source += '(?:.*/)?'
        i += 3
      } else if (atSegmentStart && i + 2 === pattern.length && i > 0) {
        // trailing "/**" matches the directory itself or anything beneath it
        source = source.slice(0, -1) + '(?:/.*)?'
        i += 2
      } else {
        source += '.*'
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
