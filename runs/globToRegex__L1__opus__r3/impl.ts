/**
 * Converts a path glob into an anchored RegExp.
 *
 * - `*` matches any run of characters except `/`
 * - `?` matches exactly one character except `/`
 * - `**` matches across directories; `**\/` also matches zero directories,
 *   so `**\/package.json` matches a root-level `package.json`
 * - All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
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
