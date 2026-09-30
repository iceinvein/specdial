// Converts a path glob to an anchored RegExp.
//   **/  zero or more directories
//   /**  (at end) everything below a directory
//   **   anything, including "/"
//   *    anything except "/"
//   ?    one character except "/"
// Every other character matches itself literally.
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        source += '(?:.*/)?'
        i += 3
      } else {
        source += '.*'
        i += 2
      }
    } else if (ch === '/' && pattern.startsWith('**', i + 1) && i + 3 === pattern.length) {
      source += '(?:/.*)?'
      i += 3
    } else if (ch === '*') {
      source += '[^/]*'
      i += 1
    } else if (ch === '?') {
      source += '[^/]'
      i += 1
    } else {
      source += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp(`^${source}$`)
}
