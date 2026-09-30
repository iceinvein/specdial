/**
 * Converts a path glob into an anchored RegExp. See SPEC.md for the syntax:
 * `*` matches within one path segment, `?` matches one non-`/` character,
 * `**` matches anything (and absorbs a following `/`), everything else is literal.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          source += '(?:.*/)?'
          i += 3
        } else {
          source += '.*'
          i += 2
        }
        continue
      }
      source += '[^/]*'
    } else if (ch === '?') {
      source += '[^/]'
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    }
    i++
  }
  return new RegExp(`^${source}$`, 's')
}
