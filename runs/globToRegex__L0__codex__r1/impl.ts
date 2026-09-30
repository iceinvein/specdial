/**
 * Convert a slash-separated path glob into a whole-path regular expression.
 * `*` matches any characters within a segment, `?` matches one, and a segment
 * consisting of `**` matches across directories. Other characters are literal.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i]

    if (character === '*') {
      const start = i
      while (pattern[i + 1] === '*') i++

      const isGlobstar =
        i === start + 1 &&
        (start === 0 || pattern[start - 1] === '/') &&
        (i + 1 === pattern.length || pattern[i + 1] === '/')

      if (isGlobstar && pattern[i + 1] === '/') {
        // Include the separator so zero intervening directories also match.
        source += '(?:[^/]+/)*'
        i++
      } else {
        source += isGlobstar ? '[\\s\\S]*' : '[^/]*'
      }
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike $, this end assertion cannot match before a final newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
