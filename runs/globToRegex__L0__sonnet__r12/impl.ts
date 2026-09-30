export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    switch (c) {
      case '*':
        if (pattern[i + 1] === '*') {
          i++
          if (pattern[i + 1] === '/') {
            i++
            re += '(?:.*/)?'
          } else {
            re += '.*'
          }
        } else {
          re += '[^/]*'
        }
        break
      case '?':
        re += '[^/]'
        break
      case '[': {
        const end = pattern.indexOf(']', i + 2)
        if (end === -1) {
          re += '\\['
        } else {
          let body = pattern.slice(i + 1, end)
          if (body[0] === '!') body = '^' + body.slice(1)
          re += '[' + body.replace(/\\/g, '\\\\') + ']'
          i = end
        }
        break
      }
      case '{':
        braceDepth++
        re += '(?:'
        break
      case '}':
        if (braceDepth > 0) {
          braceDepth--
          re += ')'
        } else {
          re += '\\}'
        }
        break
      case ',':
        re += braceDepth > 0 ? '|' : ','
        break
      case '\\':
        if (i + 1 < pattern.length) {
          i++
          re += pattern[i].replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
        } else {
          re += '\\\\'
        }
        break
      default:
        re += c.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
    }
  }

  if (braceDepth > 0) {
    // Unclosed brace: fall back to treating braces literally.
    return globToRegex(pattern.replace(/\{/g, '\\{'))
  }

  return new RegExp('^' + re + '$')
}
