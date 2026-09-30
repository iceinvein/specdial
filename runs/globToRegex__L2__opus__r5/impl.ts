export function globToRegex(pattern: string): RegExp {
  let source = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      i += 2;
      if (pattern[i] === "/") {
        // "**/" matches zero or more whole directory segments
        source += "(?:[\\s\\S]*/)?";
        i++;
      } else {
        source += "[\\s\\S]*";
      }
    } else if (ch === "*") {
      source += "[^/]*";
      i++;
    } else if (ch === "?") {
      source += "[^/]";
      i++;
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
      i++;
    }
  }
  return new RegExp(`^${source}$`);
}
