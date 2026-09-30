/**
 * Convert a path glob into an anchored RegExp.
 *
 * Supported syntax:
 *   `**`  matches any number of path segments (including none) when used as a
 *         whole segment (a leading `**` followed by a slash also matches root files)
 *   `*`   matches any characters except `/`
 *   `?`   matches exactly one character except `/`
 * Every other character matches itself literally.
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
        // `**/` matches zero or more leading directories.
        source += "(?:.*/)?";
        i += 3;
        continue;
      }
      if (atSegmentStart && next === undefined) {
        // Trailing `**` matches everything below this point.
        source += ".*";
        i += 2;
        continue;
      }
      // `**` inside a segment behaves like a single `*`.
      source += "[^/]*";
      i += 2;
      continue;
    }

    if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    i++;
  }

  return new RegExp(`^${source}$`);
}
