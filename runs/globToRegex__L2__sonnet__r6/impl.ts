export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
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
    } else if (c === '?') {
      source += '[^/]'
      i++
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
      i++
    }
  }
  return new RegExp('^' + source + '$')
}
