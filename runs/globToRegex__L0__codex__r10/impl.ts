/**
 * Match a complete, slash-separated path. `*` and `?` match within a path
 * segment; `**` as a complete segment matches across directories. All other
 * characters are literal, including regular-expression metacharacters.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      let end = index + 1
      while (pattern[end] === '*') end++

      const isGlobstar =
        end - index >= 2 &&
        (index === 0 || pattern[index - 1] === '/') &&
        (end === pattern.length || pattern[end] === '/')

      if (isGlobstar && pattern[end] === '/') {
        // Include the separator so zero directories is also a match.
        source += '(?:[^/]+/)*'
        index = end
      } else {
        source += isGlobstar ? '[\\s\\S]*' : '[^/]*'
        index = end - 1
      }
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike `$` alone, this end assertion also rejects a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
