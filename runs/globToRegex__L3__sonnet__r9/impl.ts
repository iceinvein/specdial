export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // Collapse runs of stars; a trailing "/" is consumed with the "**".
        while (pattern[i] === '*') i++
        if (pattern[i] === '/') {
          i++
          source += '(?:[\\s\\S]*/)?'
        } else {
          source += '[\\s\\S]*'
        }
      } else {
        source += '[^/]*'
        i++
      }
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
