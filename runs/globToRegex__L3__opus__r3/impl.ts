/**
 * Converts a path glob into a RegExp anchored at both ends. See SPEC.md.
 *
 * `*` matches any run without `/`, `?` matches one non-`/` character, and `**`
 * matches anything (a `/` right after `**` is consumed by it, so `**` + `/` can
 * also match nothing). Every other character is literal.
 */
export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          source += "(?:[\\s\\S]*/)?";
          i += 3;
        } else {
          source += "[\\s\\S]*";
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
      source += ch.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}
