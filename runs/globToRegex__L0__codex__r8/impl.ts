/**
 * Convert a slash-separated path glob into a whole-path regular expression.
 * `*` and `?` match within a path segment; a segment consisting of `**`
 * matches across directories. Other characters are treated literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = '^'

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
        // Include the slash so that `**/` can also match zero directories.
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

  // Unlike `$` alone, this also rejects an unmatched final newline.
  return new RegExp(source + '$(?![\\s\\S])')
}
