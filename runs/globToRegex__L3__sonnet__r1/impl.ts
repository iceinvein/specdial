export function globToRegex(pattern: string): RegExp {
  let re = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          re += '(?:.*/)?'
          i += 3
        } else {
          re += '.*'
          i += 2
          // extra consecutive stars fold into the same `**`
          while (pattern[i] === '*') i++
        }
      } else {
        re += '[^/]*'
        i++
      }
    } else if (c === '?') {
      re += '[^/]'
      i++
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
      i++
    }
  }
  return new RegExp('^' + re + '$', 's')
}
