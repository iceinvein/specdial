const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|/]/g;

export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          // `**/` also matches nothing, so `**/x` matches `x` at the root.
          source += "(?:.*/)?";
          i += 3;
        } else {
          source += ".*";
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
      source += ch.replace(REGEX_SPECIAL, "\\$&");
      i += 1;
    }
  }
  // `u` so that `?` matches one code point rather than half a surrogate pair.
  return new RegExp(`^${source}$`, "u");
}
