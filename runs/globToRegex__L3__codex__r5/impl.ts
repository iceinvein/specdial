export function globToRegex(pattern: string): RegExp {
  let source = "";

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];

    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index++;
        if (pattern[index + 1] === "/") {
          index++;
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
      source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  // `$` alone also matches before a final line break; require the actual end.
  return new RegExp(`^${source}$(?![\\s\\S])`);
}
