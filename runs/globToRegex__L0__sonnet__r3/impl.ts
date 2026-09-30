export function globToRegex(pattern: string): RegExp {
  let re = ''
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i += 2
        if (pattern[i] === '/') {
          // "**/" matches zero or more directories
          i++
          re += '(?:.*/)?'
        } else {
          re += '.*'
        }
        continue
      }
      re += '[^/]*'
    } else if (c === '?') {
      re += '[^/]'
    } else if (c === '{') {
      const end = pattern.indexOf('}', i)
      if (end === -1) {
        re += '\\{'
      } else {
        const alts = pattern.slice(i + 1, end).split(',')
        re += '(?:' + alts.map(a => a.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|') + ')'
        i = end
      }
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    i++
  }
  return new RegExp('^' + re + '$')
}
