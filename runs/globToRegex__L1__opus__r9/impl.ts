/**
 * Converts a path glob into an anchored RegExp.
 *
 * - `**` matches any number of path segments (including none)
 * - `*` matches any characters except `/`
 * - `?` matches exactly one character except `/`
 * - all other characters match literally
 */
export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === "*" && pattern[i + 1] === "*") {
      const atSegmentStart = i === 0 || pattern[i - 1] === "/";
      const next = pattern[i + 2];
      if (atSegmentStart && next === "/") {
        // "**/" matches zero or more leading directories.
        source += "(?:.*/)?";
        i += 3;
      } else if (atSegmentStart && next === undefined && i > 0) {
        // Trailing "/**" matches the directory itself or anything below it.
        source = source.slice(0, -1) + "(?:/.*)?";
        i += 2;
      } else {
        source += ".*";
        i += 2;
      }
    } else if (char === "*") {
      source += "[^/]*";
      i += 1;
    } else if (char === "?") {
      source += "[^/]";
      i += 1;
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }

  return new RegExp(`^${source}$`);
}
