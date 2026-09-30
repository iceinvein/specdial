/** Convert a slash-separated path glob into a whole-path regular expression. */
export function globToRegex(pattern: string): RegExp {
  const escape = (value: string): string => value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

  // Expand braces first so globstars see the actual path-segment boundaries.
  function expand(value: string): string[] {
    const braces: { start: number; commas: number[] }[] = []
    for (let i = 0; i < value.length; i++) {
      const char = value[i]
      if (char === '\\') {
        i++
      } else if (char === '[') {
        let end = i + 1
        if (value[end] === '!' || value[end] === '^') end++
        if (value[end] === ']') end++
        for (; end < value.length && value[end] !== ']'; end++) {
          if (value[end] === '\\') end++
        }
        if (end < value.length) i = end
      } else if (char === '{') {
        braces.push({ start: i, commas: [] })
      } else if (char === ',') {
        braces[braces.length - 1]?.commas.push(i)
      } else if (char === '}') {
        const brace = braces.pop()
        if (brace && brace.commas.length > 0) {
          const boundaries = [brace.start, ...brace.commas, i]
          return boundaries.slice(1).flatMap((end, part) => expand(
            value.slice(0, brace.start)
            + value.slice(boundaries[part]! + 1, end)
            + value.slice(i + 1),
          ))
        }
      }
    }
    return [value]
  }

  function compile(pattern: string): string {
    let index = 0

    function characterClass(): string {
      const start = index++
      let source = ''

      if (pattern[index] === '!' || pattern[index] === '^') {
        source = '^'
        index++
      }
      // A closing bracket in the first position is a literal class member.
      if (pattern[index] === ']') {
        source += '\\]'
        index++
      }

      const contentStart = index
      while (index < pattern.length && pattern[index] !== ']') {
        const char = pattern[index++]!
        if (char === '\\' && index < pattern.length) {
          const literal = pattern[index++]!
          source += literal === '-' ? '\\-' : escape(literal)
        } else {
          source += char === '[' || char === '^' || char === '\\' ? `\\${char}` : char
        }
      }

      if (index < pattern.length && (index > contentStart || source.endsWith('\\]'))) {
        index++
        try {
          new RegExp(`[${source}]`)
          // Even a negated class must not consume a path separator.
          return `(?!/)[${source}]`
        } catch {
          // Malformed classes are interpreted literally instead of throwing.
        }
      }
      index = start + 1
      return '\\['
    }

    let source = ''
    while (index < pattern.length) {
      const char = pattern[index]!
      index++

      if (char === '\\') {
        source += escape(index < pattern.length ? pattern[index++]! : '\\')
      } else if (char === '?') {
        source += '[^/]'
      } else if (char === '*') {
        const start = index - 1
        while (pattern[index] === '*') index++
        const segmentStart = start === 0 || pattern[start - 1] === '/'
        const segmentEnd = index === pattern.length || pattern[index] === '/'
        if (index - start >= 2 && segmentStart && segmentEnd) {
          if (pattern[index] === '/') {
            // Include the slash so that **/ can also match zero directories.
            source += '(?:[^/]+/)*'
            index++
          } else {
            source += '[\\s\\S]*'
          }
        } else {
          source += '[^/]*'
        }
      } else if (char === '[') {
        index--
        source += characterClass()
      } else {
        source += escape(char)
      }
    }
    return source
  }

  // Unlike $, this end assertion cannot stop before a trailing newline.
  return new RegExp(`^(?:${expand(pattern).map(compile).join('|')})(?![\\s\\S])`)
}
