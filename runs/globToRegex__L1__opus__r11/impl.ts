// Converts a path glob into an anchored RegExp.
//   **   matches any number of path segments (including none)
//   *    matches any characters except '/'
//   ?    matches a single character except '/'
// Everything else is matched literally.
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*' && pattern[i + 1] === '*') {
      const atSegmentStart = i === 0 || pattern[i - 1] === '/'
      if (atSegmentStart && pattern[i + 2] === '/') {
        // "**/" also matches zero directories, so "**/a" matches "a"
        source += '(?:.*/)?'
        i += 3
      } else if (atSegmentStart && i + 2 === pattern.length && i > 0) {
        // trailing "/**" matches the directory itself and everything under it
        source = source.slice(0, -1) + '(?:/.*)?'
        i += 2
      } else {
        source += '.*'
        i += 2
      }
    } else if (char === '*') {
      source += '[^/]*'
      i++
    } else if (char === '?') {
      source += '[^/]'
      i++
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i++
    }
  }
  return new RegExp(`^${source}$`)
}
