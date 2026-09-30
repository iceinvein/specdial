/**
 * Convert a path glob into an anchored RegExp.
 *
 * - `**` followed by `/` matches zero or more whole directories
 * - `**` elsewhere matches any characters, including `/`
 * - `*` matches any characters except `/`
 * - `?` matches exactly one character except `/`
 * - everything else matches literally
 */
export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        source += "(?:.*/)?";
        i += 3;
      } else {
        source += ".*";
        i += 2;
      }
    } else if (ch === "*") {
      source += "[^/]*";
      i++;
    } else if (ch === "?") {
      source += "[^/]";
      i++;
    } else {
      source += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i++;
    }
  }
  return new RegExp(`^${source}$`);
}
