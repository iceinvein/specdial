export function globToRegex(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // Consume the entire run so additional stars do not add wildcards.
        while (pattern[index + 1] === '*') index++

        if (pattern[index + 1] === '/') {
          // A globstar directory can also match no directories at all.
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
      // Glob literals must not acquire special meaning in the regular expression.
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike $, this assertion does not allow an unmatched trailing newline.
  return new RegExp(source + '(?![\\s\\S])')
}
