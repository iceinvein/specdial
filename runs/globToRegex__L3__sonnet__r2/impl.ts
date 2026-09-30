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
          source += '(?:[^]*/)?'
        } else {
          source += '[^]*'
        }
      } else {
        i++
        source += '[^/]*'
      }
    } else if (c === '?') {
      i++
      source += '[^/]'
    } else {
      i++
      source += c.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
    }
  }
  return new RegExp('^' + source + '$')
}
