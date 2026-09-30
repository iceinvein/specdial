export function globToRegex(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      i++;
      if (pattern[i + 1] === "/") {
        // `**/` also matches nothing, so `**/x` matches a root-level `x`.
        i++;
        source += "(?:[\\s\\S]*/)?";
      } else {
        source += "[\\s\\S]*";
      }
    } else if (ch === "*") {
      source += "[^/]*";
    } else if (ch === "?") {
      source += "[^/]";
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}
