export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i += 2
        if (pattern[i] === '/') {
          i++
          source += '(?:.*/)?'
        } else {
          source += '.*'
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
  return new RegExp('^' + source + '$', 's')
}
