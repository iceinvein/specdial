export function globToRegex(pattern: string): RegExp {
  let source = "";

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];

    if (character === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          i++;
          source += "(?:[\\s\\S]*/)?";
        } else {
          source += "[\\s\\S]*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }

  // Unlike $ alone, this end anchor cannot match before a final newline.
  return new RegExp(`^${source}$(?![\\s\\S])`);
}
