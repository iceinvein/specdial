/**
 * Converts a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`     any run of characters except `/`
 * - `?`     exactly one character except `/`
 * - `**`    any number of path segments (`a/**\/b` also matches `a/b`)
 * - `[abc]` character class (`[!abc]` / `[^abc]` negates); never matches `/`
 * - `{a,b}` alternation (may nest)
 */
export function globToRegex(pattern: string): RegExp {
  let re = ''
  let braceDepth = 0

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        const atSegmentStart = i === 0 || pattern[i - 1] === '/'
        const next = pattern[i + 2]
        if (atSegmentStart && next === '/') {
          // `**/` matches zero or more whole directories.
          re += '(?:[^/]*/)*'
          i += 2
        } else if (atSegmentStart && next === undefined) {
          re += '.*'
          i += 1
        } else {
          // `**` not forming its own segment behaves like `*`.
          re += '[^/]*'
          i += 1
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else if (c === '[') {
      const end = pattern.indexOf(']', i + 2)
      if (end === -1) {
        re += '\\['
        continue
      }
      let body = pattern.slice(i + 1, end)
      let negate = false
      if (body[0] === '!' || body[0] === '^') {
        negate = true
        body = body.slice(1)
      }
      body = body.replace(/[\\\]^]/g, '\\$&')
      re += negate ? `[^/${body}]` : `(?!/)[${body}]`
      i = end
    } else if (c === '{') {
      braceDepth++
      re += '(?:'
    } else if (c === '}' && braceDepth > 0) {
      braceDepth--
      re += ')'
    } else if (c === ',' && braceDepth > 0) {
      re += '|'
    } else if (c === '\\' && i + 1 < pattern.length) {
      re += escape(pattern[++i])
    } else {
      re += escape(c)
    }
  }

  // Close any unterminated `{` groups so the RegExp stays valid.
  re += ')'.repeat(braceDepth)

  return new RegExp(`^${re}$`)
}

function escape(c: string): string {
  return /[.*+?^${}()|[\]\\/]/.test(c) ? `\\${c}` : c
}
