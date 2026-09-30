/**
 * Converts a path glob into an anchored RegExp.
 *
 * - `*` matches any run of characters except `/`
 * - `?` matches exactly one character except `/`
 * - `**` matches across directories; `**` followed by `/` also matches zero directories
 *
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        i++
        if (pattern[i + 1] === '/') {
          i++
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else {
      source += char.replace(/[.+^${}()|[\]\\/]/g, '\\$&')
    }
  }
  return new RegExp(`^${source}$`)
}
