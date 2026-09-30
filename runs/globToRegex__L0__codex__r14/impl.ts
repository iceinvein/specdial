/**
 * Converts a slash-separated path glob into a whole-path matcher.
 * `*` and `?` stay within a path segment; `**` can cross separators.
 * A whole-segment globstar followed by a slash matches zero or more directories.
 * All other characters, including regex metacharacters, are literal.
 */
export function globToRegex(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      const start = index
      while (pattern[index + 1] === '*') index++

      if (index > start) {
        if (
          (start === 0 || pattern[start - 1] === '/') &&
          pattern[index + 1] === '/'
        ) {
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
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike `$`, this end assertion cannot match before a final newline.
  return new RegExp(source + '(?![\\s\\S])')
}
