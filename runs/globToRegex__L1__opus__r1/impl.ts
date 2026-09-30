/**
 * Converts a path glob into an anchored RegExp.
 *
 * - `*` matches any run of characters except `/`
 * - `?` matches exactly one character except `/`
 * - `**` matches across directories; `**\/` may also match zero directories
 * - `[abc]` / `[!abc]` match a character class (never `/`)
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let re = "";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        const atSegmentStart = i === 0 || pattern[i - 1] === "/";
        if (atSegmentStart && pattern[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 3;
        } else if (atSegmentStart && i + 2 === pattern.length && i > 0) {
          // Trailing "/**": match the directory itself or anything below it.
          re = re.slice(0, -1) + "(?:/.*)?";
          i += 2;
        } else {
          re += ".*";
          i += 2;
        }
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      re += "[^/]";
      i += 1;
    } else if (c === "[") {
      const end = pattern.indexOf("]", i + 2);
      if (end === -1) {
        re += "\\[";
        i += 1;
        continue;
      }
      let body = pattern.slice(i + 1, end);
      const negate = body[0] === "!" || body[0] === "^";
      if (negate) body = body.slice(1);
      body = body.replace(/[\\\]^]/g, "\\$&");
      re += negate ? `[^/${body}]` : `(?!/)[${body}]`;
      i = end + 1;
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}
