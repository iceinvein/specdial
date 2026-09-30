/**
 * Match a whole path using `/` as the separator. `*` and `?` match within
 * a segment; a segment consisting of `**` matches across directories.
 * All other characters are literal, including regular expression syntax.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      const start = index
      while (pattern[index + 1] === '*') index++

      const isGlobstar =
        index > start &&
        (start === 0 || pattern[start - 1] === '/') &&
        (index + 1 === pattern.length || pattern[index + 1] === '/')

      if (isGlobstar && pattern[index + 1] === '/') {
        // Include the separator so that `**/` can match zero directories.
        source += '(?:[^/]+/)*'
        index++
      } else {
        source += isGlobstar ? '[\\s\\S]*' : '[^/]*'
      }
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike `$`, this end assertion cannot match before a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
