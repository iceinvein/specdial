export function globToRegex(pattern: string): RegExp {
  let source = ''

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        i++
        if (pattern[i + 1] === '/') {
          // A globstar directory prefix can match zero or more directories.
          source += '(?:[^/]+/)*'
          i++
        } else {
          source += '[\\s\\S]*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else {
      source += char.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    }
  }

  // The final assertion also rejects a trailing newline after the match.
  return new RegExp(`^${source}$(?![\\s\\S])`)
}
