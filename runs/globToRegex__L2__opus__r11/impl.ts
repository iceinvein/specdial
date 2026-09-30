export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*' && pattern[i + 1] === '*') {
      // `**` matches anything; a following `/` is consumed so `**/x` also matches `x`
      if (pattern[i + 2] === '/') {
        source += '(?:.*/)?'
        i += 3
      } else {
        source += '.*'
        i += 2
      }
    } else if (char === '*') {
      source += '[^/]*'
      i += 1
    } else if (char === '?') {
      source += '[^/]'
      i += 1
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp(`^${source}$`)
}
