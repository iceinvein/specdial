/**
 * Match a whole, slash-separated path. `*` and `?` stay within a path
 * segment; `**` can cross directories. A globstar followed by a slash
 * matches zero or more directories. Other characters are literal,
 * including backslashes.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // Treat a run of two or more stars as one globstar.
        while (pattern[index + 1] === '*') index++

        if (pattern[index + 1] === '/') {
          source += '(?:[^/]+/)*'
          index++
        } else {
          source += '[\\s\\S]*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }

  // Unlike `$`, this end assertion does not allow a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
