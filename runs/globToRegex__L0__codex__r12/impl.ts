/**
 * Match a whole path using `*` (within a directory), `?` (one non-slash
 * character), and `**` (across directories). A globstar followed by a slash
 * also matches no directories.
 * All other characters are literal; path separators are forward slashes.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]

    if (character === '*') {
      let end = index + 1
      while (pattern[end] === '*') end++

      if (end - index > 1) {
        if (pattern[end] === '/') {
          source += '(?:[^/]+/)*'
          end++
        } else {
          source += '[\\s\\S]*'
        }
      } else {
        source += '[^/]*'
      }

      index = end - 1
    } else if (character === '?') {
      source += '[^/]'
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // Unlike `$`, this end assertion cannot match before a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`)
}
