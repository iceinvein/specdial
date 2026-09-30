/**
 * Converts a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`  matches any run of characters except `/`
 * - `?`  matches exactly one character except `/`
 * - `**` matches across directory boundaries; `**\/` also matches zero directories
 *
 * All other characters (including `[`, `{`) are matched literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          // `**/` matches zero or more leading directories
          source += '(?:.*/)?'
          i += 3
        } else {
          source += '.*'
          i += 2
        }
      } else {
        source += '[^/]*'
        i += 1
      }
    } else if (char === '?') {
      source += '[^/]'
      i += 1
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp(`^${source}$`)
}
