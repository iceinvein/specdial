export function globToRegex(pattern: string): RegExp {
  let source = "";

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];

    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index++;
        if (pattern[index + 1] === "/") {
          source += "(?:[\\s\\S]*/)?";
          index++;
        } else {
          source += "[\\s\\S]*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  // JavaScript's $ can also match before a final newline; require the true end.
  return new RegExp(`^${source}$(?![\\s\\S])`);
}
