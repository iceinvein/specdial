export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        // `**/` also matches zero directories, so the slash is optional with it.
        source += "(?:[\\s\\S]*/)?";
        i += 3;
      } else {
        source += "[\\s\\S]*";
        i += 2;
      }
    } else if (ch === "*") {
      source += "[^/]*";
      i += 1;
    } else if (ch === "?") {
      source += "[^/]";
      i += 1;
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}
