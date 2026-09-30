/**
 * Match a complete, slash-separated path using a glob.
 * `*` and `?` stay within a path segment; `**` can cross separators.
 * Also supports character classes, brace alternatives, and backslash escapes.
 */
export function globToRegex(pattern: string): RegExp {
  const escape = (value: string): string =>
    value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

  let index = 0

  const compile = (inBrace = false): string => {
    let source = ''

    while (index < pattern.length) {
      const char = pattern[index]
      if (inBrace && (char === ',' || char === '}')) break
      index++

      if (char === '\\') {
        source += escape(index < pattern.length ? pattern[index++] : '\\')
      } else if (char === '*') {
        const start = index - 1
        while (pattern[index] === '*') index++
        if (index - start > 1) {
          // A complete globstar directory may also consume no directories.
          if ((start === 0 || pattern[start - 1] === '/') && pattern[index] === '/') {
            source += '(?:[\\s\\S]*/)?'
            index++
          } else {
            source += '[\\s\\S]*'
          }
        } else {
          source += '[^/]*'
        }
      } else if (char === '?') {
        source += '[^/]'
      } else if (char === '[') {
        const start = index
        let negated = false
        if (pattern[index] === '!' || pattern[index] === '^') {
          negated = true
          index++
        }
        let members = ''
        // A closing bracket can be a member when it appears first.
        if (pattern[index] === ']') {
          members += '\\]'
          index++
        }
        while (index < pattern.length && pattern[index] !== ']') {
          const member = pattern[index++]
          if (member === '\\' && index < pattern.length) {
            const literal = pattern[index++]
            members += /[\\\]\[\^-]/.test(literal) ? '\\' + literal : literal
          } else {
            members += member === '[' || member === '^' || member === '\\'
              ? '\\' + member
              : member
          }
        }
        if (pattern[index] === ']' && members) {
          const characterClass = `[${negated ? '^' : ''}${members}]`
          // Invalid ranges are treated literally, rather than throwing.
          try {
            new RegExp(characterClass)
            source += `(?!/)${characterClass}`
            index++
          } catch {
            source += '\\['
            index = start
          }
        } else {
          source += '\\['
          index = start
        }
      } else if (char === '{') {
        const start = index
        const alternatives = [compile(true)]
        while (pattern[index] === ',') {
          index++
          alternatives.push(compile(true))
        }
        if (pattern[index] === '}' && alternatives.length > 1) {
          source += `(?:${alternatives.join('|')})`
          index++
        } else {
          source += '\\{'
          index = start
        }
      } else {
        source += escape(char)
      }
    }

    return source
  }

  // Unlike $, this end assertion does not allow an unmatched final newline.
  return new RegExp(`^${compile()}(?![\\s\\S])`)
}
