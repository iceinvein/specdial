export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          source += '(?:[\\s\\S]*/)?'
          i += 3
        } else {
          source += '[\\s\\S]*'
          i += 2
        }
      } else {
        source += '[^/]*'
        i += 1
      }
    } else if (c === '?') {
      source += '[^/]'
      i += 1
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp('^' + source + '$')
}
