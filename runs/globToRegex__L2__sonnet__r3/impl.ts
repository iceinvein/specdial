export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          source += '(?:.*/)?'
          i += 3
        } else {
          source += '.*'
          i += 2
        }
      } else {
        source += '[^/]*'
        i++
      }
    } else if (c === '?') {
      source += '[^/]'
      i++
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
      i++
    }
  }
  return new RegExp(`^${source}$`, 's')
}
