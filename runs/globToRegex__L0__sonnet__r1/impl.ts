export function globToRegex(pattern: string): RegExp {
  let re = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**/` matches zero or more directories; a bare `**` matches anything
        if (pattern[i + 2] === '/') {
          re += '(?:.*/)?'
          i += 3
        } else {
          re += '.*'
          i += 2
        }
      } else {
        re += '[^/]*'
        i++
      }
    } else if (c === '?') {
      re += '[^/]'
      i++
    } else if (c === '[') {
      const end = pattern.indexOf(']', i + 2)
      if (end === -1) {
        re += '\\['
        i++
      } else {
        let body = pattern.slice(i + 1, end)
        if (body[0] === '!') body = '^' + body.slice(1)
        re += '[' + body.replace(/\\/g, '\\\\') + ']'
        i = end + 1
      }
    } else if (c === '{') {
      const end = pattern.indexOf('}', i)
      if (end === -1) {
        re += '\\{'
        i++
      } else {
        const alts = pattern
          .slice(i + 1, end)
          .split(',')
          .map((a) => a.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
        re += '(?:' + alts.join('|') + ')'
        i = end + 1
      }
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      i++
    }
  }
  return new RegExp('^' + re + '$')
}
