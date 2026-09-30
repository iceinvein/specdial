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
          source += '(?:[\\s\\S]*/)?'
        } else {
          source += '[\\s\\S]*'
        }
        continue
      }
      source += '[^/]*'
    } else if (c === '?') {
      source += '[^/]'
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
    }
    i++
  }
  return new RegExp('^' + source + '$')
}
