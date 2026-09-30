/**
 * Match a whole, slash-separated path using *, **, and ? wildcards.
 * Other characters are literal. A globstar followed by a slash also matches
 * zero directories.
 */
export function globToRegex(pattern: string): RegExp {
  let source = '^'

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i]

    if (character === '*') {
      let end = i + 1
      while (pattern[end] === '*') end++

      if (end - i === 1) {
        source += '[^/]*'
      } else if (pattern[end] === '/') {
        source += '(?:[^/]+/)*'
        end++
      } else {
        source += '[\\s\\S]*'
      }

      i = end - 1
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike $, this also rejects a trailing newline after a literal path.
  return new RegExp(source + '(?![\\s\\S])')
}
