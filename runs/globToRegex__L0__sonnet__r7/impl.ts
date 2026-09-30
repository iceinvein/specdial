export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0
  let i = 0

  while (i < pattern.length) {
    const c = pattern[i]

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // Collapse runs of stars
        while (pattern[i + 1] === '*') i++
        if (pattern[i + 1] === '/') {
          // "**/" matches zero or more directories
          re += '(?:.*/)?'
          i++
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else if (c === '[') {
      const end = pattern.indexOf(']', i + 2)
      if (end === -1) {
        re += '\\['
      } else {
        let body = pattern.slice(i + 1, end)
        if (body[0] === '!') body = '^' + body.slice(1)
        re += '[' + body.replace(/\\/g, '\\\\') + ']'
        i = end
      }
    } else if (c === '{') {
      braceDepth++
      re += '(?:'
    } else if (c === '}' && braceDepth > 0) {
      braceDepth--
      re += ')'
    } else if (c === ',' && braceDepth > 0) {
      re += '|'
    } else if (c === '\\' && i + 1 < pattern.length) {
      i++
      re += pattern[i].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    i++
  }

  // Unclosed braces: close them so the regex stays valid
  re += ')'.repeat(braceDepth)

  return new RegExp('^' + re + '$')
}
