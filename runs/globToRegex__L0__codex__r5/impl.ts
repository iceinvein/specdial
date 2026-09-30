/**
 * Convert a slash-separated path glob to a full-path matcher.
 * `*` and `?` match within a path segment; an entire `**` segment can span
 * directories. All other characters are treated literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      let end = index + 1
      while (pattern[end] === '*') end++

      const isGlobstar =
        end - index === 2 &&
        (index === 0 || pattern[index - 1] === '/') &&
        (end === pattern.length || pattern[end] === '/')

      if (isGlobstar && pattern[end] === '/') {
        // Include the slash so zero intervening directories can also match.
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

  // Unlike `$`, this assertion cannot match before a final newline.
  return new RegExp(source + '(?![\\s\\S])')
}
