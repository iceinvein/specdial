/**
 * Convert a glob into a matcher for an entire, slash-separated path.
 * `*` and `?` stay within a path segment; a `**` segment matches any depth.
 * A backslash escapes the following character. Other characters are literal.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  const escape = (character: string): string =>
    character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '\\') {
      source += escape(pattern[++index] ?? '\\')
    } else if (character === '*') {
      const start = index
      while (pattern[index + 1] === '*') index++

      const isGlobstar =
        index - start === 1 &&
        (start === 0 || pattern[start - 1] === '/') &&
        (index + 1 === pattern.length || pattern[index + 1] === '/')

      if (isGlobstar && pattern[index + 1] === '/') {
        source += '(?:[^/]+/)*'
        index++
      } else {
        source += isGlobstar ? '[\\s\\S]*' : '[^/]*'
      }
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += escape(character)
    }
  }

  // Unlike $, this end assertion cannot match before a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
