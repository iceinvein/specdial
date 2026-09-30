export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*' && pattern[i + 1] === '*') {
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      if (atSegmentStart && pattern[i + 2] === '/') {
        // `**/` matches zero or more whole directories.
        source += '(?:[^/]*/)*'
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
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp(`^${source}$`)
}
