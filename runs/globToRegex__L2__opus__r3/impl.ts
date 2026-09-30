export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      i += 2
      if (pattern[i] === '/') {
        // `**/` matches zero or more whole leading segments
        source += '(?:.*/)?'
        i++
      } else {
        source += '.*'
      }
    } else if (ch === '*') {
      source += '[^/]*'
      i++
    } else if (ch === '?') {
      source += '[^/]'
      i++
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
      i++
    }
  }
  return new RegExp(`^${source}$`)
}
