// Match a complete, slash-separated path. `*` and `?` stay within a path
// segment; `**` crosses segments, and `**/` also matches zero directories.
// All other characters are literal (including regular expression syntax).
export function globToRegex(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        const startsSegment = index === 0 || pattern[index - 1] === '/'
        while (pattern[index + 1] === '*') index++

        if (startsSegment && pattern[index + 1] === '/') {
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

  // Unlike `$`, this end assertion cannot match before a trailing newline.
  return new RegExp(source + '(?![\\s\\S])')
}
