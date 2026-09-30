/**
 * Converts a path glob into a RegExp anchored at both ends. See SPEC.md.
 *
 * `*` matches any run of non-`/` characters, `?` matches one non-`/`
 * character, and `**` matches anything (a following `/` is absorbed, so
 * `**\/x` also matches `x`). Everything else is literal.
 */
export function globToRegex(pattern: string): RegExp {
  const chars = Array.from(pattern);
  let source = "";
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === "*") {
      if (chars[i + 1] === "*") {
        if (chars[i + 2] === "/") {
          source += "(?:[^]*/)?";
          i += 3;
        } else {
          source += "[^]*";
          i += 2;
        }
      } else {
        source += "[^/]*";
        i += 1;
      }
    } else if (ch === "?") {
      source += "[^/]";
      i += 1;
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${source}$`, "u");
}
