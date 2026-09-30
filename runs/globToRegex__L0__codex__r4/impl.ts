/**
 * Convert a slash-separated path glob into a case-sensitive, whole-path regex.
 * `*` matches within a path segment, `?` matches one non-slash character, and
 * a complete `**` segment matches across directories. Other characters are
 * literal, including regex metacharacters and backslashes.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i]

    if (character === '*') {
      const start = i
      while (pattern[i + 1] === '*') i++

      const isGlobstar =
        i - start === 1 &&
        (start === 0 || pattern[start - 1] === '/') &&
        (i + 1 === pattern.length || pattern[i + 1] === '/')

      if (isGlobstar && pattern[i + 1] === '/') {
        // Include the slash so a globstar can match zero directories.
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

  // Unlike `$` alone, this also rejects an unmatched final newline.
  return new RegExp(`^${source}$(?![\\s\\S])`)
}
