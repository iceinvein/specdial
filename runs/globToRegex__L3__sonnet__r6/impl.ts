export function globToRegex(pattern: string): RegExp {
  let out = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i += 2
        if (pattern[i] === '/') {
          i++
          out += '(?:.*/)?'
        } else {
          out += '.*'
        }
      } else {
        i++
        out += '[^/]*'
      }
    } else if (c === '?') {
      i++
      out += '[^/]'
    } else {
      i++
      out += c.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
    }
  }
  return new RegExp('^' + out + '$', 's')
}
