/**
 * Converts a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`     any run of characters except `/`
 * - `?`     exactly one character except `/`
 * - `**`    any run of characters, including `/` (as a whole segment:
 *           `**\/` also matches zero directories, `/**` at the end matches
 *           the directory itself and everything under it)
 * - `[abc]` / `[!abc]`  character class (never matches `/`)
 * - `{a,b}` alternation (may nest)
 *
 * All other characters match literally.
 */
export function globToRegex(pattern: string): RegExp {
  let re = "";
  let braceDepth = 0;
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];

    if (c === "*") {
      if (pattern[i + 1] === "*") {
        const atSegmentStart = i === 0 || pattern[i - 1] === "/";
        const next = pattern[i + 2];
        if (atSegmentStart && next === "/") {
          // `**/` matches zero or more directories.
          re += "(?:.*/)?";
          i += 3;
          continue;
        }
        if (atSegmentStart && next === undefined && i > 0) {
          // Trailing `/**` matches the directory and anything beneath it.
          re = re.slice(0, -2) + "(?:/.*)?"; // drop the escaped "\/"
          i += 2;
          continue;
        }
        re += ".*";
        i += 2;
        continue;
      }
      re += "[^/]*";
      i++;
      continue;
    }

    if (c === "?") {
      re += "[^/]";
      i++;
      continue;
    }

    if (c === "[") {
      const end = pattern.indexOf("]", i + 2);
      if (end !== -1) {
        let body = pattern.slice(i + 1, end);
        let negate = false;
        if (body[0] === "!" || body[0] === "^") {
          negate = true;
          body = body.slice(1);
        }
        body = body.replace(/[\\\]^]/g, "\\$&");
        re += negate ? `[^/${body}]` : `(?!/)[${body}]`;
        i = end + 1;
        continue;
      }
    }

    if (c === "{") {
      braceDepth++;
      re += "(?:";
      i++;
      continue;
    }
    if (c === "}" && braceDepth > 0) {
      braceDepth--;
      re += ")";
      i++;
      continue;
    }
    if (c === "," && braceDepth > 0) {
      re += "|";
      i++;
      continue;
    }

    re += c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    i++;
  }

  // Close any unbalanced braces so the RegExp stays valid.
  re += ")".repeat(braceDepth);

  return new RegExp(`^${re}$`);
}
