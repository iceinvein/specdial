const REGEX_SPECIAL = /[.+^$()|\\\[\]{}]/;

/**
 * Convert a path glob into an anchored RegExp.
 *
 * Supported syntax:
 * - `*`     any run of characters except `/`
 * - `?`     exactly one character except `/`
 * - `**`    any run of characters, including `/`; `**\/` also matches zero directories
 * - `[abc]` / `[a-z]` / `[!abc]` character classes (never match `/`)
 * - `{a,b}` alternation (may be nested)
 */
export function globToRegex(pattern: string): RegExp {
  let out = "";
  let braceDepth = 0;

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];

    if (c === "*") {
      if (pattern[i + 1] === "*") {
        const atSegmentStart = i === 0 || pattern[i - 1] === "/";
        if (atSegmentStart && pattern[i + 2] === "/") {
          // `**/` matches zero or more whole directories.
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "[") {
      const close = pattern.indexOf("]", i + 2);
      if (close === -1) {
        out += "\\[";
        continue;
      }
      let body = pattern.slice(i + 1, close);
      let negate = false;
      if (body[0] === "!" || body[0] === "^") {
        negate = true;
        body = body.slice(1);
      }
      body = body.replace(/[\\\]^]/g, "\\$&");
      out += negate ? `[^/${body}]` : `(?!/)[${body}]`;
      i = close;
    } else if (c === "{") {
      braceDepth++;
      out += "(?:";
    } else if (c === "}" && braceDepth > 0) {
      braceDepth--;
      out += ")";
    } else if (c === "," && braceDepth > 0) {
      out += "|";
    } else if (c === "\\" && i + 1 < pattern.length) {
      i++;
      out += escapeChar(pattern[i]);
    } else {
      out += escapeChar(c);
    }
  }

  // Close any unbalanced braces so the regex remains valid.
  out += ")".repeat(braceDepth);

  return new RegExp(`^${out}$`);
}

function escapeChar(c: string): string {
  return REGEX_SPECIAL.test(c) || c === "*" || c === "?" ? `\\${c}` : c;
}
